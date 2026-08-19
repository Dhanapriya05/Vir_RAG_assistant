# 🎓 Vir_RAG_assistant

**Vir_RAG_assistant** is an intelligent hybrid AI campus assistant and indoor navigation system built for **P.T. Lee Chengalvaraya Naicker College of Engineering and Technology (PTLCNCET)**.

The system combines **Semantic Document RAG** with **In-Memory Tabular SQL Analytics** through an intelligent 3-way query router, alongside an **Indoor Campus Navigation Engine**.

---

## 🌟 Core Modules

1. **📄 Hybrid Document & Tabular RAG Assistant (`App/`)**:
   - **Smart 3-Way Router**: Classifies queries into **LOOKUP** (semantic search), **COMPUTE** (SQL analytics), or **HYBRID** (chained SQL + semantic retrieval).
   - **Semantic Document RAG**: Dense vector search powered by **Jina AI Embeddings v3** and **Qdrant Vector Database** with entity-aware re-ranking.
   - **Tabular SQL Engine**: Natural language to SQL query engine over in-memory SQLite tables created from student, faculty, marks, and attendance data.
   - **Excel Batch Ingestion Engine**: Automatically parses complex, multi-sheet Excel files (`.xlsx`, `.xls`) with intelligent header detection into queryable CSVs and Qdrant vector chunks.
   - **Accuracy & Trace Test Suite**: Automated test suite with 96%+ accuracy and granular layer-by-layer JSON trace logging.

2. **🗺️ Indoor Campus Navigation Engine (`APP/Map/`)**:
   - Topological multi-floor campus graph representing rooms, laboratories, stairs, and corridors.
   - Dijkstra's shortest-path algorithm producing turn-by-turn walking directions between any two campus locations.

---

## 🏗️ System Architecture

```
                               ┌─────────────────────────────┐
                               │   User Question (Natural)   │
                               └──────────────┬──────────────┘
                                              │
                                              ▼
                               ┌─────────────────────────────┐
                               │    Query Router Classifier   │
                               │    (services/router.py)     │
                               └───────┬──────┬──────┬───────┘
                                       │      │      │
                      ┌────────────────┘      │      └────────────────┐
                      ▼                       ▼                       ▼
            ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
            │   LOOKUP Branch   │   │  COMPUTE Branch   │   │   HYBRID Branch   │
            │ (Semantic Search) │   │  (SQL Analytics)  │   │  (Chained SQL+RAG)│
            └─────────┬─────────┘   └─────────┬─────────┘   └─────────┬─────────┘
                      │                       │                       │
                      ▼                       ▼                       ▼
            ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
            │  Jina v3 Vectors  │   │ Select Top Tables │   │ Step 1: SQL Query │
            │  (1024-dim dense) │   │  (Keyword-Ranked) │   │ (Aggregate/Filter)│
            └─────────┬─────────┘   └─────────┬─────────┘   └─────────┬─────────┘
                      │                       │                       │
                      ▼                       ▼                       ▼
            ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
            │  Qdrant Vector DB │   │ In-Memory SQLite  │   │ Step 2: Vector DB │
            │ (Cosine Distance) │   │ (Groq SQL Select) │   │ (Context Lookup)  │
            └─────────┬─────────┘   └─────────┬─────────┘   └─────────┬─────────┘
                      │                       │                       │
                      ▼                       ▼                       ▼
            ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
            │ Entity Re-ranker  │   │ Execute & Format  │   │ Synthesize Answer │
            │ (Token Priority)  │   │ (Structured Dict) │   │ (SQL + Documents) │
            └─────────┬─────────┘   └─────────┬─────────┘   └─────────┬─────────┘
                      │                       │                       │
                      └───────────────────────┼───────────────────────┘
                                              │
                                              ▼
                               ┌─────────────────────────────┐
                               │  Groq LLM Response Engine   │
                               │  (Natural Language Output)  │
                               └─────────────────────────────┘
```

---

## 📂 Repository Layout

