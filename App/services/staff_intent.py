"""
Staff Location Intent Detector.

Detects questions like:
  "Where is Prof. Kumar?"
  "Which room is Dr. Priya in?"
  "How do I find the HOD of CSE?"
  "Where does the principal sit?"

These questions need a HYBRID path:
  1. RAG  → find which room the person is in (from staff directory doc)
  2. Tool → call find_path() to give walking directions to that room
"""

import re

# ---------------------------------------------------------------------------
# Staff / person location patterns
# ---------------------------------------------------------------------------

_STAFF_PATTERNS = re.compile(
    r"\b("
    # "where is Prof/Dr/Mr/Mrs/Sir <name>"
    r"where is (prof|dr|mr|mrs|ms|sir|madam)\b"
    r"|where can i find (prof|dr|mr|mrs|ms)\b"
    # "find Dr. Priya" / "reach Prof. Kumar"
    r"|(find|reach|meet|see|locate) (prof|dr|mr|mrs|ms)\b"
    r"|how (do i|can i|to) (find|reach|meet|see) (prof|dr|mr|mrs|ms)\b"
    r"|how (do i|can i|to) (find|reach|meet|see) (the )?(hod|principal|director|warden|librarian|dean|faculty|professor|counsellor)\b"
    # "where is the <staff-role>" — specific roles only, not rooms/facilities
    r"|where (is|are) the (hod|principal|director|warden|librarian|counsellor|dean|class advisor|lab in[- ]?charge)\b"
    r"|hod of\b|head of department\b|class advisor\b|lab in[- ]?charge\b"
    # "find/meet/see the <role>"
    r"|(find|meet|see|locate) (the )?(hod|principal|director|warden|librarian|counsellor|dean)\b"
    # "which room/office/cabin is Prof/Dr/the principal in"
    r"|which (room|office|cabin|chamber) is (prof|dr|mr|mrs|ms|the (hod|principal|director|warden|librarian|dean))\b"
    r")\b",
    re.IGNORECASE,
)


def is_staff_query(question: str) -> bool:
    """
    Returns True if the question is about finding a specific person
    on campus (staff, faculty, HOD, principal, etc.)
    """
    return bool(_STAFF_PATTERNS.search(question))
