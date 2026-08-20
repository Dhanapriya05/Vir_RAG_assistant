import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.upload import router as upload_router
from routes.chat import router as chat_router
from routes.suggestions import router as suggestions_router


app = FastAPI(
    title="Vir RAG Assistant API",
    version="1.0.0"
)

# Enable CORS for all origins (React Vite frontend on port 5173, localhost, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "Vir RAG Backend API Running",
        "endpoints": [
            "/upload",
            "/documents",
            "/chat",
            "/suggestions"
        ]
    }


app.include_router(upload_router)
app.include_router(chat_router)
app.include_router(suggestions_router)