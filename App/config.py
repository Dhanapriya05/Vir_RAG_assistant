import os
from dotenv import load_dotenv

load_dotenv()

# -------------------------
# API Keys
# -------------------------

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "groq/compound")
JINA_API_KEY = os.getenv("JINA_API_KEY")
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

# -------------------------
# Groq Client Factory
# -------------------------

_groq_client = None

def get_groq_client():
    """Lazy initialization of Groq client"""
    global _groq_client
    if _groq_client is None:
        from groq import Groq
        try:
            _groq_client = Groq(api_key=GROQ_API_KEY)
        except Exception as e:
            print(f"Warning: Groq client initialization failed: {e}")
            _groq_client = None
    return _groq_client

# -------------------------
# File Upload Settings
# -------------------------

UPLOAD_FOLDER = "data/uploads"

ALLOWED_EXTENSIONS = {
    "pdf",
    "docx",
    "txt",
    "csv",
    "xlsx",
    "xls"
}
#csv is there yet u can't add it in there 


# Support up to 200MB files
MAX_FILE_SIZE = 200 * 1024 * 1024
