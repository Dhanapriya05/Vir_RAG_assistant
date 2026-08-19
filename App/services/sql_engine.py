"""
SQL Engine — The COMPUTE branch of the RAG pipeline.

Executes natural-language questions against the unified SQLite database:
  App/data/app.db (Consolidated 5-table modular schema + views)

If a specific custom CSV filename is provided, it dynamically falls back
to querying that isolated CSV in an in-memory database.

Core Tables:
  1. students               — Student master directory (reg_no, name, dept, batch, etc.)
  2. faculty                — Faculty & staff directory (name, desig, cabin, phone, incharge)
  3. courses                — Curriculum & course catalog (course_code, title, credits, etc.)
  4. student_assessments    — Normalized internal marks & grades (IAT-1, IAT-2, Model, RA)
  5. attendance             — Normalized attendance records & exam eligibility
  6. academic_regulations   — Institutional policies, rules, grading scales, GPA formulas

Analytical Views:
  - view_student_performance_summary
  - view_exam_subject_analytics
  - view_student_complete_profile
"""

import os
import re
import glob
import sqlite3
from groq import Groq
from config import GROQ_API_KEY, GROQ_MODEL, UPLOAD_FOLDER

def _get_client():
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY environment variable is not set. Please add it to your .env file.")
    return Groq(api_key=GROQ_API_KEY)



APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(APP_DIR, "data", "app.db")

# Fixed, token-efficient schema description for the consolidated database
CONSOLIDATED_SCHEMA_TEXT = """
TABLE students (
    reg_no TEXT PRIMARY KEY,
    student_name TEXT,
    department TEXT, -- 'IT', 'CSE', 'AI&DS', 'MECH', 'ECE', 'EEE', 'CIVIL'
    batch TEXT, -- '2023-2027', '2024-2028'
    current_year INTEGER, -- 1, 2, 3, 4
    father_name TEXT,
    dob TEXT,
    gender TEXT,
    blood_group TEXT,
    aadhaar_no TEXT,
    student_phone TEXT,
    parent_phone TEXT,
    email TEXT,
    permanent_address TEXT,
    residence_type TEXT -- 'Day Scholar', 'Hosteller'
);

TABLE faculty (
    faculty_id INTEGER PRIMARY KEY AUTOINCREMENT,
    faculty_name TEXT,
    qualification TEXT,
    designation TEXT, -- 'Assistant Professor', 'Associate Professor', 'Professor', 'HoD'
    department TEXT, -- 'IT', 'MECHANICAL', 'CSE', 'AI&DS', 'S&H', 'ECE', 'EEE'
    phone_primary TEXT,
    phone_secondary TEXT,
    email TEXT,
    room_cabin_no TEXT, -- 'S12', 'S13', 'Ground Floor'
    class_incharge_role TEXT, -- 'MECH-3YEAR', 'IT-II'
    permanent_address TEXT
);

TABLE courses (
    course_code TEXT PRIMARY KEY, -- 'CS3491', 'CS3492', 'IT3401', 'MA3354'
    course_title TEXT,
    department TEXT,
    year_of_study INTEGER,
    semester INTEGER, -- 1 to 8
    regulation TEXT, -- 'R2021', 'R2025'
    category TEXT, -- 'PCC', 'ESC', 'HSMC', 'PEC', 'OEC'
    course_type TEXT, -- 'Theory', 'Practical', 'Integrated'
    lecture_hours INTEGER,
    tutorial_hours INTEGER,
    practical_hours INTEGER,
    credits REAL
);

TABLE student_assessments (
    assessment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    reg_no TEXT, -- FK -> students.reg_no
    student_name TEXT,
    department TEXT,
    academic_year TEXT, -- '2024-2025', '2025-2026'
    semester INTEGER, -- 2, 3, 4, 5, 6, 7, 8
    exam_type TEXT, -- 'IAT-1', 'IAT-2', 'MODEL_EXAM', 'END_SEM_UNIVERSITY'
    exam_date TEXT,
    course_code TEXT, -- FK -> courses.course_code
    course_title TEXT,
    score_raw TEXT, -- '86', 'AB', 'A+', 'O', 'U'
    score_numeric REAL, -- Numeric marks (e.g. 86.0; NULL for letter grades)
    grade TEXT, -- 'O', 'A+', 'A', 'B+', 'B', 'C', 'U', 'AB'
    grade_points INTEGER, -- 10, 9, 8, 7, 6, 5, 0
    is_absent INTEGER, -- 1 if absent, 0 otherwise
    is_arrear INTEGER, -- 1 if arrear/fail, 0 if passed
    max_marks REAL, -- 100.0
    source_sheet TEXT
);

TABLE attendance (
    attendance_id INTEGER PRIMARY KEY AUTOINCREMENT,
    reg_no TEXT,
    student_name TEXT,
    department TEXT,
    semester INTEGER,
    course_code TEXT,
    course_title TEXT,
    faculty_incharge TEXT,
    total_classes_conducted INTEGER,
    classes_attended INTEGER,
    classes_missed INTEGER,
    attendance_percentage REAL, -- percentage e.g. 85.5
    exam_eligibility_status TEXT, -- 'ELIGIBLE', 'CONDONATION', 'NOT_ELIGIBLE'
    tracking_period TEXT
);

TABLE academic_regulations (
    rule_id TEXT PRIMARY KEY, -- 'INST-01', 'REG-01', 'EXAM-01', 'GPA-01'
    category TEXT,
    policy_parameter TEXT,
    regulation_clause TEXT,
    exceptions_and_exemptions TEXT,
    rag_keywords TEXT
);

VIEW view_student_performance_summary (
    reg_no, student_name, department, batch,
    total_courses_evaluated, total_passed, total_arrears,
    overall_avg_marks, approx_gpa_points
);

VIEW view_exam_subject_analytics (
    academic_year, semester, department, exam_type,
    course_code, course_title, total_students_enrolled,
    total_absent, total_passed, total_failed, pass_percentage,
    highest_mark, lowest_mark, average_mark
);

VIEW view_student_complete_profile (
    reg_no, student_name, department, batch, student_phone,
    email, residence_type, overall_attendance_pct, active_arrears, avg_marks
);
"""


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _sanitize_table_name(filename: str) -> str:
    base = os.path.splitext(os.path.basename(filename))[0]
    if re.match(r"^[0-9a-fA-F]{32}_", base):
        base = base[33:]
    name = re.sub(r"[^a-zA-Z0-9_]", "_", base)
    name = re.sub(r"_+", "_", name).strip("_")
    if name and name[0].isdigit():
        name = f"t_{name}"
    return name or "data_table"


