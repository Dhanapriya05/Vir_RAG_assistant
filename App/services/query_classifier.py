FOLLOW_UP_KEYWORDS = [
    "it",
    "its",
    "they",
    "them",
    "their",
    "this",
    "that",
    "these",
    "those",
    "he",
    "she",
    "his",
    "her",
    "why",
    "how",
    "what about",
    "tell me more",
    "explain that",
    "continue",
    "and",
    "also",
    "then",
]


def needs_query_rewrite(question: str) -> bool:
    """
    Decide whether a query should be rewritten
    before retrieval.
    """

    q = question.lower().strip()

    # Very short questions usually need context
    if len(q.split()) <= 3:
        return True

    # Follow-up indicators
    for keyword in FOLLOW_UP_KEYWORDS:
        if keyword in q:
            return True

    return False