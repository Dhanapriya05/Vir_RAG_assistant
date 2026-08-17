import requests

from config import JINA_API_KEY

API_URL = "https://api.jina.ai/v1/embeddings"

HEADERS = {
    "Authorization": f"Bearer {JINA_API_KEY}",
    "Content-Type": "application/json",
}


def _embed(texts, task):
    """
    Generate embeddings using Jina AI.
    """

    response = requests.post(
        API_URL,
        headers=HEADERS,
        json={
            "model": "jina-embeddings-v3",
            "task": task,
            "input": texts,
        },
        timeout=60,
    )

    response.raise_for_status()

    data = response.json()

    return [item["embedding"] for item in data["data"]]


def generate_document_embeddings(chunks):
    print("Generating document embeddings using Jina AI...")

    print("Chunks received:", len(chunks))

    embeddings = _embed(chunks, "retrieval.passage")

    print("Embeddings returned:", len(embeddings))

    return embeddings


def generate_query_embedding(question):
    print("Generating query embedding using Jina AI...")
    return _embed([question], "retrieval.query")[0]