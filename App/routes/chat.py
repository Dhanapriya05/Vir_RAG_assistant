from fastapi import APIRouter
from pydantic import BaseModel
import os

from services.retriever import retrieve_context
from services.vectordb import search_embeddings
from services.embeddings import generate_query_embedding
from services.prompt_builder import build_prompt
from services.llm import generate_response
from services.followups import generate_followup_questions
from services.question_classifier import classify_question
from services.query_classifier import needs_query_rewrite
from services.query_rewriter import rewrite_query
from services.nav_intent import is_navigation_query
from services.tool_caller import generate_with_tools
from config import UPLOAD_FOLDER

router = APIRouter()

_NAV_SYSTEM_PROMPT = """You are Vir, an intelligent campus assistant for
P.T. Lee Chengalvaraya Naicker College of Engineering and Technology.

You help students and staff navigate the college campus.

You have access to these tools:
- find_path(source, destination): Get shortest route + step-by-step directions between any two rooms/locations.
- list_rooms(query): Search for rooms, labs, offices, or facilities by name or category.
- get_room_info(room_id): Get details about a specific room.

RULES:
- Always call the appropriate tool to answer navigation questions -- never guess or invent room locations.
- Present directions in a clear, friendly, step-by-step format.
- If the user asks about multiple locations, call the tools for each.
- If a room is not found, suggest similar alternatives using list_rooms.
- Keep responses concise and helpful.
"""


class ChatRequest(BaseModel):
    question: str
    filename: str = ""
    history: list = []


@router.post("/chat")
async def chat(request: ChatRequest):
    try:
        # ------------------------------------
        # 1. Detect Navigation Intent
        # ------------------------------------
        if is_navigation_query(request.question):
            print(f"\n[Chat] Navigation intent detected -> using Map MCP Tools")
            answer = generate_with_tools(
                system_prompt=_NAV_SYSTEM_PROMPT,
                user_message=request.question,
                history=request.history,
            )
            followups = generate_followup_questions(
                question=request.question,
                answer=answer,
            )
            return {
                "question": request.question,
                "answer": answer,
                "followups": followups,
                "source": "navigation",
                "sources": [],
            }

        # ------------------------------------
        # 2. Document RAG Path
        # ------------------------------------
        print(f"\n[Chat] Document RAG path for query: {request.question}")

        # Check if any documents exist in uploads or vector database
        uploaded_files = os.listdir(UPLOAD_FOLDER) if os.path.exists(UPLOAD_FOLDER) else []
        has_files = len(uploaded_files) > 0

        question_type = classify_question(request.question)
        print(f"Question Type: {question_type}")

        # Query Rewriting if needed
        if needs_query_rewrite(request.question):
            retrieval_query = rewrite_query(
                question=request.question,
                history=request.history,
            )
        else:
            retrieval_query = request.question

        print(f"Retrieval Query: {retrieval_query}")

        # Generate Query Embedding and search Qdrant
        query_embedding = generate_query_embedding(retrieval_query)
        results = search_embeddings(
            query_embedding=query_embedding,
            filename=request.filename if request.filename else None,
            top_k=8,
        )

        chunks = results["documents"][0] if results.get("documents") else []
        sources = results.get("sources", [])

        if not chunks:
            if not has_files:
                return {
                    "question": request.question,
                    "answer": "No documents are currently uploaded to the Knowledge Base. Please go to the **Knowledge Base** page (`/knowledge-base`) to upload your PDF, Excel (.xlsx, .xls), or CSV files, and I will answer questions based strictly on your uploaded files.",
                    "followups": ["How do I upload files to the Knowledge Base?", "Where can I find the Knowledge Base link?"],
                    "source": "document",
                    "sources": [],
                }
            else:
                return {
                    "question": request.question,
                    "answer": "I couldn't find relevant information in the uploaded knowledge base documents for your question. Please try rephrasing your question or verify that the document contains this topic.",
                    "followups": ["What documents are uploaded?", "Can you summarize the uploaded files?"],
                    "source": "document",
                    "sources": [],
                }

        # Format context for prompt
        context = "\n\n".join(chunks)

        # Build Prompt
        prompt = build_prompt(
            context=context,
            question=request.question,
            history=request.history,
            question_type=question_type,
        )

        # Generate Answer using LLM
        answer = generate_response(prompt)

        # Generate Follow-up Questions
        followups = generate_followup_questions(
            question=request.question,
            answer=answer,
        )

        return {
            "question": request.question,
            "answer": answer,
            "followups": followups,
            "source": "document",
            "sources": sources,
        }
    except Exception as e:
        print(f"[Chat Endpoint Error]: {e}")
        return {
            "question": request.question,
            "answer": f"Error processing query: {e}",
            "followups": [],
            "source": "error",
            "sources": [],
        }