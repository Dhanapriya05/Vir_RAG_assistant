"""
Navigation Intent Detector.

Decides whether a user's question is a campus navigation/location query
that should be handled by the Map MCP tools, vs a document RAG query.

Uses a simple keyword heuristic + short LLM fallback for ambiguous cases.
"""

import re

# ---------------------------------------------------------------------------
# Strong navigation intent keywords (no LLM needed)
# ---------------------------------------------------------------------------

_NAV_PATTERNS = re.compile(
    r"\b("
    # Direction queries
    r"how (do i|can i|to) (get|go|reach|find|walk)"
    r"|where is|where('s| is) (the|my)?"
    r"|how far|which floor|what floor"
    r"|directions? to|route to|path to|navigate to|guide me"
    r"|way to (the|reach)?"
    r"|(get|go|walk|find|reach|go to|navigate) (to |from |between )?"
    r"|nearest|closest|from .+ to "
    r"|room (number|id|g\d+|f\d+|s\d+)"
    r"|building map|campus map|floor map"
    # Listing / search queries
    r"|list (all |the )?(rooms|labs|labs|offices|facilities|restrooms?|halls?)"
    r"|show (me )?(all |the )?(rooms|labs|offices|facilities|restrooms?)"
    r"|all (rooms|labs|offices|facilities|classrooms) (on|in|at)"
    r"|(rooms|labs|offices|facilities|classrooms) on (the )?(ground|first|second|1st|2nd|3rd) floor"
    r"|(ground|first|second|1st|2nd|3rd) floor (rooms|labs|offices|facilities|classrooms)"
    # Specific campus locations
    r"|canteen|cafeteria|library|lab|laboratory"
    r"|principal|director|hod cabin|exam cell"
    r"|restrooms?|washrooms?|toilets?"
    r"|seminar hall|board room|office room"
    r"|staircase|stairs|lift|elevator"
    r"|entrance|lobby|lounge"
    r")\b",
    re.IGNORECASE,
)

# Room ID patterns like G09, F17, S01
_ROOM_ID_PATTERN = re.compile(r"\b[GgFfSs]\d{2}\b")


def is_navigation_query(question: str) -> bool:
    """
    Returns True if the question is a campus navigation / location query.
    Fast heuristic — no LLM call needed.
    """
    if _NAV_PATTERNS.search(question):
        return True
    if _ROOM_ID_PATTERN.search(question):
        return True
    return False
