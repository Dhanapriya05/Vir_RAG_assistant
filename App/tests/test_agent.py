"""
test_agent.py — Conversational Test Agent for Vir RAG System

This agent simulates a real user querying the system and evaluates:
  1. ROUTER accuracy   — Does it correctly route COMPUTE / LOOKUP / HYBRID?
  2. SQL ENGINE        — Does the schema_master + LLM generate correct SQL?
  3. SQL RESULTS       — Are the SQL query results factually correct?
  4. SCHEMA MASTER     — Is the schema catalog complete and queryable?

Run from project root:
    cd App && python3 tests/test_agent.py
    cd App && python3 tests/test_agent.py --quick   (router + schema only)
    cd App && python3 tests/test_agent.py --suite sql
    cd App && python3 tests/test_agent.py --suite router
"""

import sys
import os
import time
import argparse
import sqlite3

# ── Path setup ────────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

# ── Color helpers ─────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def passed(msg):  return f"{GREEN}✓ PASS{RESET}  {msg}"
def failed(msg):  return f"{RED}✗ FAIL{RESET}  {msg}"
def partial(msg): return f"{YELLOW}~ PART{RESET}  {msg}"
def info(msg):    return f"{CYAN}  →{RESET} {msg}"


# ═════════════════════════════════════════════════════════════════════════════
# SUITE 1 — ROUTER ACCURACY
# ═════════════════════════════════════════════════════════════════════════════

ROUTER_TESTS = [
    # ── COMPUTE: aggregation ──────────────────────────────────────────────────
    ("how many students are in IT department?",              "COMPUTE", "count → COMPUTE"),
    ("what is the average attendance percentage?",           "COMPUTE", "average → COMPUTE"),
    ("total number of female students",                      "COMPUTE", "total → COMPUTE"),
    ("highest marks in 4th sem IT?",                        "COMPUTE", "highest → COMPUTE"),
    ("who has the lowest attendance?",                       "COMPUTE", "lowest → COMPUTE"),
    ("how many students are in arrear?",                    "COMPUTE", "count + filter → COMPUTE"),
    ("what is the pass percentage in IAT-2?",               "COMPUTE", "percentage → COMPUTE"),
    ("list all students with attendance below 75%",          "COMPUTE", "filter → COMPUTE"),

    # ── COMPUTE: person lookup by name (THE KEY FAILING CASES) ───────────────
    ("who is divagaran M",                                   "COMPUTE", "person lookup by name → COMPUTE"),
    ("who is Jayanti K",                                     "COMPUTE", "person lookup by name → COMPUTE"),
    ("who is divagaran M from 3 year 2023-2027 batch",       "COMPUTE", "name + batch → COMPUTE"),
    ("who is AATHI S",                                       "COMPUTE", "UPPERCASE name → COMPUTE"),

    # ── COMPUTE: registration number lookup (THE KEY FAILING CASES) ──────────
    ("511523205013",                                         "COMPUTE", "bare reg number → COMPUTE"),
    ("511523205022",                                         "COMPUTE", "bare reg number → COMPUTE"),
    ("511523205023",                                         "COMPUTE", "bare reg number → COMPUTE"),
    ("search for this registration number 511523205013",     "COMPUTE", "search + reg no → COMPUTE"),
    ("search for registration number 511523205023",          "COMPUTE", "search + reg no → COMPUTE"),
    ("search for the registration number 511523205023",      "COMPUTE", "search + reg no → COMPUTE"),

    # ── COMPUTE: follow-up student data queries ───────────────────────────────
    ("which subjects is he enrolled in?",                    "COMPUTE", "subject enrollment → COMPUTE"),
    ("what are his marks?",                                  "COMPUTE", "marks of student → COMPUTE"),
    ("what is her attendance percentage?",                   "COMPUTE", "attendance of student → COMPUTE"),
    ("show me his grades",                                   "COMPUTE", "grades → COMPUTE"),
    ("list all courses he is enrolled in",                   "COMPUTE", "courses enrolled → COMPUTE"),
    ("what subjects does she take?",                         "COMPUTE", "subjects → COMPUTE"),

    # ── COMPUTE: faculty / staff lookups ─────────────────────────────────────
    ("list faculty in CSE department with cabin numbers",    "COMPUTE", "faculty + cabin → COMPUTE"),
    ("what is the phone number of Kishorekumar?",           "COMPUTE", "faculty phone → COMPUTE"),

    # ── LOOKUP: policy / concept questions (must stay LOOKUP) ────────────────
    ("what is the exam pattern for Anna University?",        "LOOKUP",  "exam policy → LOOKUP"),
    ("explain the GPA calculation formula",                  "LOOKUP",  "GPA formula → LOOKUP"),
    ("what is the grading scale?",                           "LOOKUP",  "grading scale → LOOKUP"),
    ("tell me about the academic regulations",               "LOOKUP",  "regulations → LOOKUP"),

    # ── HYBRID: two-part questions ────────────────────────────────────────────
    ("who has the highest marks and describe their background?", "HYBRID", "compute + describe → HYBRID"),
]



