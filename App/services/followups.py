from config import GROQ_MODEL, get_groq_client

def get_client():
    return get_groq_client()


def generate_followup_questions(question, answer):
    client = get_client()
    if not client:
        return []

    prompt = f"""
You are an expert AI document assistant.

The user asked:

{question}

The assistant answered:

{answer}

Generate exactly THREE intelligent follow-up questions.

Rules:

- Continue the conversation naturally.
- Questions must relate to the previous answer.
- Questions should be answerable using the uploaded document.
- Maximum 10 words.
- No numbering.
- One question per line.
- Return questions only.
"""

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        questions = response.choices[0].message.content.strip().split("\n")

        questions = [
            q.strip("- ").strip()
            for q in questions
            if q.strip()
        ]

        return questions[:4]
    except Exception as e:
        print(f"Followup generation error: {e}")
        return []