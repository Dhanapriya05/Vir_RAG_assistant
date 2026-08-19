from config import GROQ_MODEL, get_groq_client

def get_client():
    return get_groq_client()

FALLBACK_FOLLOWUP_MODELS = [
    GROQ_MODEL,
    "groq/compound",
    "groq/compound-mini",
    "openai/gpt-oss-120b",
    "qwen/qwen3.6-27b",
]

def generate_followup_questions(question, answer):
    client = get_client()
    if not client:
        return []

    prompt = f"""
You are an expert AI campus and document assistant.

The user asked:
{question}

The assistant answered:
{answer}

Generate exactly THREE brief, intelligent follow-up questions.

Rules:
- Continue the conversation naturally.
- Maximum 10 words per question.
- No numbering or bullets.
- One question per line.
- Return questions only.
"""

    for model in FALLBACK_FOLLOWUP_MODELS:
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3
            )

            questions = response.choices[0].message.content.strip().split("\n")
            cleaned = [
                q.strip("- ").strip("1234567890. ").strip()
                for q in questions
                if q.strip()
            ]
            if cleaned:
                return cleaned[:3]
        except Exception as e:
            continue

    return []