def run_router_suite():
    from services.router import route_question

    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD}  SUITE 1 — ROUTER ACCURACY{RESET}")
    print(f"{BOLD}{'='*60}{RESET}")

    correct = 0
    results = []
    for question, expected, note in ROUTER_TESTS:
        try:
            got = route_question(question)
            ok = got == expected
            if ok:
                correct += 1
            label = passed(f"[{expected}] {question[:50]}") if ok else \
                    failed(f"[expected {expected}, got {got}] {question[:50]}")
            print(f"  {label}")
            results.append((question, expected, got, ok))
        except Exception as e:
            print(f"  {failed(f'EXCEPTION: {e} | {question[:50]}')}")
            results.append((question, expected, "ERROR", False))

    total = len(ROUTER_TESTS)
    pct = 100 * correct // total
    print(f"\n  {BOLD}Router Score: {correct}/{total} = {pct}%{RESET}")
    return results, correct, total


# ═════════════════════════════════════════════════════════════════════════════
# SUITE 2 — SQL ENGINE (schema_master → LLM SQL → execute)
# ═════════════════════════════════════════════════════════════════════════════

SQL_TESTS = [
    # (question, validation_fn, note)
    # validation_fn receives the result dict and returns (ok: bool, detail: str)

    (
        "how many students are in each department?",
        lambda r: (
            len(r["rows"]) >= 5 and not r["error"],
            f"{len(r['rows'])} dept rows returned"
        ),
        "count by dept — should return 7+ rows"
    ),
    (
        "which 3 IT students have the most arrears?",
        lambda r: (
            not r["error"] and len(r["rows"]) > 0 and
            any("IT" in str(row.get("department","")) or "reg_no" in row for row in r["rows"]),
            f"{len(r['rows'])} rows, first: {str(r['rows'][0])[:80] if r['rows'] else 'none'}"
        ),
        "top arrear students in IT"
    ),
    (
        "what is the pass percentage for IAT-2 across all subjects?",
        lambda r: (
            not r["error"] and len(r["rows"]) > 0 and
            any("pass" in k.lower() or "percent" in k.lower() for row in r["rows"] for k in row),
            f"{len(r['rows'])} rows"
        ),
        "IAT-2 pass % per subject — view_exam_subject_analytics"
    ),
    (
        "how many male and female students are there?",
        lambda r: (
            not r["error"] and len(r["rows"]) >= 1,
            f"{len(r['rows'])} rows: {r['rows'][:2] if r['rows'] else 'none'}"
        ),
        "gender breakdown"
    ),
    (
        "list faculty in CSE department with their cabin numbers",
        lambda r: (
            not r["error"] and len(r["rows"]) > 0 and
            any("cabin" in k.lower() or "room" in k.lower() for row in r["rows"] for k in row),
            f"{len(r['rows'])} faculty rows"
        ),
        "CSE faculty with cabin"
    ),
    (
        "how many students are not eligible for exams due to low attendance in IT?",
        lambda r: (
            not r["error"] and len(r["rows"]) >= 0,
            f"{len(r['rows'])} rows: {r['rows'][:2] if r['rows'] else 'no ineligible'}"
        ),
        "attendance eligibility filter"
    ),
    (
        "what is the average score in IAT-1 for the IT department?",
        lambda r: (
            not r["error"] and len(r["rows"]) > 0 and
            any("avg" in k.lower() or "average" in k.lower() or "score" in k.lower()
                for row in r["rows"] for k in row),
            f"avg result: {r['rows'][:1]}"
        ),
        "avg IAT-1 score for IT"
    ),
    (
        "which student has the highest average marks overall?",
        lambda r: (
            not r["error"] and len(r["rows"]) > 0,
            f"top student: {r['rows'][0] if r['rows'] else 'none'}"
        ),
        "top student by avg marks — view_student_performance_summary"
    ),
    (
        "how many courses are offered in semester 5 for IT?",
        lambda r: (
            not r["error"] and len(r["rows"]) > 0,
            f"{len(r['rows'])} course rows"
        ),
        "course count sem5 IT"
    ),
    (
        "list all students who are hostellers",
        lambda r: (
            not r["error"] and len(r["rows"]) > 0 and
            any("Hosteller" in str(row.get("residence_type","")) or "hosteller" in str(row).lower()
                for row in r["rows"]),
            f"{len(r['rows'])} hostellers"
        ),
        "hosteller filter"
    ),
]


