import os
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct, Filter, FieldCondition, MatchValue
from services.section_detector import detect_section
from config import QDRANT_URL, QDRANT_API_KEY

COLLECTION_NAME = "pdf-rag-chatbot"
VECTOR_SIZE = 1024

_qdrant_client = None


def get_client():
    global _qdrant_client
    if _qdrant_client is None:
        try:
            if QDRANT_URL and QDRANT_API_KEY:
                _qdrant_client = QdrantClient(
                    url=QDRANT_URL,
                    api_key=QDRANT_API_KEY,
                    timeout=30,
                )
            elif QDRANT_URL:
                _qdrant_client = QdrantClient(url=QDRANT_URL, timeout=30)
            else:
                _qdrant_client = QdrantClient(path="./data/qdrant_db")
        except Exception as e:
            print(f"Warning: Cloud Qdrant connection failed ({e}). Falling back to local storage './data/qdrant_db'")
            _qdrant_client = QdrantClient(path="./data/qdrant_db")
    return _qdrant_client


def init_collection():
    client = get_client()
    try:
        collections = client.get_collections().collections
        exists = any(c.name == COLLECTION_NAME for c in collections)
        if not exists:
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(
                    size=VECTOR_SIZE,
                    distance=Distance.COSINE
                )
            )
            print(f"Created Qdrant collection: {COLLECTION_NAME}")
    except Exception as e:
        print(f"Qdrant collection setup note: {e}")


# Initialize collection on import
try:
    init_collection()
except Exception:
    pass


def store_embeddings(chunks, embeddings, filename):
    client = get_client()
    print("Chunks received by store_embeddings:", len(chunks))
    print("Embeddings received by store_embeddings:", len(embeddings))

    points = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        section = detect_section(chunk["text"])
        points.append(
            PointStruct(
                id=abs(hash(f"{filename}_{i}")),
                vector=list(embedding),
                payload={
                    "filename": filename,
                    "document": chunk["text"],
                    "page": chunk["page"],
                    "section": section,
                    "chunk_id": i,
                },
            )
        )

    print("\n========== STORING IN QDRANT ==========\n")
    for point in points[:3]:
        print(f"ID       : {point.id}")
        print(f"File     : {point.payload['filename']}")
        print(f"Page     : {point.payload['page']}")
        print(f"Section  : {point.payload['section']}")
        print(f"Text     : {point.payload['document'][:100]}...")
        print()

    print(f"Total Chunks Stored : {len(points)}")
    print("=======================================\n")

    # Upsert in batches of 40 to avoid HTTP timeout on large files
    batch_size = 40
    for idx in range(0, len(points), batch_size):
        batch = points[idx : idx + batch_size]
        client.upsert(
            collection_name=COLLECTION_NAME,
            points=batch,
            wait=True,
        )

    return len(points)


def search_embeddings(query_embedding, filename=None, top_k=10):
    query_filter = None
    if filename and filename.strip():
        query_filter = Filter(
            must=[
                FieldCondition(
                    key="filename",
                    match=MatchValue(value=filename)
                )
            ]
        )

    client = get_client()
    try:
        results = client.search(
            collection_name=COLLECTION_NAME,
            query_vector=list(query_embedding),
            query_filter=query_filter,
            limit=top_k,
            with_payload=True
        )
    except Exception as e:
        print(f"Error querying Qdrant: {e}")
        return {"documents": [[]], "sources": []}

    retrieved_docs = []
    sources = []

    print("\n========== RETRIEVED FROM QDRANT ==========\n")

    for i, result in enumerate(results, start=1):
        doc_text = result.payload.get("document", "")
        doc_name = result.payload.get("filename", "Unknown")
        page_val = result.payload.get("page", 1)
        section_val = result.payload.get("section", "Unknown")
        score = result.score

        retrieved_docs.append(doc_text)

        source_info = {
            "label": f"{doc_name} (p.{page_val})",
            "document": doc_name,
            "page": page_val,
            "section": section_val,
            "snippet": doc_text[:200] + "...",
            "score": round(score, 3),
        }
        sources.append(source_info)

        print(f"Result {i} | File: {doc_name} | Score: {score:.3f} | Page: {page_val}")
        print("Snippet:", doc_text[:120])
        print("-" * 50)

    print()

    return {
        "documents": [retrieved_docs],
        "sources": sources,
    }


def delete_document_embeddings(filename):
    client = get_client()
    try:
        client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=Filter(
                must=[
                    FieldCondition(
                        key="filename",
                        match=MatchValue(value=filename)
                    )
                ]
            ),
        )
        print(f"Deleted embeddings for {filename} from Qdrant.")
        return True
    except Exception as e:
        print(f"Error deleting embeddings for {filename}: {e}")
        return False


def get_document_preview(filename, limit=20):
    client = get_client()
    try:
        points, _ = client.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter=Filter(
                must=[
                    FieldCondition(
                        key="filename",
                        match=MatchValue(value=filename)
                    )
                ]
            ),
            limit=limit,
            with_payload=True,
            with_vectors=False,
        )
        chunks = []
        for p in points:
            chunks.append({
                "id": p.id,
                "page": p.payload.get("page", 1),
                "section": p.payload.get("section", "Unknown"),
                "text": p.payload.get("document", ""),
            })
        return chunks
    except Exception as e:
        print(f"Error scrolling document chunks for {filename}: {e}")
        return []


def count_all_chunks():
    client = get_client()
    try:
        info = client.get_collection(collection_name=COLLECTION_NAME)
        return info.points_count or 0
    except Exception:
        return 0
