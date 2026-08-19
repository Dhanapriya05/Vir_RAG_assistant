from config import GROQ_MODEL, get_groq_client

def get_client():
    return get_groq_client()


def classify_document(text):
    client = get_client()
    if not client:
        return "Document"

    prompt = f"""
You are an AI document classifier.

Classify the uploaded document into EXACTLY ONE of these categories:

- Research Paper
- Resume
- Report
- Book
- Notes
- User Manual
- Invoice
- Legal Document
- Spreadsheet / Dataset
- Presentation
- Other

Rules:

- Return ONLY the category.
- No explanation.
- One line only.

Document:

{text[:4000]}
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
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Classification error: {e}")
        return "Document"