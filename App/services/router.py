"""
Router — The Traffic Cop for the RAG pipeline.

Classifies every incoming question into one of three intents:
  • LOOKUP  → semantic search in Qdrant (regulations, policies, concepts)
  • COMPUTE → SQL query against SQLite (student data, marks, attendance, faculty)
  • HYBRID  → SQL first, then RAG merge (e.g. find top student + describe their record)

Decision flow (in priority order):
  1. COMPUTE fast-patterns  — bare reg numbers, search-by-name, subject/marks queries
  2. HYBRID  patterns       — two-part: "compute X AND describe Y"
  3. Keyword scoring        — count COMPUTE vs LOOKUP keyword hits
  4. LLM fallback           — for truly ambiguous questions

Key rule: ALL student/faculty record lookups (by name, reg no, department) must
           route to COMPUTE (SQL), NOT Qdrant RAG. Qdrant only holds documents
           like policies, syllabi, regulations — not tabular student records.
"""

import re
from groq import Groq
from config import GROQ_API_KEY, GROQ_MODEL

_client = Groq(api_key=GROQ_API_KEY)


# ---------------------------------------------------------------------------
# Pattern 1: COMPUTE fast-lanes — always SQL, skip all keyword scoring
# These catch the cases that used to leak into LOOKUP incorrectly.
# ---------------------------------------------------------------------------

# Anna University reg numbers: 12 digits starting with 5115 or similar
_REG_NO_PATTERN = re.compile(r"\b5\d{11}\b")

# Explicit student/faculty record lookup phrases
_COMPUTE_FORCE_PATTERNS = [
    # Registration number anywhere in the query
    r"\b5\d{11}\b",
    # "search for / find / look up <name or reg>"
    r"\b(search|find|lookup|look up|get|show|fetch|pull up|retrieve)\b.{0,30}\b(student|faculty|staff|teacher|professor|reg|registration|record|detail|info|profile)\b",
    # "who is <Name>" or "who is <Name> from <batch/dept>"  — person lookup from DB
    r"\bwho is\b.{1,60}\b(student|faculty|staff|from|batch|year|department|dept|reg|it|cse|ece|eee|mech|civil|ai)\b",
    # "who is <UPPERCASE name>" — capitalized proper name = person lookup
    r"\bwho is\b\s+[A-Z][a-zA-Z\s\.]+",
    # "[name] from [batch/dept/year]" lookup
    r"\bfrom\b.{1,30}\b(batch|year|department|dept|2023|2024|2025|2026|2027|2028)\b",
    # "details of / information about / profile of [reg/name]"
    r"\b(details of|info(rmation)? (of|about|for)|profile of|record(s)? of)\b.{0,40}",
    # Subjects / marks / attendance OF a specific student (possessive or reference pronoun)
    r"\b(subjects?|courses?|enrolled|marks?|score|attendance|arrear|grade|gpa)\b.{0,30}\b(of|for|he|she|they|him|her|his|hers|this student|that student)\b",
    # "what are his/her/their marks/grades/scores/attendance" — possessive pronoun = student lookup
    r"\b(what (is|are)|show|get|give)\b.{0,20}\b(his|her|their|its)\b.{0,20}\b(marks?|grade|score|gpa|cgpa|attendance|subjects?|courses?|arrear)\b",
    # "which subjects is he/she enrolled in" style follow-up
    r"\bwhich (subjects?|courses?|papers?)\b",
    # "what subjects / what courses does he/she take"
    r"\bwhat (subjects?|courses?|papers?)\b.{0,20}\b(is|are|does|did|he|she|they)\b",
    # phone number / contact of a student or faculty
    r"\b(phone|mobile|contact|email|address)\b.{0,30}\b(of|for|student|faculty|staff)\b",
    # bare name followed by reg hint
    r"\breg(istration)?\s*(no|number|num|#)?\b",
    # cabin / room number of a faculty
    r"\b(cabin|room|office)\b.{0,20}\b(of|for|number|no)\b",
]

# ---------------------------------------------------------------------------
# Pattern 2: HYBRID — two-part question requiring SQL + document context
# ---------------------------------------------------------------------------

_HYBRID_PATTERNS = [
    r"(highest|lowest|top|best|worst)\b.+\b(and|with|along with|plus|also)\b.+\b(describe|explain|tell|info|detail|about|project|background)\b",
    r"who (has|have|scored|got).+\b(describe|explain|tell|project|about)\b",
    r"(name|find|list).+\b(and|with)\b.+\b(describe|details|info)\b",
]

# ---------------------------------------------------------------------------
# Pattern 3: Keyword signals for scoring (used only when patterns don't match)
# ---------------------------------------------------------------------------

_COMPUTE_KEYWORDS = [
    # aggregation verbs
    "average", "avg", "mean", "total", "sum", "count", "how many",
    "maximum", "max", "minimum", "min", "highest", "lowest", "top",
    "bottom", "rank", "ranking", "percentage", "percent",
    # filtering / comparison
    "more than", "less than", "greater than", "fewer than",
    "above", "below", "between",
    # explicit compute phrases (NOT "calculate" alone — too ambiguous with "explain the calculation")
    "compute", "aggregate",
    # student/faculty data — these belong in SQL, not Qdrant
    "student", "faculty", "staff", "teacher", "professor",
    "marks", "score", "grade", "gpa", "cgpa", "arrear", "fail", "pass",
    "attendance", "eligible", "hosteller", "day scholar",
    "batch", "semester", "department", "enrolled",
    "male", "female", "gender", "blood group",
]

