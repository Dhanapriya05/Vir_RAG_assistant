# 📄 PDF & Document RAG Assistant

An AI-powered Document Assistant that allows users to upload documents (PDF, DOCX, TXT, CSV) and ask questions in natural language. Built using **Retrieval-Augmented Generation (RAG)** with **FastAPI**, **Qdrant**, **Jina AI Embeddings**, **Groq LLMs**, and **Streamlit**.

---

## 🚀 Features

- 📁 **Multi-Format Upload**: Supports `.pdf`, `.docx`, `.txt`, and `.csv` files.
- 💡 **Automatic Document Analysis & Suggestions**: Automatically detects document type (Research Paper, Report, Resume, Legal Document, Syllabus, etc.) and generates 4 tailored questions upon upload.
- 🧠 **Vector Embeddings**: Generates dense semantic embeddings with **Jina AI** (`jina-embeddings-v3`).
- ⚡ **Qdrant Vector Database**: Fast semantic search with cloud support and automatic local file-based storage fallback (`data/qdrant_db`).
- 🔄 **Conversational Memory & Query Rewriting**: Automatically rewrites follow-up questions referencing pronouns (*"it"*, *"they"*, *"he"*, *"she"*) into standalone search queries.
- 💬 **Context-Aware Follow-ups**: Generates 3 relevant follow-up questions with every answer.
- 🛡️ **Anti-Hallucination Guardrails**: Adheres strictly to the uploaded document context.
- 🌐 **Modern UI**: Interactive Streamlit interface with conversation history and suggestion chips.

---

## 🏗️ Architecture

```
                       User
                         │
                         ▼
                Streamlit Frontend
                         │
                  HTTP REST API
                         │
                         ▼
                  FastAPI Backend
              ┌──────────┴──────────┐
              ▼                     ▼
         POST /upload           POST /chat
              │                     │
              ▼                     ▼
     Document Extraction     Query Classifier
     (PDF/DOCX/CSV/TXT)             │
              │                     ▼
              ▼              Query Rewriter
        Text Chunking        (Context Memory)
              │                     │
              ▼                     ▼
      Jina Embeddings v3     Jina Embeddings
              │                     │
              ▼                     ▼
       Qdrant Vector DB ◄─── Qdrant Retrieval
                                    │
                                    ▼
                              Prompt Builder
                                    │
                                    ▼
                                 Groq LLM
                                    │
                                    ▼
                              Final Answer +
                           Follow-up Suggestions
```

---

## 🛠️ Tech Stack

- **Backend**: FastAPI, Uvicorn, Pydantic
- **Frontend**: Streamlit
- **Embeddings**: Jina AI Embeddings API (`jina-embeddings-v3`)
- **LLM**: Groq Cloud (`openai/gpt-oss-20b` / configurable via `.env`)
- **Vector DB**: Qdrant (Cloud + Local file persistence)
- **Document Extractors**: PyMuPDF (`fitz`), `python-docx`, `pandas`
- **Text Splitting**: LangChain Text Splitters

---

## 📂 Directory Structure

```
App/
├── .env                  # API keys and model configuration
├── .streamlit/
│   └── secrets.toml      # Streamlit secrets (e.g. BACKEND_URL)
├── routes/
│   ├── upload.py         # POST /upload endpoint
│   ├── chat.py           # POST /chat endpoint
│   └── suggestions.py    # POST /suggestions endpoint
├── services/
│   ├── extractor.py      # Multi-format document text extraction
│   ├── chunker.py        # Recursive text chunking
│   ├── embeddings.py     # Jina AI embedding generation
│   ├── vectordb.py       # Qdrant client & vector operations
│   ├── retriever.py      # Context retrieval & reranking logic
│   ├── query_classifier.py # Follow-up detection
│   ├── query_rewriter.py # Pronoun and context query resolver
│   ├── question_classifier.py # Question category classifier
│   ├── prompt_builder.py # Guardrailed RAG prompt constructor
│   ├── llm.py            # Groq completion caller
│   ├── followups.py      # Contextual follow-up question generator
│   ├── document_analyzer.py # Document classifier & suggestion generator
│   └── validator.py      # File extension & size validation
├── ui/
│   ├── api.py            # Frontend-to-Backend HTTP client
│   └── styles.py         # Streamlit styling
├── app.py                # Streamlit UI application
├── main.py               # FastAPI entry point
├── config.py             # Global configurations & env settings
└── requirements.txt      # Python dependencies
```

---

## ⚙️ Setup & Installation

### 1. Create a Virtual Environment

```bash
cd App
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create or update `.env` in the `App/` directory:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b
JINA_API_KEY=your_jina_api_key
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
```
> *Note: If `QDRANT_URL` is omitted or unavailable, the system automatically uses local disk storage at `./data/qdrant_db`.*

---

## 🚀 Running the Application

### 1. Start the FastAPI Backend
```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
* API Health Check: `http://127.0.0.1:8000/`
* Swagger API Docs: `http://127.0.0.1:8000/docs`

### 2. Start the Streamlit Frontend
In a separate terminal:
```bash
streamlit run app.py
```
* Web UI: `http://localhost:8501`

---

## 📡 API Reference

### `GET /`
Health check endpoint.
* **Response**: `{"message": "PDF RAG Backend Running 🚀"}`

### `POST /upload`
Uploads and indexes a document.
* **Form Data**: `file` (`.pdf`, `.docx`, `.csv`, `.txt`)
* **Response**:
```json
{
  "success": true,
  "message": "Document indexed successfully.",
  "filename": "regulations.pdf",
  "document_type": "Legal Document",
  "chunks_stored": 221,
  "suggested_questions": ["What is the attendance criteria?", "..."]
}
```

### `POST /chat`
Answers a query based on the uploaded document.
* **Payload**:
```json
{
  "question": "What is the fee exemption under 7.5% quota?",
  "filename": "regulations.pdf",
  "history": []
}
```
* **Response**:
```json
{
  "question": "What is the fee exemption under 7.5% quota?",
  "answer": "Students under the 7.5% quota are exempt from tuition and hostel fees.",
  "followups": ["Who is eligible for this quota?", "..."]
}
```

### `POST /suggestions`
Fetches preview and generates suggestions for an indexed document.
* **Payload**: `{"filename": "regulations.pdf"}`
* **Response**: `{"suggested_questions": [...]}`

---

## ☁️ Deployment Guide

### Deploying to Streamlit Cloud
1. Deploy the FastAPI backend to a hosting service such as **Render**, **Railway**, or **Hugging Face Spaces**.
2. Go to your Streamlit Cloud project settings ➔ **Secrets**.
3. Set your backend URL and secrets:
   ```toml
   BACKEND_URL = "https://your-fastapi-backend.onrender.com"
   ```
