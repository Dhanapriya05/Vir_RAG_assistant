from groq import Groq

from config import GROQ_API_KEY, GROQ_MODEL

client = Groq(api_key=GROQ_API_KEY)


def classify_document(text):

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
- Presentation
- Other

Rules:

- Return ONLY the category.
- No explanation.
- One line only.

Document:

{text[:4000]}
"""

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