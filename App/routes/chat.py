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
from services.tool_caller import generate_with_tools

router = APIRouter()

# --------------------------------------------------
# Navigation system prompt for the LLM when using
# map MCP tools
# --------------------------------------------------

_NAV_SYSTEM_PROMPT = """You are Vir, an intelligent campus assistant for
P.T. Lee Chengalvaraya Naicker College of Engineering and Technology.

You help students and staff navigate the college campus.

You have access to these tools:
- find_path(source, destination): Get shortest route + step-by-step directions between any two rooms/locations.
- list_rooms(query): Search for rooms, labs, offices, or facilities by name or category.
- get_room_info(room_id): Get details about a specific room.

RULES:
- Always call the appropriate tool to answer navigation questions — never guess or invent room locations.
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

    # ------------------------------------
    # Detect: Navigation vs Document RAG
    # ------------------------------------

    if is_navigation_query(request.question):

        print(f"\n[Chat] Navigation intent detected → using Map MCP Tools")

        # ------------------------------------
        # Tool-Calling Path (Map Navigation)
        # ------------------------------------

        answer = generate_with_tools(
            system_prompt=_NAV_SYSTEM_PROMPT,
            user_message=request.question,
            history=request.history,
        )

        followups = generate_followup_questions(
            question=request.question,
            answer=answer,
        )

        print(f"\n[Chat] Nav answer: {answer}")
        print(f"[Chat] Nav followups: {followups}")

        return {
            "question": request.question,
            "answer": answer,
            "followups": followups,
            "source": "navigation",
        }

    # ------------------------------------
    # Document RAG Path
    # ------------------------------------

    print(f"\n[Chat] Document RAG path")

    # Classify Question
    question_type = classify_question(request.question)
    print(f"Question Type: {question_type}")

    # Rewrite Query (if needed)
    if needs_query_rewrite(request.question):
        retrieval_query = rewrite_query(
            question=request.question,
            history=request.history,
        )
    else:
        retrieval_query = request.question

    print(f"Retrieval Query: {retrieval_query}")

    # Retrieve Context
    context = retrieve_context(
        question=retrieval_query,
        filename=request.filename,
        question_type=question_type,
    )

    # Build Prompt
    prompt = build_prompt(
        context=context,
        question=request.question,
        history=request.history,
        question_type=question_type,
    )

    print("\n========== PROMPT ==========\n")
    print(prompt)
    print("\n============================\n")

    # Generate Answer
    answer = generate_response(prompt)

    print("\n========== ANSWER ==========\n")
    print(answer)
    print("\n============================\n")

    # Generate Follow-up Questions
    followups = generate_followup_questions(
        question=request.question,
        answer=answer,
    )

    print("\n========== FOLLOW UPS ==========\n")
    print(followups)
    print("\n================================\n")

    return {
        "question": request.question,
        "answer": answer,
        "followups": followups,
        "source": "document",
    }