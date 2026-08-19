from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    PayloadSchemaType,
)

import os
from config import QDRANT_URL, QDRANT_API_KEY
from services.section_parser import detect_section

COLLECTION_NAME = "pdf-rag-chatbot"

def _get_qdrant_client():
    if QDRANT_URL and QDRANT_API_KEY:
        try:
            c = QdrantClient(
                url=QDRANT_URL,
                api_key=QDRANT_API_KEY,
                check_compatibility=False,
                timeout=5,
            )
            c.get_collections()
            return c
        except Exception as e:
            print(f"Warning: Cloud Qdrant connection failed ({e}). Falling back to local storage './data/qdrant_db'")
    os.makedirs("data/qdrant_db", exist_ok=True)
    return QdrantClient(path="data/qdrant_db")

client = _get_qdrant_client()

# --------------------------------------------------
# Create Collection
# --------------------------------------------------

try:
    collections = client.get_collections().collections
    if COLLECTION_NAME not in [c.name for c in collections]:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=1024,
                distance=Distance.COSINE,
            ),
        )
    client.create_payload_index(
        collection_name=COLLECTION_NAME,
        field_name="filename",
        field_schema=PayloadSchemaType.KEYWORD,
    )
except Exception as e:
    print(f"Qdrant collection setup note: {e}")


# --------------------------------------------------
# Store Embeddings
# --------------------------------------------------

def store_embeddings(chunks, embeddings, filename):
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


# --------------------------------------------------
# Search Embeddings
# --------------------------------------------------

def search_embeddings(query_embedding, filename=None, top_k=10):
    query_filter = None
    if filename and filename.strip():
        query_filter = Filter(
            must=[
                FieldCondition(
                    key="filename",
                    match=MatchValue(value=filename.strip()),
                )
            ]
        )

    try:
        response = client.query_points(
            collection_name=COLLECTION_NAME,
            query=list(query_embedding),
            limit=top_k,
            query_filter=query_filter,
        )
    except Exception as e:
        print(f"Error querying Qdrant: {e}")
        return {
            "documents": [[]],
            "pages": [],
            "chunk_ids": [],
            "sources": [],
        }

    print("\n========== RETRIEVED FROM QDRANT ==========\n")
    sources = []
    documents = []
    pages = []
    chunk_ids = []

    for i, point in enumerate(response.points, start=1):
        doc_text = point.payload.get("document", "")
        doc_name = point.payload.get("filename", "")
        page_val = point.payload.get("page", 1)
        sec_val = point.payload.get("section", "Section")
        score = getattr(point, "score", 0.0)

        print(f"Result {i} | File: {doc_name} | Score: {score:.3f} | Page: {page_val}")
        print("Snippet:", doc_text[:120])
        print("-" * 50)

        documents.append(doc_text)
        pages.append(page_val)
        chunk_ids.append(point.payload.get("chunk_id", i))

        sources.append({
            "label": f"{doc_name} (p.{page_val})" if str(page_val).isdigit() else f"{doc_name} ({page_val})",
            "document": doc_name,
            "page": page_val,
            "section": sec_val,
            "snippet": doc_text[:280] + "..." if len(doc_text) > 280 else doc_text,
            "score": round(float(score), 3) if score else None,
        })

    return {
        "documents": [documents],
        "pages": pages,
        "chunk_ids": chunk_ids,
        "sources": sources,
    }


# --------------------------------------------------
# Delete Document Embeddings
# --------------------------------------------------

def delete_document_embeddings(filename: str):
    try:
        client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=Filter(
                must=[
                    FieldCondition(
                        key="filename",
                        match=MatchValue(value=filename),
                    )
                ]
            ),
        )
        print(f"Deleted embeddings for {filename} from Qdrant.")
        return True
    except Exception as e:
        print(f"Error deleting embeddings for {filename}: {e}")
        return False


# --------------------------------------------------
# Get Document Preview / Chunks
# --------------------------------------------------

def get_document_preview(filename, limit=10):
    try:
        response = client.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter=Filter(
                must=[
                    FieldCondition(
                        key="filename",
                        match=MatchValue(value=filename),
                    )
                ]
            ),
            limit=limit,
            with_payload=True,
            with_vectors=False,
        )

        points = response[0]
        points.sort(key=lambda point: point.payload.get("chunk_id", 0))

        chunks = [
            {
                "id": p.payload.get("chunk_id", 0),
                "page": p.payload.get("page", 1),
                "section": p.payload.get("section", "Section"),
                "text": p.payload.get("document", ""),
            }
            for p in points
        ]
        return chunks
    except Exception as e:
        print(f"Error scrolling document chunks for {filename}: {e}")
        return []


def count_all_chunks():
    try:
        info = client.get_collection(collection_name=COLLECTION_NAME)
        return info.points_count
    except Exception:
        return 0