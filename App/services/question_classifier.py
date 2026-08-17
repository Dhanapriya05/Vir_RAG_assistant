import re


def classify_question(question: str) -> str:

    question = question.lower().strip()

    # ---------------- Summary ----------------

    if any(word in question for word in [
        "summary",
        "summarize",
        "overview",
        "brief",
        "gist"
    ]):
        return "summary"

    # ---------------- Explain ----------------

    if any(word in question for word in [
        "explain",
        "describe",
        "how",
        "working",
        "works",
        "why"
    ]):
        return "explanation"

    # ---------------- Compare ----------------

    if any(word in question for word in [
        "compare",
        "difference",
        "different",
        "vs",
        "versus"
    ]):
        return "comparison"

    # ---------------- List ----------------

    if any(word in question for word in [
        "list",
        "show",
        "give",
        "mention",
        "what are"
    ]):
        return "list"

    # ---------------- Definition ----------------

    if any(word in question for word in [
        "define",
        "definition",
        "what is",
        "meaning"
    ]):
        return "definition"

    # ---------------- Greeting ----------------

    if any(word in question for word in [
        "hi",
        "hello",
        "hey"
    ]):
        return "greeting"

    return "general"