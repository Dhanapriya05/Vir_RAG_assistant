from groq import Groq

from config import GROQ_API_KEY, GROQ_MODEL

client = Groq(api_key=GROQ_API_KEY)


def generate_response(prompt):

    try:

        completion = client.chat.completions.create(
            model=GROQ_MODEL,
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

        return f"Groq Error:\n{e}"