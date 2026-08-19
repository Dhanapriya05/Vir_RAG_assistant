"""
Router — The Traffic Cop for the RAG pipeline.

Classifies every incoming question into one of three intents:
  • LOOKUP  → semantic similarity search (Qdrant RAG)
  • COMPUTE → SQL aggregation / filtering against tabular CSV data
  • HYBRID  → SQL first, then RAG (e.g. "highest CGPA + project description")

Decision flow:
  1. Fast keyword check — catches obvious COMPUTE / HYBRID patterns without
     spending an LLM call.
  2. LLM fallback — for ambiguous questions the Groq LLM is asked once with
     a tight, structured prompt that must respond with exactly one label.

Usage:
    from services.router import route_question
    intent = route_question("average marks in CSE")          # → "COMPUTE"
    intent = route_question("tell me about Ravi's project")  # → "LOOKUP"
"""

import re
from groq import Groq
from config import GROQ_API_KEY, GROQ_MODEL

_client = Groq(api_key=GROQ_API_KEY)

# ---------------------------------------------------------------------------
# Keyword signals — ordered from most-specific to least-specific
# ---------------------------------------------------------------------------

_COMPUTE_KEYWORDS = [
    # aggregation verbs
    "average", "avg", "mean", "total", "sum", "count", "how many",
    "maximum", "max", "minimum", "min", "highest", "lowest", "top",
    "bottom", "rank", "ranking", "percentage", "percent",
    # filtering / comparison language
    "more than", "less than", "greater than", "fewer than",
    "above", "below", "between",
    # explicit compute phrases
    "calculate", "compute", "aggregate",
]

_LOOKUP_KEYWORDS = [
    "describe", "explain", "what is", "what are", "tell me about",
    "who is", "biography", "overview", "summary of", "details of",
    "background", "profile", "project description", "research on",
    "information about", "notes on",
]

_HYBRID_PATTERNS = [
    # "highest X and their Y description"
    r"(highest|lowest|top|best|worst).+\b(and|with|along with|plus|also)\b",
    r"who (has|have|scored|got).+\b(describe|explain|tell|project|about)\b",
    r"(name|find|list).+\b(and|with).+\b(describe|details|info)\b",
]


def _keyword_route(question: str):
    """
    Fast O(n) keyword scan. Returns a label string or None if ambiguous.
    """
    q = question.lower().strip()

    # Check HYBRID patterns first (explicit two-part compute + describe questions)
    for pattern in _HYBRID_PATTERNS:
        if re.search(pattern, q):
            return "HYBRID"

    # Normalize: if "what is / what are" is followed by a compute keyword, strip it from lookup consideration
    # e.g., "what is the total / average / percentage..." is COMPUTE, not LOOKUP
    is_what_compute = bool(re.search(r"what (is|are) (the )?(total|average|avg|sum|count|highest|lowest|max|min|percentage|percent)", q))

    compute_hits = sum(1 for kw in _COMPUTE_KEYWORDS if kw in q)
    
    lookup_hits = 0
    for kw in _LOOKUP_KEYWORDS:
        if kw in ("what is", "what are") and is_what_compute:
            continue
        if kw in q:
            lookup_hits += 1

    if compute_hits > 0 and lookup_hits == 0:
        return "COMPUTE"
    if lookup_hits > 0 and compute_hits == 0:
        return "LOOKUP"
    if compute_hits > 0 and lookup_hits > 0:
        return "HYBRID"

    return None  # ambiguous — fall through to LLM


def _llm_route(question: str) -> str:
    """
    Ask the LLM to classify the question.
    Returns one of: LOOKUP, COMPUTE, HYBRID.
    Falls back to LOOKUP on any error (safest default — RAG always works).
    """

    prompt = (
        "You are a query classifier for a campus AI assistant.\n\n"
        "Classify the following question into EXACTLY ONE of these three categories:\n\n"
        "LOOKUP   — Asks about a specific person, event, concept, project, or descriptive text.\n"
        "           Answered by finding the right passage in a document.\n"
        "           Examples: \"What is Ravi's project about?\", \"Who teaches Data Structures?\"\n\n"
        "COMPUTE  — Requires aggregation, arithmetic, counting, ranking, or filtering across\n"
        "           multiple rows in a table.\n"
        "           Examples: \"Average CGPA in CSE?\", \"How many students scored above 8.5?\"\n\n"
        "HYBRID   — Needs BOTH: SQL to find a specific item, then document search to describe it.\n"
        "           Examples: \"Who has the highest CGPA and describe their project?\"\n\n"
        "Respond with ONLY the single word: LOOKUP, COMPUTE, or HYBRID.\n"
        "No explanation. No punctuation.\n\n"
        f"Question: {question}"
    )

    try:
        resp = _client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=10,
        )
        label = resp.choices[0].message.content.strip().upper()
        if label in ("LOOKUP", "COMPUTE", "HYBRID"):
            return label
    except Exception as e:
        print(f"[Router] LLM fallback error: {e}")

    return "LOOKUP"  # safe default


def route_question(question: str) -> str:
    """
    Public entry point.

    Args:
        question: The raw user question string.

    Returns:
        One of: "LOOKUP", "COMPUTE", "HYBRID"
    """
    label = _keyword_route(question)

    if label:
        print(f"[Router] Keyword match → {label}")
        return label

    label = _llm_route(question)
    print(f"[Router] LLM classified  → {label}")
    return label
