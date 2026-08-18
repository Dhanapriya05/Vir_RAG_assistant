from fastapi import APIRouter
from pydantic import BaseModel

from services.retriever import retrieve_context
from services.prompt_builder import build_prompt
from services.llm import generate_response
from services.followups import generate_followup_questions
from services.question_classifier import classify_question
from services.query_classifier import needs_query_rewrite
from services.query_rewriter import rewrite_query
from services.nav_intent import is_navigation_query
from services.staff_intent import is_staff_query
from services.tool_caller import generate_with_tools
from services.map_tools import TOOL_DEFINITIONS

router = APIRouter()

# --------------------------------------------------
# System prompt: pure navigation (no document)
# --------------------------------------------------

_NAV_SYSTEM_PROMPT = """You are Vir, an intelligent campus assistant for
P.T. Lee Chengalvaraya Naicker College of Engineering and Technology.

You help students and staff navigate the college campus.

You have access to these tools:
- find_path(source, destination): Get shortest route + step-by-step directions between any two rooms/locations.
- list_rooms(query): Search for rooms, labs, offices, or facilities by name or category.
- get_room_info(room_id): Get details about a specific room.

RULES:
- Always call the appropriate tool to answer navigation questions — never guess.
- Present directions in a clear, friendly, step-by-step format.
- If a room is not found, suggest alternatives using list_rooms.
- Keep responses concise and helpful.
"""

# --------------------------------------------------
# System prompt: hybrid staff-lookup + navigation
# --------------------------------------------------

_HYBRID_SYSTEM_PROMPT = """You are Vir, an intelligent campus assistant for
P.T. Lee Chengalvaraya Naicker College of Engineering and Technology.

A staff directory document has been retrieved and is provided to you as context below.

Your job:
1. Read the context to find which ROOM or LOCATION the person is in.
2. Use the find_path tool to get walking directions to that room.
3. Combine the answer: who is there, where the room is, and how to get there.

You have access to these tools:
- find_path(source, destination): Get shortest route + step-by-step directions.
- list_rooms(query): Search rooms by name, category, or floor.
- get_room_info(room_id): Get details about a specific room.

RULES:
- ALWAYS call find_path after identifying the room — do not skip the directions.
- If the context does not mention the person, say so clearly.
- If multiple people match, list all of them.
- Do NOT invent room numbers not mentioned in the context.

--- STAFF DIRECTORY CONTEXT ---
{context}
--- END CONTEXT ---
"""


class ChatRequest(BaseModel):
    question: str
    filename: str = ""        # Optional — empty string = search all docs
    history: list = []


@router.post("/chat")
async def chat(request: ChatRequest):

    filename = request.filename.strip() or None  # None → multi-doc search idk why we need this 

    # -------------------------------------------------------
    # PATH 1 — Hybrid: Staff location + Navigation
    # -------------------------------------------------------

    if is_staff_query(request.question):

        print(f"\n[Chat] HYBRID intent → RAG for staff location + Map tool")

        # Step 1: RAG to find staff location from the staff directory
        context = retrieve_context(
            question=request.question,
            filename=filename,        # searches all docs if None we cn modify this 
            question_type="General",
        )

        # Step 2: Inject context into the hybrid system prompt
        hybrid_prompt = _HYBRID_SYSTEM_PROMPT.format(
            context=context if context.strip() else "No staff directory uploaded yet."
        )

        # Step 3: Groq LLM reads context + calls find_path tool
        answer = generate_with_tools(
            system_prompt=hybrid_prompt,
            user_message=request.question,
            history=request.history,
        )

        followups = generate_followup_questions( # how does this even happen
            question=request.question,
            answer=answer,
        )

        print(f"\n[Chat] Hybrid answer: {answer[:200]}")

        return {
            "question": request.question,
            "answer": answer,
            "followups": followups,
            "source": "hybrid",
        }

    # -------------------------------------------------------
    # PATH 2 — Pure Navigation (no document needed)
    # -------------------------------------------------------

    if is_navigation_query(request.question):

        print(f"\n[Chat] NAVIGATION intent → Map MCP Tools")

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
        }

    # -------------------------------------------------------
    # PATH 3 — Document RAG
    # -------------------------------------------------------

    print(f"\n[Chat] DOCUMENT RAG path")

    # Classify question type
    question_type = classify_question(request.question)
    print(f"Question Type: {question_type}")

    # Rewrite query for multi-turn conversations
    if needs_query_rewrite(request.question):
        retrieval_query = rewrite_query(
            question=request.question,
            history=request.history,
        )
    else:
        retrieval_query = request.question

    print(f"Retrieval Query: {retrieval_query}")

    # Retrieve context (from specific doc or all docs)
    context = retrieve_context(
        question=retrieval_query,
        filename=filename,
        question_type=question_type,
    )

    # Build structured prompt
    prompt = build_prompt( 
        context=context,
        question=request.question,
        history=request.history,
        question_type=question_type,
    )

    print("\n========== PROMPT ==========\n")
    print(prompt)
    print("\n============================\n")

    # Generate answer
    answer = generate_response(prompt)

    print("\n========== ANSWER ==========\n")
    print(answer)
    print("\n============================\n")

    # Generate follow-ups
    followups = generate_followup_questions(
        question=request.question,
        answer=answer,
    )

    return {
        "question": request.question,
        "answer": answer,
        "followups": followups,
        "source": "document",
    }