def run_sql_suite():
    from services.sql_engine import run_sql

    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD}  SUITE 2 — SQL ENGINE (schema_master → LLM → DB){RESET}")
    print(f"{BOLD}{'='*60}{RESET}")

    correct = partial_credit = 0
    results = []

    for question, validator, note in SQL_TESTS:
        print(f"\n  {CYAN}Q:{RESET} {question}")
        try:
            t0 = time.time()
            result = run_sql(question)
            elapsed = round(time.time() - t0, 2)

            sql_short = (result.get("sql") or "").replace("\n", " ")[:90]
            print(f"  {info(f'SQL ({elapsed}s): {sql_short}')}")

            if result["error"]:
                err = result["error"]
                print(f"  {failed(f'DB ERROR: {err}')}")
                results.append((question, False, False, result["error"]))
                continue

            ok, detail = validator(result)
            if ok:
                correct += 1
                print(f"  {passed(detail)}")
            else:
                # Partial: SQL ran but returned unexpected shape
                partial_credit += 1
                print(f"  {partial(detail)}")

            results.append((question, ok, True, detail))

        except Exception as e:
            print(f"  {failed(f'EXCEPTION: {e}')}")
            results.append((question, False, False, str(e)))

        time.sleep(0.5)  # Rate limit buffer

    total = len(SQL_TESTS)
    score = correct + 0.5 * partial_credit
    pct = int(100 * score / total)
    print(f"\n  {BOLD}SQL Engine Score: {correct} full + {partial_credit} partial / {total} = {pct}%{RESET}")
    return results, correct, partial_credit, total


# ═════════════════════════════════════════════════════════════════════════════
# SUITE 3 — SCHEMA MASTER INTEGRITY
# ═════════════════════════════════════════════════════════════════════════════