```
Vir_RAG_assistant/
├── App/                         # Document & Tabular RAG System
│   ├── data/                    # Ingested CSVs & local vector database
│   │   └── uploads/             # Standardized tabular CSV data files
│   ├── routes/                  # FastAPI endpoints (/upload, /chat, /suggestions)
│   ├── services/                # Core architecture services:
│   │   ├── router.py            # 3-way query classifier (LOOKUP / COMPUTE / HYBRID)
│   │   ├── sql_engine.py        # In-memory SQLite generator & executor
│   │   ├── retriever.py         # Qdrant retrieval + entity-aware re-ranking
│   │   ├── embeddings.py        # Jina AI Embeddings v3 client
│   │   ├── vectordb.py          # Qdrant client & vector collection operations
│   │   ├── prompt_builder.py    # Structured prompt generator for document & tabular RAG
│   │   ├── llm.py               # Groq LLM client wrapper
│   │   ├── extractor.py         # Multi-format document extractor (PDF/DOCX/TXT/CSV)
│   │   └── chunker.py           # Text splitter with section and page tracking
│   ├── tests/                   # Accuracy verification test suite
│   │   ├── test_rag_accuracy.py # End-to-end multi-layer test suite
│   │   └── last_run_trace.json  # Full JSON execution trace of the last test run
│   ├── ingest_excel.py          # Batch ingestion script for Excel datasets
│   ├── app.py                   # Streamlit web user interface
│   ├── main.py                  # FastAPI REST backend server
│   ├── config.py                # App configuration & environment loader
│   ├── requirements.txt         # Project dependencies
│   └── README.md                # Detailed App module documentation
│
├── APP/Map/                     # Indoor Campus Navigation System
│   ├── college_graph.json       # Campus topological graph (rooms, labs, stairs)
│   └── navigate.py              # Dijkstra shortest path navigation engine
│
├── DATA/                        # Source campus datasets (Academics, Student, Marks, Attendance)
├── CONTRIBUTING.md              # Contribution guidelines
└── README.md                    # Root project documentation
```

---

## ⚡ Quick Start

### 1. Set Up Environment & Dependencies

```bash
cd App
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables (`App/.env`)

Create or update `App/.env`:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b
JINA_API_KEY=your_jina_api_key
QDRANT_URL=https://your-cluster.qdrant.io  # Optional: falls back to local disk if omitted
QDRANT_API_KEY=your_qdrant_api_key
```

### 3. Ingest Campus Data (Optional / Batch Mode)

If you have fresh Excel files in `DATA/`:

```bash
cd App
python ingest_excel.py
```

### 4. Run the Accuracy Test Suite

Verify all pipeline layers and inspect execution logs:

```bash
cd App
python tests/test_rag_accuracy.py
```

### 5. Start Backend and Frontend

* **FastAPI Backend**:
  ```bash
  uvicorn main:app --host 127.0.0.1 --port 8000 --reload
  ```
  API Docs: `http://127.0.0.1:8000/docs`

* **Streamlit Web UI**:
  ```bash
  streamlit run app.py
  ```
  Web UI: `http://localhost:8501`

---

## 🗺️ Indoor Campus Navigation (`APP/Map/`)

Compute turn-by-turn directions between classrooms, departments, or facilities:

```bash
cd APP/Map
python navigate.py "G09" "F17"
# Or search by facility name:
python navigate.py "Canteen" "ECE - IV Year"
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **LLM Engine** | Groq Cloud API (`openai/gpt-oss-20b` / `llama-3.3-70b-versatile`) | Fast, high-throughput text & SQL generation |
| **Embeddings** | Jina AI (`jina-embeddings-v3`) | 1024-dimensional dense semantic vectors |
| **Vector DB** | Qdrant | Cloud & local disk vector similarity search |
| **SQL Engine** | In-Memory SQLite | Instant SQL computation on tabular datasets |
| **Backend** | FastAPI + Uvicorn | High-performance asynchronous REST API |
| **Frontend** | Streamlit | Interactive conversational chat UI |
| **Data Parsing** | `openpyxl`, `xlrd`, `pandas`, `PyMuPDF`, `python-docx` | Robust multi-format document extraction |
| **Pathfinding** | Dijkstra's Graph Algorithm | Multi-floor indoor campus shortest path navigation |

---

## 📄 License

This project is developed for educational and institutional assistance at PTLCNCET.
