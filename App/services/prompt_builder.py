def build_prompt(context, question, history=None, question_type="General"):
    """
    Build a structured, token-efficient prompt for Document and Tabular RAG.
    """
    if history is None:
        history = []

    conversation_text = ""
    if history:
        turns = []
        for msg in history[-4:]:
            role = msg.get("role", "user").capitalize()
            content = msg.get("content", "")
            turns.append(f"{role}: {content}")
        conversation_text = "\n".join(turns)

    prompt = f"""You are Vir, an intelligent AI campus assistant for P.T. Lee Chengalvaraya Naicker College of Engineering and Technology.

YOUR ROLE:
Answer the user's question accurately and naturally using the information in the Document Context.

RULES:
1. Answer the question directly, cleanly, and politely.
2. Extract facts (names, register numbers, dates, blood groups, grades, departments, attendance, addresses, rules) directly from the context.
3. CRITICAL: Do NOT mention or cite document file names, file extensions (.pdf, .xlsx, .docx, .xls, .csv), or phrases like "as stated in [filename]", "according to the document", or "in the uploaded file". State the answer as direct official college information.
4. If the required information is completely absent from the context, respond: "I couldn't find that specific information in the college records. Please ask about another topic or verify with the department."
5. Be concise, direct, well-structured (use bullet points or tables where appropriate), and helpful.
"""

    if conversation_text:
        prompt += f"""
CONVERSATION HISTORY:
{conversation_text}
"""

    prompt += f"""
DOCUMENT CONTEXT:
{context}

QUESTION:
{question}

ANSWER:
"""
    return prompt.strip()
