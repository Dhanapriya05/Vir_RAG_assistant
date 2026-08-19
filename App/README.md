# 📄 Vir Campus RAG & SQL Assistant (`App/`)

The `App/` module is the core intelligence engine for the **Vir Assistant**. It combines **Document Semantic Retrieval (Qdrant Vector RAG)** and **Relational Tabular Analytics (Modular SQLite DB + `schema_master`)** into a unified conversational API.

---

## 🌟 Key Capabilities

1. **4-Layer Query Intent Router (`services/router.py`)**:
   - **`COMPUTE Force Patterns`**: Unambiguous student registrations (12 digits), person lookups (`who is <Name>`), mark sheets, and attendance queries bypass vector search and route directly to SQLite SQL.
   - **`HYBRID Patterns`**: Two-part queries requesting both computation and descriptive context.
   - **`LOOKUP Check`**: Routes concept questions, academic regulations, grading criteria, and policy explanations to Qdrant vector retrieval.
   - **`LLM Fallback`**: Classifies remaining ambiguous questions.

2. **Schema Master-Driven SQL Engine (`services/sql_engine.py`)**:
   - Stores full column definitions, PK/FK constraints, and sample enum values in a persistent `schema_master` table.
   - Dynamically loads schema context for the LLM at query time, ensuring exact column and table matching.
   - **Zero-LLM Fast-Path**: Instant regex matching for standard student lookups (< 5ms response time, 0 LLM tokens).

3. **Consolidated SQLite Database (`App/data/app.db`)**:
   - Built by `ingest_sqlite.py` from 13+ Excel spreadsheets.
   - 6 normalized tables (`students`, `faculty`, `courses`, `student_assessments`, `attendance`, `academic_regulations`) and 3 performance views.

4. **Semantic Vector RAG (`services/retriever.py` & `services/vectordb.py`)**:
   - Powered by **Jina AI Embeddings v3** (1024-d) and **Qdrant Vector Database**.
   - Entity-aware re-ranking prioritizing exact keyword matches for institutional rules and policy text.

5. **Conversational Test Agent (`tests/test_agent.py`)**:
   - Validates Database Smoke tests, Schema Master integrity, Router accuracy (100%), and SQL generation accuracy.

---

## 🏗️ Architecture & Request Flow

```
                                  User Request
                                       │
                                       ▼
                              FastAPI (POST /chat)
                                       │
                                       ▼
                            ┌─────────────────────┐
                            │    Query Router     │
                            │ (services/router.py)│
                            └──────────┬──────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              ▼                        ▼                        ▼
       [LOOKUP INTENT]          [COMPUTE INTENT]         [HYBRID INTENT]
              │                        │                        │
              ▼                        ▼                        ▼
     ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
     │ Jina Embeddings │      │ Fast Regex Path │      │ Step 1: SQL     │
     │     (1024-d)    │      │ (0-token Match) │      │ (Filter/Rank)   │
     └────────┬────────┘      └────────┬────────┘      └────────┬────────┘
              │                        │                        │
              ▼                        ▼ (if complex SQL needed)▼
     ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
     │  Qdrant Search  │      │  schema_master  │      │ Step 2: RAG     │
     │(Top-k Passages) │      │ (Live Context)  │      │ (Lookup Details)│
     └────────┬────────┘      └────────┬────────┘      └────────┬────────┘
              │                        │                        │
              ▼                        ▼                        ▼
     ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
     │ Entity Re-rank  │      │ Groq SQL Engine │      │ Synthesize Both │
     │  (Budget Cap)   │      │ (SQLite app.db) │      │   in Prompt     │
     └────────┬────────┘      └────────┬────────┘      └────────┬────────┘
              │                        │                        │
              └────────────────────────┼────────────────────────┘
                                       │
                                       ▼
                            ┌─────────────────────┐
                            │      Groq LLM       │
                            │(Final Natural Answer│
                            └─────────────────────┘
```

---

## 📂 Module Structure

```
App/
├── config.py                 # Configuration loader and environment bindings
├── main.py                   # FastAPI backend application entry point
├── app.py                    # Streamlit frontend user interface
├── ingest_sqlite.py          # Unified ETL pipeline (Excel -> app.db + schema_master)
├── ingest_excel.py           # Legacy sheet extractor & Qdrant chunk indexer
├── requirements.txt          # Python dependencies
│
├── routes/
│   ├── chat.py               # POST /chat endpoint (implements 3-way fork)
│   ├── upload.py             # POST /upload endpoint (document indexing)
│   └── suggestions.py        # POST /suggestions endpoint (document hints)
│
├── services/
│   ├── router.py             # 4-layer query classifier (LOOKUP / COMPUTE / HYBRID)
│   ├── sql_engine.py         # Schema-driven SQL engine with zero-token fast path
│   ├── retriever.py          # Vector search + keyword re-ranking + context budget
│   ├── embeddings.py         # Jina AI Embeddings v3 wrapper
│   ├── vectordb.py           # Qdrant client & collection management
│   ├── prompt_builder.py     # Prompt constructor for text & tabular records
│   ├── llm.py                # Groq API client wrapper
│   ├── extractor.py          # PDF, Word, CSV, text extractors
│   ├── chunker.py            # Recursive document chunking
│   ├── query_classifier.py   # Follow-up query detection
│   └── query_rewriter.py     # Pronoun reference resolution
│
├── tests/
│   ├── test_agent.py         # 4-suite Conversational Test Agent
│   ├── test_rag_accuracy.py  # Comprehensive multi-suite accuracy test runner
│   ├── test_retrieval.py     # Retrieval verification test
│   ├── test_vectordb.py      # Qdrant connection test
│   └── test_embeddings.py    # Jina embeddings test
│
└── data/
    ├── app.db                # Unified SQLite Database (6 tables + schema_master + 3 views)
    ├── uploads/              # Standardized CSV datasets
    └── qdrant_db/            # Local Qdrant vector database storage
```

---

## ⚡ Setup & Testing

### 1. Configure `.env`

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b
JINA_API_KEY=your_jina_api_key
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your_qdrant_key
```

### 2. Build Database

```bash
python3 ingest_sqlite.py
```

### 3. Run Test Agent

```bash
# Fast offline checks (DB & Schema integrity):
python3 tests/test_agent.py --quick

# Full suite (Router, SQL generation, DB):
python3 tests/test_agent.py
```