# LOOKUP = only for concept/policy/document questions — NOT person lookups
_LOOKUP_KEYWORDS = [
    "describe", "explain",
    "what is", "what are",
    "tell me about",
    "biography", "overview", "summary of",
    "background", "project description", "research on",
    "information about", "notes on",
    # Policy / academic / concept topics
    "regulation", "policy", "rule", "syllabus", "curriculum",
    "exam pattern", "grading scale", "grading system",
    "gpa formula", "gpa calculation", "cgpa formula", "sgpa formula",
    "calculation formula", "how is gpa", "how is cgpa",
    "grading formula", "grade formula",
]


# "who is" is intentionally REMOVED from _LOOKUP_KEYWORDS because
# "who is <name>" is a DB lookup (COMPUTE), not a document search.
# The LLM fallback correctly handles "who teaches X" as LOOKUP if needed.


def _is_compute_forced(q: str) -> bool:
    """Return True if any COMPUTE fast-lane pattern matches."""
    for pattern in _COMPUTE_FORCE_PATTERNS:
        if re.search(pattern, q, re.IGNORECASE):
            return True
    # Also check for bare reg number
    if _REG_NO_PATTERN.search(q):
        return True
    return False


def _keyword_route(question: str):
    """
    Multi-layer keyword routing. Returns label or None if ambiguous.
    """
    q = question.lower().strip()
    q_orig = question.strip()

    # ── LAYER 1: COMPUTE force patterns ──────────────────────────────────────
    # These always win — student/faculty data lives in SQL, not Qdrant.
    if _is_compute_forced(q_orig):
        return "COMPUTE"

    # ── LAYER 2: HYBRID patterns ──────────────────────────────────────────────
    for pattern in _HYBRID_PATTERNS:
        if re.search(pattern, q):
            return "HYBRID"

    # ── LAYER 3: Keyword scoring ──────────────────────────────────────────────
    # Detect "what is/are the <compute metric>" → trust COMPUTE
    is_what_compute = bool(re.search(
        r"what (is|are) (the )?"
        r"(total|average|avg|sum|count|highest|lowest|max|min|"
        r"percentage|percent|pass|fail|number|grade|score|gpa)",
        q
    ))

    compute_hits = sum(1 for kw in _COMPUTE_KEYWORDS if kw in q)

    lookup_hits = 0
    for kw in _LOOKUP_KEYWORDS:
        if kw in ("what is", "what are") and is_what_compute:
            continue
        if kw in q:
            lookup_hits += 1

    # If the question asks to explain/describe a formula, policy, regulation, or rule, it's LOOKUP
    is_concept_explanation = bool(re.search(
        r"\b(explain|describe|what is|tell me about|how is|how does)\b.+\b(formula|policy|regulation|rule|grading|system|criteria|scale)\b",
        q
    ))
    if is_concept_explanation:
        return "LOOKUP"

    # Strong COMPUTE signal
    if compute_hits > 0 and lookup_hits == 0:
        return "COMPUTE"
    if compute_hits > 0 and is_what_compute:
        return "COMPUTE"
    # Strong LOOKUP signal (no SQL signals at all)
    if lookup_hits > 0 and compute_hits == 0:
        return "LOOKUP"
    # Both signals → HYBRID
    if compute_hits > 0 and lookup_hits > 0:
        return "HYBRID"

    return None  # truly ambiguous — fall through to LLM


def _llm_route(question: str) -> str:
    """
    Ask the LLM to classify the question when keyword routing is ambiguous.
    Returns one of: LOOKUP, COMPUTE, HYBRID.
    Falls back to COMPUTE (safer default for this system — SQL always works).
    """
    prompt = (
        "You are a query classifier for a college campus AI assistant (P.T. Lee CNCET).\n\n"
        "The system has TWO data sources:\n"
        "  1. SQLite DATABASE — contains: student records (name, reg no, dept, batch, "
        "marks, attendance, grades, arrears, contact info), faculty directory (name, "
        "cabin, phone, designation), courses, academic regulations.\n"
        "  2. Qdrant VECTOR STORE — contains: uploaded documents like syllabus PDFs, "
        "exam guidelines, project reports, concept explanations.\n\n"
        "Classify the question into EXACTLY ONE category:\n\n"
        "COMPUTE  — Query involves a SPECIFIC student/faculty (by name or reg no), "
        "OR requires counting/averaging/filtering tabular data (marks, attendance, "
        "grades, arrears, gender, batch, department).\n"
        "           Examples: 'who is Aathi S', '511523205001', 'marks of IT students', "
        "'which subjects is he enrolled in', 'phone number of Divagaran'\n\n"
        "LOOKUP   — Question is about a CONCEPT, POLICY, or DOCUMENT — NOT a specific "
        "person or tabular data.\n"
        "           Examples: 'explain the GPA formula', 'what is the exam pattern', "
        "'describe the project guidelines'\n\n"
        "HYBRID   — Needs BOTH: SQL data AND document context to answer fully.\n"
        "           Examples: 'who has the highest marks and describe their project'\n\n"
        "IMPORTANT: If the question names a person OR contains a registration number, "
        "ALWAYS respond COMPUTE.\n\n"
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

    return "COMPUTE"  # safer default for this system than LOOKUP


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