def _load_csvs_into_sqlite(csv_paths: list) -> tuple:
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    schema_parts = []

    for path in csv_paths:
        table_name = _sanitize_table_name(path)
        try:
            with open(path, newline="", encoding="utf-8-sig") as f:
                reader = csv_module.DictReader(f)
                rows = list(reader)
                if not rows:
                    continue
                columns = list(rows[0].keys())

            cols_sql = ", ".join(f'"{c}" TEXT' for c in columns)
            conn.execute(f'CREATE TABLE IF NOT EXISTS "{table_name}" ({cols_sql})')

            placeholders = ", ".join("?" for _ in columns)
            col_list = ", ".join(f'"{c}"' for c in columns)
            conn.executemany(
                f'INSERT INTO "{table_name}" ({col_list}) VALUES ({placeholders})',
                [tuple(row.get(c, "") for c in columns) for row in rows],
            )
            conn.commit()

            sample = rows[:2]
            sample_text = "\n".join(
                "  " + ", ".join(f'{c}={str(r.get(c, ""))[:35]}' for c in columns)
                for r in sample
            )
            schema_parts.append(
                f'Table: "{table_name}"\n'
                f'Columns: {", ".join(columns)}\n'
                f"Sample rows:\n{sample_text}"
            )
        except Exception as e:
            print(f"[SQLEngine] Skipping {path}: {e}")

    schema_text = "\n\n".join(schema_parts) if schema_parts else ""
    return conn, schema_text