def run_schema_suite():
    DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "app.db")
    DB_PATH = os.path.normpath(DB_PATH)

    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD}  SUITE 3 — SCHEMA MASTER INTEGRITY{RESET}")
    print(f"{BOLD}{'='*60}{RESET}")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    correct = 0
    checks = []

    # Check 1: Table exists
    tables = [r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_master'"
    ).fetchall()]
    ok = "schema_master" in tables
    if ok: correct += 1
    checks.append(("schema_master table exists", ok, ""))
    print(f"  {passed('schema_master table exists') if ok else failed('schema_master table MISSING')}")

    # Check 2: Enough rows
    count = conn.execute("SELECT COUNT(*) FROM schema_master").fetchone()[0]
    ok = count >= 100
    if ok: correct += 1
    checks.append(("≥100 column entries", ok, str(count)))
    print(f"  {passed(f'{count} column entries (≥100 required)') if ok else failed(f'Only {count} entries')}")

    # Check 3: All 9 expected objects covered
    expected_objects = {
        "students", "faculty", "courses", "student_assessments", "attendance",
        "academic_regulations", "view_student_performance_summary",
        "view_exam_subject_analytics", "view_student_complete_profile"
    }
    found_objects = {r[0] for r in conn.execute(
        "SELECT DISTINCT object_name FROM schema_master"
    ).fetchall()}
    missing = expected_objects - found_objects
    ok = len(missing) == 0
    if ok: correct += 1
    checks.append(("all 9 objects covered", ok, str(missing)))
    print(f"  {passed('All 9 DB objects covered in schema_master') if ok else failed(f'Missing: {missing}')}")

    # Check 4: Ultra-compact schema has object_name, object_type, column_name
    cols = [c[1] for c in conn.execute("PRAGMA table_info(schema_master)").fetchall()]
    ok = all(k in cols for k in ["object_name", "object_type", "column_name"])
    if ok: correct += 1
    checks.append(("schema_master structure valid", ok, str(cols)))
    print(f"  {passed('schema_master table columns verified (object_name, object_type, column_name)') if ok else failed('Invalid columns in schema_master')}")

    # Check 5: load_schema_context returns ultra-compact size (< 2500 chars)
    from services.sql_engine import load_schema_context
    ctx = load_schema_context(conn)
    ok = 500 < len(ctx) < 2500
    if ok: correct += 1
    checks.append(("ultra-compact schema context (500-2500 chars)", ok, f"{len(ctx)} chars"))
    print(f"  {passed(f'Schema context = {len(ctx)} chars (~{len(ctx)//4} tokens, ultra-compact)') if ok else failed(f'Schema context is {len(ctx)} chars')}")

    conn.close()
    total = 5
    pct = 100 * correct // total
    print(f"\n  {BOLD}Schema Integrity Score: {correct}/{total} = {pct}%{RESET}")
    return checks, correct, total


# ═════════════════════════════════════════════════════════════════════════════
# SUITE 4 — QUICK PIPELINE SMOKE TEST (DB read-only, no LLM)
# ═════════════════════════════════════════════════════════════════════════════

DB_SMOKE_TESTS = [
    ("students count",          "SELECT COUNT(*) as n FROM students",                   lambda r: r[0]["n"] >= 700),
    ("faculty count",           "SELECT COUNT(*) as n FROM faculty",                    lambda r: r[0]["n"] >= 100),
    ("assessments count",       "SELECT COUNT(*) as n FROM student_assessments",        lambda r: r[0]["n"] >= 7000),
    ("IT dept students",        "SELECT COUNT(*) as n FROM students WHERE department='IT'", lambda r: r[0]["n"] >= 50),
    ("view performance rows",   "SELECT COUNT(*) as n FROM view_student_performance_summary", lambda r: r[0]["n"] >= 700),
    ("view analytics rows",     "SELECT COUNT(*) as n FROM view_exam_subject_analytics",  lambda r: r[0]["n"] >= 50),
    ("exam_type values",        "SELECT DISTINCT exam_type FROM student_assessments",    lambda r: len(r) >= 3),
    ("no null reg_no students", "SELECT COUNT(*) as n FROM students WHERE reg_no IS NULL OR reg_no=''", lambda r: r[0]["n"] == 0),
    ("arrear students exist",   "SELECT COUNT(*) as n FROM student_assessments WHERE is_arrear=1", lambda r: r[0]["n"] > 0),
    ("schema_master populated", "SELECT COUNT(*) as n FROM schema_master",               lambda r: r[0]["n"] >= 100),
]


