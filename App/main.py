from fastapi import FastAPI
from routes.upload import router as upload_router
from routes.chat import router as chat_router
from routes.suggestions import router as suggestions_router


app = FastAPI(
    title="PDF RAG Chatbot API",
    version="1.0.0"
)


@app.get("/")
def home():
    return {
        "message": "PDF RAG Backend Running 🚀"
    }


app.include_router(upload_router)
app.include_router(chat_router)
app.include_router(suggestions_router)