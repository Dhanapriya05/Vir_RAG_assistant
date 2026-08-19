"""
SQL Engine — The COMPUTE branch of the RAG pipeline.

Executes natural-language questions against the unified SQLite database:
  App/data/app.db (Consolidated 5-table modular schema + views)

Flow:
  1. load_schema_context()  — queries schema_master table to build a precise,
                              human-readable schema string for the LLM
  2. _generate_sql()        — sends schema + question to Groq LLM, gets SQL back
  3. _safe_execute()        — runs the SQL on app.db, returns rows

If a specific custom CSV filename is provided (legacy uploads), it falls back
to loading that CSV into an in-memory SQLite for isolated querying.
"""

import os
import re
import glob
import sqlite3
import csv as csv_module

from groq import Groq
from config import GROQ_API_KEY, GROQ_MODEL, UPLOAD_FOLDER


def _get_client():
    if not GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY environment variable is not set. Please add it to your .env file."
        )
    return Groq(api_key=GROQ_API_KEY)


APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(APP_DIR, "data", "app.db")


# ---------------------------------------------------------------------------
# Schema Master Loader — replaces hardcoded CONSOLIDATED_SCHEMA_TEXT
# ---------------------------------------------------------------------------

def load_schema_context(conn: sqlite3.Connection, question: str = "") -> str:
    """
    Query schema_master and build a COMPACT, token-efficient schema string.

    Format per column:  column_name TYPE [PK/FK] -- enum hint
    Target output: ~2500 chars (fits comfortably in Groq context window).
    """
    try:
        c = conn.cursor()
        objects = c.execute("""
            SELECT DISTINCT object_name, object_type
            FROM schema_master
            ORDER BY object_type DESC, object_name
        """).fetchall()

        if not objects:
            return _introspect_schema(conn)

        parts = []
        for obj_name, obj_type in objects:
            cols = c.execute("""
                SELECT column_name, column_type, is_primary_key, is_foreign_key,
                       fk_references, sample_values
                FROM schema_master
                WHERE object_name = ?
                ORDER BY id
            """, (obj_name,)).fetchall()

            header = f"{'TABLE' if obj_type == 'table' else 'VIEW'} {obj_name} ("
            col_lines = []
            for col_name, col_type, is_pk, is_fk, fk_ref, samples in cols:
                flags = []
                if is_pk:
                    flags.append("PK")
                if is_fk and fk_ref:
                    flags.append(f"FK→{fk_ref}")
                flag_str = f"[{', '.join(flags)}] " if flags else ""
                hint = f"  -- e.g. {samples}" if samples and len(samples) < 60 else ""
                col_lines.append(f"    {col_name} {col_type} {flag_str}{hint}".rstrip())

            parts.append(header + "\n" + "\n".join(col_lines) + "\n);")

        return "\n\n".join(parts)

    except Exception as e:
        print(f"[SQLEngine] schema_master query failed ({e}), falling back to introspection")
        return _introspect_schema(conn)


