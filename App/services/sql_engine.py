"""
SQL Engine — The COMPUTE branch of the RAG pipeline.

Executes natural-language questions against uploaded CSV files by:
  1. Scanning the uploads folder for CSV files matching the query intent.
  2. Loading relevant CSVs into an in-memory SQLite database
     (one table per file with clean, predictable table names).
  3. Asking the Groq LLM to generate a SQL SELECT query given the schema.
  4. Running the query and returning a structured result dict.

Design notes:
  - SQLite is used in-memory so there is no persistent disk state to manage.
  - Only SELECT statements are allowed; any other statement raises an error.
  - Smart CSV selection limits loaded tables to the 2-4 most relevant files,
    keeping schema prompts compact and preventing LLM token limit / TPM overflow.
  - If no CSV is uploaded, the engine returns a clear "no tabular data" message.

Usage:
    from services.sql_engine import run_sql
    result = run_sql("What is the average attendance?", filename=None)
    # result = {"sql": "SELECT ...", "rows": [...], "columns": [...], "error": None}
"""

import os
import re
import glob
import sqlite3
import csv as csv_module

from groq import Groq
from config import GROQ_API_KEY, GROQ_MODEL, UPLOAD_FOLDER

_client = Groq(api_key=GROQ_API_KEY)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _sanitize_table_name(filename: str) -> str:
    """
    Turn a CSV filename into a clean, valid SQLite table name.
    Preserves meaningful prefixes (e.g. 'student_2yr', 'attendance_5sem')
    while stripping 32-character hex UUID upload prefixes if present.
    """
    base = os.path.splitext(os.path.basename(filename))[0]
    
    # Strip 32-char hex UUID hash prefix if present (e.g. "0ff39695b7574b18adf874a796132dcb_courses_test")
    if re.match(r"^[0-9a-fA-F]{32}_", base):
        base = base[33:]
        
    name = re.sub(r"[^a-zA-Z0-9_]", "_", base)
    name = re.sub(r"_+", "_", name).strip("_")
    
    # Table names starting with digit get prefixed with 't_' for SQLite safety
    if name and name[0].isdigit():
        name = f"t_{name}"
        
    return name or "data_table"


def _rank_csvs_by_question(question: str, csv_paths: list, top_n: int = 3) -> list:
    """
    Rank and filter CSV files by relevance to the question.
    Keeps schema concise and avoids feeding 30+ tables into the prompt.
    """
    q_lower = question.lower()
    q_tokens = set(re.findall(r"[a-zA-Z0-9]+", q_lower))

    # Domain keyword expansions
    expansions = {
        "2": ["2", "2yr", "2nd", "second", "student_2yr"],
        "2yr": ["2", "2yr", "2nd", "second", "student_2yr"],
        "3": ["3", "3yr", "3rd", "third", "student_3yr"],
        "3yr": ["3", "3yr", "3rd", "third", "student_3yr"],
        "4": ["4", "4yr", "4th", "fourth", "student_4yr"],
        "4yr": ["4", "4yr", "4th", "fourth", "student_4yr"],
        "student": ["student", "students", "student_2yr", "student_3yr", "student_4yr", "batch", "reg"],
        "attendance": ["attendance", "attend", "absent", "present", "atten_percent", "atten"],
        "marks": ["marks", "mark", "iat", "grade", "result", "ra", "model", "exam"],
        "grade": ["grade", "grades", "marks", "pass", "fail", "result", "ra"],
        "result": ["result", "results", "ra", "grade", "pass", "fail"],
        "faculty": ["faculty", "staff", "telephone", "teacher"],
        "curriculum": ["curriculum", "subject", "courses", "regulation", "credit"],
        "course": ["course", "courses", "subject", "curriculum"],
    }

    expanded_tokens = set(q_tokens)
    for t in q_tokens:
        if t in expansions:
            expanded_tokens.update(expansions[t])

    scored = []
    for path in csv_paths:
        base = os.path.basename(path).lower()
        score = 0
        for token in expanded_tokens:
            if len(token) > 1 and token in base:
                score += len(token) * 3
        scored.append((score, path))

    scored.sort(key=lambda x: x[0], reverse=True)
    best = [p for s, p in scored if s > 0][:top_n]
    
    if not best:
        best = csv_paths[:top_n]
        
    return best


def _find_csv_paths(filename: str = None, question: str = "") -> list:
    """
    Return a list of CSV file paths from the uploads folder.
    If filename is given, return that specific file.
    If filename is None, return the most relevant CSVs for the question.
    """
    if filename:
        pattern = os.path.join(UPLOAD_FOLDER, f"*_{filename}")
        matches = glob.glob(pattern)
        if not matches:
            direct = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.exists(direct):
                matches = [direct]
        found = [m for m in matches if m.endswith(".csv")]
        if found:
            return found

    all_csvs = glob.glob(os.path.join(UPLOAD_FOLDER, "*.csv"))
    if not all_csvs:
        return []
        
    if question:
        return _rank_csvs_by_question(question, all_csvs, top_n=3)

    return all_csvs[:3]


