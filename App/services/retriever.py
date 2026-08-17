from services.embeddings import generate_query_embedding
from services.vectordb import search_embeddings
from services.retrieval_strategy import get_top_k
from services.context_filter import remove_duplicate_chunks


def retrieve_context(question, filename, question_type):
    """
    Retrieve relevant context from the selected document
    using a retrieval strategy based on question type.
    """

    # ------------------------------------
    # Decide Retrieval Strategy
    # ------------------------------------

    top_k = get_top_k(question_type)

    print("\n========== RETRIEVAL ==========")
    print(f"Question Type : {question_type}")
    print(f"Top K         : {top_k}")

    # ------------------------------------
    # Generate Query Embedding
    # ------------------------------------

    query_embedding = generate_query_embedding(question)

    # ------------------------------------
    # Search Vector Database
    # ------------------------------------

    results = search_embeddings(
        query_embedding=query_embedding,
        filename=filename,
        top_k=top_k
    )

    # ------------------------------------
    # Retrieved Chunks
    # ------------------------------------

    chunks = results["documents"][0]

    print("\n================ RAW CHUNKS ================\n")

    for i, chunk in enumerate(chunks):
     print(f"\nChunk {i+1}")
     print("-" * 50)
     print(chunk[:300])

    print("\n============================================\n")

    print(f"\nRetrieved Chunks : {len(chunks)}")

    # ------------------------------------
    # Remove Duplicate Chunks
    # ------------------------------------

    unique_chunks = remove_duplicate_chunks(chunks)

    print(f"Unique Chunks    : {len(unique_chunks)}")

    # ------------------------------------
    # Display Unique Chunks
    # ------------------------------------

    for i, chunk in enumerate(unique_chunks, start=1):
        print(f"\n----- Chunk {i} -----")
        print(chunk[:250])

    print("\n===============================\n")

    # ------------------------------------
    # Merge Context
    # ------------------------------------

    context = "\n\n".join(unique_chunks)

    return context