import json
from config import GROQ_MODEL, get_groq_client

def get_client():
    return get_groq_client()


def analyze_document(text):
    print("Analyzing document...")

    prompt = f"""
You are an expert AI document analyst.

Analyze the uploaded document.

First identify its document type.

Choose EXACTLY ONE:

- Research Paper
- Resume
- Report
- Book
- Notes
- User Manual
- Legal Document
- Invoice
- Spreadsheet / Dataset
- Presentation
- Other

Then generate EXACTLY FOUR intelligent questions.

Requirements:

- Questions must be answerable using ONLY this document.
- Avoid generic questions.
- Cover different aspects.
- Maximum 10 words.
- No numbering.

Return ONLY valid JSON.

Example:

{{
  "document_type": "Report",
  "suggested_questions": [
    "Summarize the key findings in this document.",
    "What are the main statistics and numbers?",
    "What guidelines or policies are specified?",
    "What are the most important conclusions?"
  ]
}}

Document:

{text[:5000]}
"""

    client = get_client()
    if not client:
        return {
            "document_type": "Document",
            "suggested_questions": [
                "Summarize this document.",
                "What are the key points?",
                "What important details are included?",
                "What are the main takeaways?"
            ]
        }

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            response_format={"type": "json_object"}
        )

        result = json.loads(
            response.choices[0].message.content
        )
        return result
    except Exception as e:
        print(f"Document analysis fallback: {e}")
        return {
            "document_type": "Document",
            "suggested_questions": [
                "Summarize this document.",
                "What are the key points?",
                "What important details are included?",
                "What are the main takeaways?"
            ]
        }
