import os
import sys
from fastapi import APIRouter
from pydantic import BaseModel

from services.router import route_question
from services.sql_engine import run_sql
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

You help students, staff, and visitors navigate the college campus.

You have access to these tools:
- find_path(source, destination): Get shortest route + step-by-step directions between any two rooms/locations.
- list_rooms(query): Search for rooms, labs, offices, or facilities by name or category.
- get_room_info(room_id): Get details about a specific room.

RULES:
- Always call the appropriate tool to answer navigation questions -- never guess or invent room locations.
- Present directions in a clear, friendly, step-by-step format.
- If the user asks where they are or where to go, guide them politely.
- If a room is not found, suggest similar alternatives using list_rooms.
- Keep responses concise, clear, and helpful.
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
                "sources": ["Campus Map Graph"],
            }

        # ------------------------------------
        # 2. Smart 3-Way Query Router
        # ------------------------------------
        intent = route_question(request.question)
        print(f"\n[Chat] Query: {request.question!r} | Intent: {intent}")

        # ------------------------------------
        # Branch A: COMPUTE (In-Memory SQL Analytics)
        # ------------------------------------
        if intent == "COMPUTE":
            sql_result = run_sql(request.question, request.filename if request.filename else None)
            rows = sql_result.get("rows", [])
            sql_query = sql_result.get("sql", "")

            if rows and not sql_result.get("error"):
                rows_formatted = "\n".join(
                    ", ".join(f"{k}: {v}" for k, v in row.items())
                    for row in rows[:15]
                )
                fmt_prompt = f"""You are Vir, the official AI assistant for P.T. Lee Chengalvaraya Naicker College of Engineering and Technology.
Answer the user's question directly, clearly, and factually using ONLY the verified database query result below.

Rules:
1. Provide the exact answer factually without showing raw SQL or mentioning internal database table names.
2. If multiple records are returned, list them cleanly with bullet points.
3. Be conversational, polite, and helpful.

Question: {request.question}
Data:
{rows_formatted}

Answer:"""
                answer = generate_response(fmt_prompt)
                followups = generate_followup_questions(question=request.question, answer=answer)
                return {
                    "question": request.question,
                    "answer": answer,
                    "followups": followups,
                    "source": "database",
                    "sources": ["College Academic Database"],
                }

        # ------------------------------------
        # Branch B: HYBRID (SQL + Semantic Context)
        # ------------------------------------
        if intent == "HYBRID":
            sql_result = run_sql(request.question, request.filename if request.filename else None)
            sql_summary = str(sql_result.get("rows", "")) if sql_result.get("rows") else ""
            
            context = retrieve_context(
                question=request.question,
                filename=request.filename if request.filename else None,
                question_type="general"
            )
            
            merge_prompt = f"""You are Vir, the AI campus assistant for P.T. Lee Chengalvaraya Naicker College of Engineering and Technology.
Synthesize a comprehensive, accurate answer to the user's question using both the database records and document knowledge context.

Database Record:
{sql_summary}

Document Context:
{context[:2000]}

Question: {request.question}

Answer:"""
            answer = generate_response(merge_prompt)
            followups = generate_followup_questions(question=request.question, answer=answer)
            return {
                "question": request.question,
                "answer": answer,
                "followups": followups,
                "source": "hybrid",
                "sources": ["College Database", "Knowledge Base"],
            }

        # ------------------------------------
        # Branch C: LOOKUP (Semantic Document RAG)
        # ------------------------------------
        question_type = classify_question(request.question)
        
        # Query rewriting if multi-turn history exists
        if needs_query_rewrite(request.question) and request.history:
            retrieval_query = rewrite_query(
                question=request.question,
                history=request.history,
            )
        else:
            retrieval_query = request.question

        # Retrieve relevant context with vector search & entity re-ranking
        context = retrieve_context(
            question=retrieval_query,
            filename=request.filename if request.filename else None,
            question_type=question_type,
            max_chars=6000
        )

        uploaded_files = os.listdir(UPLOAD_FOLDER) if os.path.exists(UPLOAD_FOLDER) else []
        has_files = len(uploaded_files) > 0

        if not context or not context.strip():
            if not has_files:
                return {
                    "question": request.question,
                    "answer": "No documents are currently indexed in the Knowledge Base. You can upload PDFs, Excel, Word documents, or CSVs via the **Knowledge Base** page (`/knowledge-base`).",
                    "followups": ["How do I upload documents?", "What formats are supported?"],
                    "source": "document",
                    "sources": [],
                }
            else:
                return {
                    "question": request.question,
                    "answer": "I couldn't find that specific information in the college knowledge base. Please contact the college administration or department office for the latest details.",
                    "followups": ["What courses are offered?", "What departments are available?", "Tell me about placements."],
                    "source": "document",
                    "sources": [],
                }

        # Build Grounded Prompt
        prompt = build_prompt(
            context=context,
            question=request.question,
            history=request.history,
            question_type=question_type,
        )

        # Generate Grounded LLM Response
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
            "sources": ["College Knowledge Base"],
        }

    except Exception as e:
        print(f"[Chat Endpoint Error]: {e}")
        return {
            "question": request.question,
            "answer": f"I encountered an issue processing your request: {e}. Please try asking again.",
            "followups": ["What courses are offered?", "Where is the IT Lab?"],
            "source": "error",
            "sources": [],
        }

