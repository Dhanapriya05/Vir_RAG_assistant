# 📄 Vir Campus RAG & SQL Assistant (`App/`)

The `App/` module is the core intelligence engine for the **Vir Assistant**. It combines **Document Semantic Retrieval (Vector RAG)** and **Tabular Analytics (In-Memory SQL)** into a single unified conversational API.

---

## 🌟 Key Capabilities

1. **3-Way Intelligent Intent Routing (`services/router.py`)**:
   - **`LOOKUP`**: Directs factual, descriptive, or biographical queries to Qdrant vector retrieval.
   - **`COMPUTE`**: Directs aggregation, arithmetic, counting, ranking, and filtering questions to the In-Memory SQL Engine.
   - **`HYBRID`**: Executes SQL first to isolate specific rows, then uses Qdrant RAG to pull rich contextual passages.

2. **In-Memory Tabular SQL Engine (`services/sql_engine.py`)**:
   - Dynamically loads relevant CSV tables into SQLite in-memory databases.
   - Uses smart keyword ranking to feed only the 2–3 most relevant table schemas to the LLM (preventing prompt token overflow).
   - Generates and executes safe SQLite `SELECT` queries and formats structured results.

3. **Semantic Vector RAG (`services/retriever.py` & `services/vectordb.py`)**:
   - Uses **Jina AI Embeddings v3** (1024 dimensions) for dense semantic retrieval.
   - Entity-aware re-ranking boosts chunks containing exact keywords/names (e.g. registration numbers, student names) to Rank 1.
   - Strict character budgeting prevents rate limits while keeping high-precision context.

4. **Multi-Format Ingestion Engine (`ingest_excel.py` & `services/extractor.py`)**:
   - Parses `.pdf`, `.docx`, `.txt`, and `.csv`.
   - Automated Excel ingestion with heuristic header scoring for complex institutional spreadsheets (`.xlsx`, `.xls`).

5. **Diagnostic Test & Verification Suite (`tests/test_rag_accuracy.py`)**:
   - Multi-suite validation for Router (100%), SQL Engine (100%), Vector Retrieval (75%), and Full Pipeline (100%).
   - Generates execution trace logs (`tests/last_run_trace.json`) displaying layer-by-layer data transformations.

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
     │ Jina Embeddings │      │ Rank CSV Tables │      │ Step 1: SQL     │
     │     (1024-d)    │      │ (uploads/*.csv) │      │ (Filter/Rank)   │
     └────────┬────────┘      └────────┬────────┘      └────────┬────────┘
              │                        │                        │
              ▼                        ▼                        ▼
     ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
     │  Qdrant Search  │      │ In-Memory SQLite│      │ Step 2: RAG     │
     │(Top-k Passages) │      │ (Groq SQL Gen)  │      │ (Lookup Details)│
     └────────┬────────┘      └────────┬────────┘      └────────┬────────┘
              │                        │                        │
              ▼                        ▼                        ▼
     ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
     │ Entity Re-rank  │      │ Execute & Fetch │      │ Synthesize Both │
     │  (Budget Cap)   │      │  (Row Dicts)    │      │   in Prompt     │
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
├── ingest_excel.py           # Automated batch Excel-to-CSV/Qdrant ingestion script
├── requirements.txt          # Python dependencies
│
├── routes/
│   ├── chat.py               # POST /chat endpoint (implements 3-way fork)
│   ├── upload.py             # POST /upload endpoint (document indexing)
│   └── suggestions.py        # POST /suggestions endpoint (document hints)
│
├── services/
│   ├── router.py             # Intent classification (LOOKUP / COMPUTE / HYBRID)
│   ├── sql_engine.py         # SQLite loader, SQL generation, safe execution
│   ├── retriever.py          # Vector search + keyword re-ranking + context budget
│   ├── embeddings.py         # Jina AI Embeddings v3 wrapper
│   ├── vectordb.py           # Qdrant client & collection management
│   ├── prompt_builder.py     # Prompt constructor for text & tabular records
│   ├── llm.py                # Groq API client wrapper
│   ├── extractor.py          # PDF, Word, CSV, text extractors
│   ├── chunker.py            # Recursive document chunking
│   ├── query_classifier.py   # Follow-up query detection
│   ├── query_rewriter.py     # Pronoun reference resolution
│   ├── document_analyzer.py  # Auto-classification & starter questions
│   └── validator.py          # File type & size validation
│
├── tests/
│   ├── test_rag_accuracy.py  # Comprehensive multi-suite accuracy test runner
│   ├── last_run_trace.json   # Diagnostic JSON trace of previous test run
│   ├── test_retrieval.py     # Retrieval verification test
│   ├── test_vectordb.py      # Qdrant connection test
│   └── test_embeddings.py    # Jina embeddings test
│
└── data/
    ├── uploads/              # Clean tabular CSV datasets
    └── qdrant_db/            # Local Qdrant vector database storage
```

---

## ⚡ Environment & Setup

### 1. Requirements

Install dependencies in your active Python environment:

```bash
pip install -r requirements.txt
```

### 2. Configuration (`.env`)

Create `.env` in `App/`:

```env
GROQ_API_KEY=gsk_your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b
JINA_API_KEY=jina_your_api_key
QDRANT_URL=https://your-cluster.qdrant.io  # Optional: defaults to local disk
QDRANT_API_KEY=your_qdrant_key            # Optional
```

---

## 🧪 Testing & Accuracy Verification

Run the accuracy test suite:

```bash
python tests/test_rag_accuracy.py
```

Or with `pytest`:

```bash
pytest tests/test_rag_accuracy.py -v
```

The test runner will validate:
1. **Router Classification**: Correct fork routing for count, average, describe, fact, and hybrid queries.
2. **SQL Engine**: Execution of SQLite queries against real student, marks, and attendance tables.
3. **Retriever**: Dense retrieval precision and keyword entity re-ranking.
4. **Full Pipeline Flow**: End-to-end question answering against ground truth data.
5. **Flow Trace**: Logs data shapes and transformations across all layers to `tests/last_run_trace.json`.

---

## 📡 API Reference

### `POST /chat`
Executes intelligent query routing and returns the synthesized answer.

* **Request**:
  ```json
  {
    "question": "What is the average attendance of IT 5th semester students?",
    "filename": null,
    "history": []
  }
  ```

* **Response**:
  ```json
  {
    "question": "What is the average attendance of IT 5th semester students?",
    "answer": "The average attendance for 5th semester IT students is 68.4%.",
    "followups": [
      "Who has the highest attendance in IT?",
      "How many students have attendance below 75%?"
    ]
  }
  ```

### `POST /upload`
Uploads and indexes a document into Qdrant.

* **Request**: Multipart Form Data with `file`.
* **Response**: Metadata including detected document type, chunk count, and suggested questions.
