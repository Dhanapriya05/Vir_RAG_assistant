# 🎓 Vir_RAG_assistant

**Vir_RAG_assistant** is an intelligent multi-assistant system built for college campuses (*P.T. Lee Chengalvaraya Naicker College of Engineering and Technology*). It provides:

1. **📄 Document RAG Assistant (`App/`)**: A conversational AI assistant that digests campus documents (academic regulations, syllabi, circulars, fee structures) and answers student/faculty queries with semantic retrieval and anti-hallucination guardrails.
2. **🗺️ Indoor Campus Navigation Engine (`APP/Map/`)**: A topological pathfinding engine and interactive graph map that computes turn-by-turn walking routes between classrooms, labs, offices, and facilities across multiple floors.

---

## 🏗️ Repository Overview

```
Vir_RAG_assistant/
├── App/                         # Document RAG Assistant (FastAPI + Streamlit)
│   ├── routes/                  # API endpoints (/upload, /chat, /suggestions)
│   ├── services/                # Text extraction, Jina embeddings, Qdrant, Groq LLM
│   ├── ui/                      # Streamlit UI & API bridge
│   ├── app.py                   # Streamlit frontend application
│   ├── main.py                  # FastAPI backend server
│   ├── config.py                # Configuration & environment loader
│   ├── requirements.txt         # Dependencies
│   └── README.md                # Detailed App module documentation
│
├── APP/Map/                     # Indoor Campus Navigation System
│   ├── college_graph.json       # Campus graph (nodes: rooms/stairs, edges: corridors)
│   └── navigate.py              # Dijkstra shortest path finder & direction generator
│
├── CONTRIBUTING.md              # Contribution guidelines
└── README.md                    # Root documentation (this file)
```

---

## ⚡ Quick Start

### 1. Document RAG Assistant (`App/`)

#### Prerequisites & Setup
```bash
cd App
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

#### Environment Variables (`App/.env`)
```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b
JINA_API_KEY=your_jina_api_key
QDRANT_URL=https://your-cluster.qdrant.io  # Optional, falls back to local storage
QDRANT_API_KEY=your_qdrant_api_key
```

#### Running the Backend & Frontend
* **Backend (FastAPI)**:
  ```bash
  uvicorn main:app --host 127.0.0.1 --port 8000 --reload
  ```
* **Frontend (Streamlit)**:
  ```bash
  streamlit run app.py
  ```

---

### 2. Indoor Campus Navigation (`APP/Map/`)

Find shortest paths and directions between rooms or facilities:

```bash
cd APP/Map
python navigate.py G09 F17
# Or by name:
python navigate.py "Canteen" "ECE - IV Year"
```

#### Programmatic Usage in Python:
```python
from navigate import find_path

result = find_path("G09", "F17")
print(result["directions"])
```

---

## 🛠️ Key Technologies

* **Large Language Models**: Groq Cloud API (`openai/gpt-oss-20b` / configurable)
* **Vector Embeddings**: Jina AI (`jina-embeddings-v3`)
* **Vector Database**: Qdrant (Cloud + Local disk persistence)
* **Web Frameworks**: FastAPI (REST API) & Streamlit (UI)
* **Document Processing**: PyMuPDF (`fitz`), `python-docx`, `pandas`, `langchain-text-splitters`
* **Graph Algorithms**: Dijkstra's algorithm for multi-floor shortest path navigation

---

## 🤝 Contributing

See [`CONTRIBUTING.md`](file:///home/darkemperor/aathi/7th%20sem/Vir_RAG_assistant/Vir_RAG_assistant/CONTRIBUTING.md) for contribution guidelines.

---

## 📄 License

This project is licensed under the terms specified in the [`LICENSE`](file:///home/darkemperor/aathi/7th%20sem/Vir_RAG_assistant/Vir_RAG_assistant/LICENSE) file.
