import os

from dotenv import load_dotenv

load_dotenv()

# -------------------------
# API Keys
# -------------------------

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
JINA_API_KEY = os.getenv("JINA_API_KEY")
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

# -------------------------
# File Upload Settings
# -------------------------

UPLOAD_FOLDER = "data/uploads"

ALLOWED_EXTENSIONS = {
    "pdf",
    "docx",
    "txt",
    "csv"
}
#csv is there yet u can't add it in there 


MAX_FILE_SIZE = 20 * 1024 * 1024