def _load_csvs_into_sqlite(csv_paths: list) -> tuple:
    """
    Load a list of CSV file paths into an in-memory SQLite connection.

    Returns:
        (conn, schema_text)
        conn        — sqlite3.Connection with all tables loaded
        schema_text — human-readable schema for the LLM prompt
    """
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

            # Build CREATE TABLE
            cols_sql = ", ".join(f'"{c}" TEXT' for c in columns)
            conn.execute(f'CREATE TABLE IF NOT EXISTS "{table_name}" ({cols_sql})')

            # Insert rows
            placeholders = ", ".join("?" for _ in columns)
            col_list = ", ".join(f'"{c}"' for c in columns)
            conn.executemany(
                f'INSERT INTO "{table_name}" ({col_list}) VALUES ({placeholders})',
                [tuple(row.get(c, "") for c in columns) for row in rows],
            )
            conn.commit()

            # Build schema description for the LLM (sample first 2 rows)
            sample = rows[:2]
            sample_text = "\n".join(
                "  " + ", ".join(
                    f'{c}={str(r.get(c, ""))[:35]}' for c in columns
                )
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

    # Hard cap on schema text size to guarantee no 413 token overflow
    MAX_SCHEMA_CHARS = 2500
    if len(schema_text) > MAX_SCHEMA_CHARS:
        schema_text = schema_text[:MAX_SCHEMA_CHARS] + "\n...(truncated)"

    return conn, schema_text


def _extract_sql(text: str) -> str:
    """Extract clean SQL SELECT statement from model response."""
    # Check for markdown code block
    code_block = re.search(r"```(?:sql)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if code_block:
        sql = code_block.group(1).strip()
    else:
        select_match = re.search(r"(SELECT\b[\s\S]+)", text, re.IGNORECASE)
        sql = select_match.group(1).strip() if select_match else text.strip()

    # Remove trailing semicolon
    sql = re.sub(r";\s*$", "", sql).strip()

    # Filter comment lines
    lines = []
    for line in sql.split("\n"):
        stripped = line.strip()
        if stripped.startswith("--") or stripped.startswith("//") or stripped.startswith("/*"):
            continue
        if stripped:
            lines.append(line)

    return "\n".join(lines).strip()


def _generate_sql(schema_text: str, question: str) -> str:
    """
    Ask the LLM to produce a single valid SQLite SELECT query.
    Returns the raw SQL string.
    """
    prompt = (
        "You are an expert SQLite query generator.\n\n"
        "Generate a single valid SQLite SELECT query to answer the question using ONLY the provided tables.\n\n"
        "RULES:\n"
        "1. Output ONLY the raw SQL query. No explanations, no markdown fences, no trailing semicolon.\n"
        "2. Enclose all table names and column names in double quotes, e.g. \"student_2yr_ALL_FILES_COMBINED\".\"STUDENT_NAME\".\n"
        "3. For numeric calculations or comparisons, wrap the column with CAST(col AS REAL).\n"
        "4. For string matching with names or text, use LIKE with wildcards or LOWER(col) = LOWER('value'), e.g. \"STUDENT_NAME\" LIKE '%ABARNA%'.\n"
        "5. For counting rows or records in a specific year/category table (e.g. total students in student_2yr or student_3yr), use COUNT(*) without adding unnecessary WHERE conditions on Batch unless a specific year string like '2024-2028' is given.\n"
        "6. If the question cannot be answered from the schema, output: SELECT 'NO_DATA';\n\n"
        f"SCHEMA:\n{schema_text}\n\n"
        f"QUESTION: {question}\n\n"
        "SQL:"
    )


    try:
        resp = _client.chat.completions.create(
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
    """
    Execute a SQL query safely (SELECT only).
    Returns {"sql": sql, "columns": [...], "rows": [...], "error": None|str}
    """
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
    Execute a natural-language COMPUTE question against uploaded CSV data.

    Args:
        question: The user's question (e.g. "average attendance in IT?").
        filename: Optional — restrict to a specific CSV filename.
                  If None, the most relevant CSVs are automatically selected.

    Returns a dict:
        {
            "sql":     str   — the generated SQL query,
            "columns": list  — column names in the result,
            "rows":    list  — list of row dicts,
            "error":   str|None — error message if something went wrong,
            "schema":  str   — schema description provided to the LLM,
        }
    """
    print("\n========== SQL ENGINE ==========")
    print(f"Question : {question}")
    print(f"Filename : {filename or 'auto-select relevant CSVs'}")

    # Step 1 — Find relevant CSV files
    csv_paths = _find_csv_paths(filename=filename, question=question)

    if not csv_paths:
        return {
            "sql": "",
            "columns": [],
            "rows": [],
            "error": "No matching CSV files found in uploads.",
            "schema": "",
        }

    print(f"CSVs loaded : {[os.path.basename(p) for p in csv_paths]}")

    # Step 2 — Load into in-memory SQLite
    conn, schema_text = _load_csvs_into_sqlite(csv_paths)

    if not schema_text:
        conn.close()
        return {
            "sql": "",
            "columns": [],
            "rows": [],
            "error": "CSV files were found but appear to be empty or unreadable.",
            "schema": "",
        }

    # Step 3 — Generate SQL via LLM
    try:
        sql = _generate_sql(schema_text, question)
    except RuntimeError as e:
        conn.close()
        return {"sql": "", "columns": [], "rows": [], "error": str(e), "schema": schema_text}

    print(f"Generated SQL: {sql}")

    # Step 4 — Execute query safely
    result = _safe_execute(conn, sql)
    conn.close()

    result["schema"] = schema_text

    print(f"Result rows  : {len(result['rows'])}")
    print("================================\n")

    return result
