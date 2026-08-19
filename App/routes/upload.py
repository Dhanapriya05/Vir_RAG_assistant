import os
from fastapi import APIRouter, UploadFile, File, HTTPException

from config import UPLOAD_FOLDER
from services.validator import validate_file
from services.saver import save_file
from services.extractor import extract_text
from services.document_analyzer import analyze_document
from services.chunker import chunk_text
from services.embeddings import generate_document_embeddings
from services.vectordb import (
    store_embeddings,
    delete_document_embeddings,
    get_document_preview,
    count_all_chunks
)

router = APIRouter()


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    # ----------------------------------
    # Validate
    # ----------------------------------
    await validate_file(file)

    # ----------------------------------
    # Save File
    # ----------------------------------
    saved_path = await save_file(file)
    size_bytes = os.path.getsize(saved_path) if os.path.exists(saved_path) else 0
    size_mb = round(size_bytes / (1024 * 1024), 2)

    # ----------------------------------
    # Extract Pages / Sheets
    # ----------------------------------
    pages = extract_text(saved_path)
    print(f"\nTotal Extracted Sections/Pages : {len(pages)}")

    if not pages:
        raise HTTPException(
            status_code=400,
            detail="Could not extract any readable text from the uploaded file."
        )

    # ----------------------------------
    # Merge Pages for Analysis
    # ----------------------------------
    full_text = "\n\n".join(page["text"] for page in pages)

    # ----------------------------------
    # Analyze Document
    # ----------------------------------
    analysis = analyze_document(full_text)
    document_type = analysis.get("document_type", "Document")
    suggested_questions = analysis.get("suggested_questions", [])

    print("\n========== DOCUMENT ANALYSIS ==========\n")
    print(f"Document Type : {document_type}")
    print(f"Suggested Questions : {suggested_questions}")
    print("=======================================\n")

    # ----------------------------------
    # Chunk Text
    # ----------------------------------
    chunks = chunk_text(pages)
    print(f"Total Chunks : {len(chunks)}")

    # ----------------------------------
    # Generate Embeddings
    # ----------------------------------
    embeddings = generate_document_embeddings(
        [chunk["text"] for chunk in chunks]
    )

    # ----------------------------------
    # Store Embeddings in Qdrant
    # ----------------------------------
    total_stored = store_embeddings(
        chunks=chunks,
        embeddings=embeddings,
        filename=file.filename
    )

    return {
        "success": True,
        "message": f"Document '{file.filename}' indexed successfully into Knowledge Base.",
        "filename": file.filename,
        "document_type": document_type,
        "chunks_stored": total_stored,
        "size_mb": size_mb,
        "pages_or_sheets": len(pages),
        "suggested_questions": suggested_questions,
    }


@router.get("/documents")
def list_uploaded_documents():
    """
    List all uploaded and indexed documents in the Knowledge Base.
    """
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    files = []

    for fname in os.listdir(UPLOAD_FOLDER):
        fpath = os.path.join(UPLOAD_FOLDER, fname)
        if os.path.isfile(fpath):
            stat = os.stat(fpath)
            size_mb = round(stat.st_size / (1024 * 1024), 2)
            ext = os.path.splitext(fname)[1].lower()

            files.append({
                "id": f"doc_{abs(hash(fname))}",
                "name": fname,
                "type": ext.lstrip("."),
                "extension": ext,
                "size": size_mb,
                "sizeBytes": stat.st_size,
                "status": "indexed",
                "uploadedAt": stat.st_mtime * 1000,
            })

    return {
        "success": True,
        "count": len(files),
        "total_chunks": count_all_chunks(),
        "documents": files
    }


@router.delete("/documents/{filename}")
def delete_document(filename: str):
    """
    Delete a document file and its vector embeddings from Qdrant.
    """
    fpath = os.path.join(UPLOAD_FOLDER, filename)
    file_removed = False
    if os.path.exists(fpath):
        try:
            os.remove(fpath)
            file_removed = True
        except Exception as e:
            print(f"Error removing file {fpath}: {e}")

    # Remove embeddings from Qdrant
    embeddings_removed = delete_document_embeddings(filename)

    return {
        "success": True,
        "message": f"Document '{filename}' deleted.",
        "file_removed": file_removed,
        "embeddings_removed": embeddings_removed,
    }


@router.get("/documents/{filename}/chunks")
def get_chunks(filename: str):
    """
    Retrieve real indexed chunks for a document.
    """
    chunks = get_document_preview(filename, limit=20)
    return {
        "success": True,
        "filename": filename,
        "count": len(chunks),
        "chunks": chunks
    }