def _introspect_schema(conn: sqlite3.Connection) -> str:
    """
    Fallback: build schema from sqlite_master + PRAGMA table_info.
    Used when schema_master is unavailable (first-time setup, etc.).
    """
    c = conn.cursor()
    objects = c.execute("""
        SELECT name, type FROM sqlite_master
        WHERE type IN ('table', 'view')
          AND name NOT IN ('sqlite_sequence', 'schema_master')
        ORDER BY type DESC, name
    """).fetchall()

    parts = []
    for name, obj_type in objects:
        cols = c.execute(f"PRAGMA table_info({name})").fetchall()
        col_lines = [
            f"    {col[1]} {col[2]}{'  -- PK' if col[5] else ''}"
            for col in cols
        ]
        header = f"{'TABLE' if obj_type == 'table' else 'VIEW'} {name} ("
        parts.append(header + "\n" + "\n".join(col_lines) + "\n);")

    return "\n\n".join(parts)


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
                f'TABLE "{table_name}" (\n'
                + "\n".join(f"    {c} TEXT" for c in columns)
                + f"\n);\n-- Sample rows:\n{sample_text}"
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
    """
    Send schema (fetched live from schema_master) + user question to the LLM.
    Returns a clean SQLite SELECT query.
    """
    prompt = (
        "You are an expert SQLite query generator for a college administration system.\n\n"
        "The schema below was fetched from a schema_master catalog table. "
        "Every column has a description and sample values to help you write accurate SQL.\n\n"
        "RULES:\n"
        "1. Output ONLY the raw SQL query. No markdown, no comments, no trailing semicolon.\n"
        "2. Use column names EXACTLY as listed in the schema.\n"
        "3. For name/text searches use LIKE with % wildcards or LOWER(), e.g. "
        "   LOWER(student_name) LIKE LOWER('%aathi%').\n"
        "4. For numeric comparisons on marks use score_numeric; for GPA use grade_points.\n"
        "5. is_arrear=1 means failed/arrear; is_absent=1 means absent.\n"
        "6. Prefer analytical views (view_student_performance_summary, "
        "   view_exam_subject_analytics, view_student_complete_profile) over "
        "   raw table JOINs when they already contain the needed aggregation.\n"
        "7. If the question cannot be answered from the schema, output exactly: SELECT 'NO_DATA'\n\n"
        f"DATABASE SCHEMA:\n{schema_text}\n\n"
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
        return _extract_sql(content)
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

    Flow:
      1. Open app.db
      2. Call load_schema_context() — queries schema_master for live schema
      3. Call _generate_sql(schema, question) — LLM writes the query
      4. Call _safe_execute(conn, sql) — runs query, returns rows
      5. Close connection

    Falls back to isolated in-memory CSV mode if filename is provided.
    """
    print("\n========== SQL ENGINE ==========")
    print(f"Question : {question}")
    print(f"Filename : {filename or 'Consolidated SQLite (app.db)'}")

    # ── Case A: Custom CSV filename provided (legacy upload mode) ─────────────
    if filename and not filename.endswith(".db"):
        pattern = os.path.join(UPLOAD_FOLDER, f"*_{filename}")
        matches = glob.glob(pattern)
        if not matches:
            direct = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.exists(direct):
                matches = [direct]
        csv_paths = [m for m in matches if m.endswith(".csv")]

        if csv_paths:
            csv_conn, schema_text = _load_csvs_into_sqlite(csv_paths)
            try:
                sql = _generate_sql(schema_text, question)
                print(f"Generated SQL (CSV mode): {sql}")
                result = _safe_execute(csv_conn, sql)
            except Exception as e:
                result = {"sql": "", "columns": [], "rows": [], "error": str(e)}
            finally:
                csv_conn.close()
            result["schema"] = schema_text
            print(f"Result rows  : {len(result.get('rows', []))}")
            print("================================\n")
            return result

    # ── Case B: Primary Unified Database (app.db) ─────────────────────────────
    if not os.path.exists(DB_PATH):
        import subprocess
        print("[SQLEngine] app.db not found, building via ingest_sqlite.py...")
        subprocess.run(
            ["python3", os.path.join(APP_DIR, "ingest_sqlite.py")], check=True
        )

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        # Step 1: Load schema context from schema_master (live DB query)
        schema_text = load_schema_context(conn, question)
        print(f"[SQLEngine] Schema context loaded ({len(schema_text)} chars)")

        # Step 2: Generate SQL via LLM
        sql = _generate_sql(schema_text, question)
        print(f"Generated SQL: {sql}")

        # Step 3: Execute the query
        result = _safe_execute(conn, sql)

    except Exception as e:
        result = {"sql": "", "columns": [], "rows": [], "error": str(e)}
    finally:
        conn.close()

    result["schema"] = schema_text
    print(f"Result rows  : {len(result.get('rows', []))}")
    print("================================\n")

    return result
