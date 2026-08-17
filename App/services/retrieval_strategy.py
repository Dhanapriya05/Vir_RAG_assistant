def get_top_k(question_type: str) -> int:
    """
    Decide how many chunks to retrieve based on
    the user's question type.
    """

    strategies = {
        "summary": 20,
        "comparison": 12,
        "list": 10,
        "explanation": 8,
        "general": 6,
        "definition": 3,
    }

    return strategies.get(question_type, 6)