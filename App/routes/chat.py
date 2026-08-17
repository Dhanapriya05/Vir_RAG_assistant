from fastapi import APIRouter
from pydantic import BaseModel

from services.retriever import retrieve_context
from services.prompt_builder import build_prompt
from services.llm import generate_response
from services.followups import generate_followup_questions
from services.question_classifier import classify_question
from services.query_classifier import needs_query_rewrite
from services.query_rewriter import rewrite_query

router = APIRouter()


class ChatRequest(BaseModel):
    question: str
    filename: str
    history: list = []


@router.post("/chat")
async def chat(request: ChatRequest):

    # ------------------------------------
    # Classify Question
    # ------------------------------------

    question_type = classify_question(request.question)

    print(f"\nQuestion Type: {question_type}")

    # ------------------------------------
    # Rewrite Query (if needed)
    # ------------------------------------

    if needs_query_rewrite(request.question):

        retrieval_query = rewrite_query(
            question=request.question,
            history=request.history
        )

    else:

        retrieval_query = request.question

    print(f"Retrieval Query: {retrieval_query}")

    # ------------------------------------
    # Retrieve Context
    # ------------------------------------

    context = retrieve_context(
    question=retrieval_query,
    filename=request.filename,
    question_type=question_type
)

    # ------------------------------------
    # Build Prompt
    # ------------------------------------

    prompt = build_prompt(
        context=context,
        question=request.question,      # Keep original question
        history=request.history,
        question_type=question_type
    )

    print("\n========== PROMPT ==========\n")
    print(prompt)
    print("\n============================\n")

    # ------------------------------------
    # Generate Answer
    # ------------------------------------

    answer = generate_response(prompt)

    print("\n========== ANSWER ==========\n")
    print(answer)
    print("\n============================\n")

    # ------------------------------------
    # Generate Follow-up Questions
    # ------------------------------------

    followups = generate_followup_questions(
        question=request.question,
        answer=answer
    )

    print("\n========== FOLLOW UPS ==========\n")
    print(followups)
    print("\n================================\n")

    # ------------------------------------
    # Response
    # ------------------------------------

    return {
        "question": request.question,
        "answer": answer,
        "followups": followups
    }