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

from config import QDRANT_URL, QDRANT_API_KEY
from services.section_parser import detect_section

client = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY,
)

COLLECTION_NAME = "pdf-rag-chatbot"

# --------------------------------------------------
# Create Collection
# --------------------------------------------------

collections = client.get_collections().collections

if COLLECTION_NAME not in [c.name for c in collections]:

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(
            size=1024,
            distance=Distance.COSINE,
        ),
    )

try:
    client.create_payload_index(
        collection_name=COLLECTION_NAME,
        field_name="filename",
        field_schema=PayloadSchemaType.KEYWORD,
    )
except Exception:
    pass


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

    print("\n========== STORING ==========\n")

    for point in points[:5]:
        print(f"ID       : {point.id}")
        print(f"Page     : {point.payload['page']}")
        print(f"Section  : {point.payload['section']}")
        print(f"Chunk ID : {point.payload['chunk_id']}")
        print(f"Text     : {point.payload['document'][:120]}")
        print()

    print(f"Total Chunks Stored : {len(points)}")

    print("\n=============================\n")

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=points,
        wait=True,
    )

    return len(points)


# --------------------------------------------------
# Search Embeddings
# --------------------------------------------------

def search_embeddings(query_embedding, filename, top_k=10):

    response = client.query_points(
        collection_name=COLLECTION_NAME,
        query=list(query_embedding),
        limit=top_k,
        query_filter=Filter(
            must=[
                FieldCondition(
                    key="filename",
                    match=MatchValue(value=filename),
                )
            ]
        ),
    )

    print("\n========== RETRIEVED ==========\n")

    for i, point in enumerate(response.points, start=1):
        print(f"Result {i}")
        print("Score   :", point.score)
        print("Page    :", point.payload.get("page"))
        print("Section :", point.payload.get("section"))
        print("Chunk   :", point.payload["document"][:250])
        print("-" * 60)

    documents = [
        point.payload["document"]
        for point in response.points
    ]

    pages = [
        point.payload.get("page")
        for point in response.points
    ]

    chunk_ids = [
        point.payload.get("chunk_id")
        for point in response.points
    ]

    return {
        "documents": [documents],
        "pages": pages,
        "chunk_ids": chunk_ids,
    }


# --------------------------------------------------
# Get Document Preview
# --------------------------------------------------

def get_document_preview(filename, limit=5):

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

    points.sort(
        key=lambda point: point.payload.get("chunk_id", 0)
    )

    preview = "\n\n".join(
        point.payload.get("document", "")
        for point in points
    )

    return preview