def _extract_sql(text: str) -> str:
    code_block = re.search(r"```(?:sql)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if code_block:
        sql = code_block.group(1).strip()
    else:
        select_match = re.search(r"(SELECT\b[\s\S]+)", text, re.IGNORECASE)
        sql = select_match.group(1).strip() if select_match else text.strip()

    sql = re.sub(r";\s*$", "", sql).strip()

    lines = []
    for line in sql.split("\n"):
        stripped = line.strip()
        if stripped.startswith("--") or stripped.startswith("//") or stripped.startswith("/*"):
            continue
        if stripped:
            lines.append(line)

    return "\n".join(lines).strip()


def _generate_sql(schema_text: str, question: str) -> str:
    prompt = (
        "You are an expert SQLite query generator for college administration and student analytics.\n\n"
        "Generate a single valid SQLite SELECT query to answer the question using the schema.\n\n"
        "RULES:\n"
        "1. Output ONLY the raw SQL query. No markdown fences, no comments, no trailing semicolon.\n"
        "2. Enclose table names and column names in quotes if needed, or use clean SQL standard syntax.\n"
        "3. Case-insensitive search for names, departments or text using LIKE or LOWER(), e.g. student_name LIKE '%AATHI%' or department = 'IT'.\n"
        "4. For numeric calculations or comparisons on student_assessments, use score_numeric (for marks) or grade_points (for GPA).\n"
        "5. For arrears check, is_arrear = 1 or grade = 'U'. For absent check, is_absent = 1.\n"
        "6. Leverage analytical views (view_student_performance_summary, view_exam_subject_analytics, view_student_complete_profile) when appropriate for rapid aggregations.\n"
        "7. If the question cannot be answered from the schema, output: SELECT 'NO_DATA';\n\n"
        f"SCHEMA:\n{schema_text}\n\n"
        f"QUESTION: {question}\n\n"
        "SQL:"
    )

    try:
        resp = _get_client().chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=600,
        )
        content = resp.choices[0].message.content or ""
        sql = _extract_sql(content)
        return sql
    except Exception as e:
        raise RuntimeError(f"LLM SQL generation failed: {e}")


def _safe_execute(conn: sqlite3.Connection, sql: str) -> dict:
    first_token = sql.strip().split()[0].upper() if sql.strip() else ""
    if first_token not in ("SELECT", "WITH"):
        return {
            "sql": sql,
            "columns": [],
            "rows": [],
            "error": "Only SELECT queries are permitted.",
        }

    try:
        cursor = conn.execute(sql)
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
        return {"sql": sql, "columns": columns, "rows": rows, "error": None}
    except sqlite3.Error as e:
        return {"sql": sql, "columns": [], "rows": [], "error": str(e)}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_sql(question: str, filename: str = None) -> dict:
    """
    Execute a natural-language COMPUTE question against the SQLite database.
    """
    print("\n========== SQL ENGINE ==========")
    print(f"Question : {question}")
    print(f"Filename : {filename or 'Consolidated SQLite (app.db)'}")

    # Case A: Specific CSV filename provided (custom upload query)
    if filename and not filename.endswith(".db"):
        pattern = os.path.join(UPLOAD_FOLDER, f"*_{filename}")
        matches = glob.glob(pattern)
        if not matches:
            direct = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.exists(direct):
                matches = [direct]
        csv_paths = [m for m in matches if m.endswith(".csv")]
        
        if csv_paths:
            conn, schema_text = _load_csvs_into_sqlite(csv_paths)
            try:
                sql = _generate_sql(schema_text, question)
                result = _safe_execute(conn, sql)
            finally:
                conn.close()
            result["schema"] = schema_text
            return result

    # Case B: Primary Unified Database (app.db)
    if not os.path.exists(DB_PATH):
        # Auto-initialize if not built
        import subprocess
        print("[SQLEngine] app.db not found, building via ingest_sqlite.py...")
        subprocess.run(["python3", os.path.join(APP_DIR, "ingest_sqlite.py")], check=True)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    schema_text = CONSOLIDATED_SCHEMA_TEXT

    try:
        sql = _generate_sql(schema_text, question)
        print(f"Generated SQL: {sql}")
        result = _safe_execute(conn, sql)
    except Exception as e:
        result = {"sql": "", "columns": [], "rows": [], "error": str(e)}
    finally:
        conn.close()

    result["schema"] = schema_text
    print(f"Result rows  : {len(result.get('rows', []))}")
    print("================================\n")

    return result
