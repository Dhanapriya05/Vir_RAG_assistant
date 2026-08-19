from config import GROQ_MODEL, get_groq_client

FALLBACK_MODELS = [
    GROQ_MODEL,
    "groq/compound",
    "groq/compound-mini",
    "openai/gpt-oss-120b",
    "qwen/qwen3.6-27b",
    "openai/gpt-oss-20b",
]


def get_client():
    return get_groq_client()


def generate_response(prompt):
    client = get_client()
    if not client:
        return "Error: Groq client is not initialized. Please check your GROQ_API_KEY in .env."

    last_error = None
    for model_name in FALLBACK_MODELS:
        if not model_name:
            continue
        try:
            completion = client.chat.completions.create(
                model=model_name,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.2
            )
            return completion.choices[0].message.content
        except Exception as e:
            last_error = e
            print(f"LLM model {model_name} failed: {e}. Trying next fallback...")
            continue

    return f"Groq Generation Error: {last_error}"