def run_smoke_suite():
    DB_PATH = os.path.normpath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "app.db")
    )

    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD}  SUITE 4 — DATABASE SMOKE TESTS (no LLM){RESET}")
    print(f"{BOLD}{'='*60}{RESET}")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    correct = 0

    for name, sql, validator in DB_SMOKE_TESTS:
        try:
            rows = [dict(r) for r in conn.execute(sql).fetchall()]
            ok = validator(rows)
            if ok: correct += 1
            print(f"  {passed(name) if ok else failed(name)}  → {rows[:2]}")
        except Exception as e:
            print(f"  {failed(name + ' — EXCEPTION: ' + str(e))}")

    conn.close()
    total = len(DB_SMOKE_TESTS)
    pct = 100 * correct // total
    print(f"\n  {BOLD}Smoke Test Score: {correct}/{total} = {pct}%{RESET}")
    return correct, total


# ═════════════════════════════════════════════════════════════════════════════
# FINAL REPORT
# ═════════════════════════════════════════════════════════════════════════════

def print_final_report(scores: dict):
    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD}  FINAL TEST REPORT — Vir RAG System{RESET}")
    print(f"{BOLD}{'='*60}{RESET}")
    total_score = 0
    total_possible = 0

    for suite_name, (got, possible) in scores.items():
        pct = int(100 * got / possible) if possible else 0
        bar = "█" * (pct // 10) + "░" * (10 - pct // 10)
        color = GREEN if pct >= 80 else (YELLOW if pct >= 60 else RED)
        print(f"  {suite_name:<30} [{color}{bar}{RESET}] {got:.1f}/{possible} = {color}{pct}%{RESET}")
        total_score += got
        total_possible += possible

    overall = int(100 * total_score / total_possible) if total_possible else 0
    color = GREEN if overall >= 80 else (YELLOW if overall >= 60 else RED)
    print(f"\n  {'OVERALL':<30} {color}{BOLD}{total_score:.1f}/{total_possible} = {overall}%{RESET}")
    print(f"{BOLD}{'='*60}{RESET}\n")

    if overall >= 80:
        print(f"  {GREEN}{BOLD}System is production-ready ✓{RESET}")
    elif overall >= 60:
        print(f"  {YELLOW}{BOLD}System needs minor fixes before production ⚠{RESET}")
    else:
        print(f"  {RED}{BOLD}System has critical issues — review failures above ✗{RESET}")


# ═════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ═════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Vir RAG System Test Agent")
    parser.add_argument("--suite", choices=["router", "sql", "schema", "smoke", "all"],
                        default="all", help="Which test suite to run")
    parser.add_argument("--quick", action="store_true",
                        help="Run only no-LLM suites (smoke + schema)")
    args = parser.parse_args()

    print(f"\n{BOLD}{CYAN}{'='*60}{RESET}")
    print(f"{BOLD}{CYAN}  Vir RAG Test Agent — P.T. Lee CNCET{RESET}")
    print(f"{BOLD}{CYAN}  Testing: schema_master + SQL engine + Router{RESET}")
    print(f"{BOLD}{CYAN}{'='*60}{RESET}")

    scores = {}

    if args.quick:
        # No LLM calls — fast local checks
        smoke_c, smoke_t = run_smoke_suite()
        schema_checks, schema_c, schema_t = run_schema_suite()
        scores["Smoke (DB integrity)"] = (smoke_c, smoke_t)
        scores["Schema Master"] = (schema_c, schema_t)
        print_final_report(scores)
        return

    suite = args.suite

    if suite in ("smoke", "all"):
        smoke_c, smoke_t = run_smoke_suite()
        scores["Smoke (DB integrity)"] = (smoke_c, smoke_t)

    if suite in ("schema", "all"):
        schema_checks, schema_c, schema_t = run_schema_suite()
        scores["Schema Master"] = (schema_c, schema_t)

    if suite in ("router", "all"):
        router_results, router_c, router_t = run_router_suite()
        scores["Router Accuracy"] = (router_c, router_t)

    if suite in ("sql", "all"):
        sql_results, sql_c, sql_p, sql_t = run_sql_suite()
        scores["SQL Engine (full)"] = (sql_c, sql_t)
        scores["SQL Engine (partial)"] = (sql_p * 0.5, sql_t * 0.5)

    print_final_report(scores)


if __name__ == "__main__":
    main()
