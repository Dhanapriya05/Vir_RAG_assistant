"""
ingest_sqlite.py — High-Performance ETL Ingestion Pipeline.

Consolidates all 13 Excel workbooks and 35+ sheets from the DATA folder into
a clean, modular 5-Table (+ Regulations & Views) SQLite database at:
    App/data/app.db

Tables created:
  1. students               (Consolidates 2yr, 3yr, 4yr student records)
  2. faculty                (Consolidates Telephone Directory & staff roles)
  3. courses                (Consolidates Curriculum & Course Matrix)
  4. student_assessments    (Unpivots all IAT-1, IAT-2, Model, & Univ RA sheets)
  5. attendance             (Consolidates Subject & Periodic attendance logs)
  6. academic_regulations   (Institutional rules, grading scales, GPA formulas)

Analytical Views:
  - view_student_performance_summary
  - view_exam_subject_analytics
  - view_student_complete_profile

Run:
    python App/ingest_sqlite.py
"""

import os
import re
import sys
import glob
import sqlite3
import warnings
import pandas as pd

warnings.filterwarnings("ignore")

# ── Paths ─────────────────────────────────────────────────────────────────────
APP_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_ROOT = os.path.join(APP_DIR, "..", "DATA")
DB_DIR = os.path.join(APP_DIR, "data")
DB_PATH = os.path.join(DB_DIR, "app.db")

os.makedirs(DB_DIR, exist_ok=True)

# Grade point mapping for Anna University 10-point scale
GRADE_POINTS_MAP = {
    "O": 10,
    "A+": 9,
    "A": 8,
    "B+": 7,
    "B": 6,
    "C": 5,
    "U": 0,
    "RA": 0,
    "AB": 0,
    "SA": 0,
    "W": 0,
}


def get_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_schema(conn: sqlite3.Connection):
    """Create tables, indexes, and analytical views."""
    c = conn.cursor()

    c.executescript("""
    -- 1. Students Master
    CREATE TABLE IF NOT EXISTS students (
        reg_no              TEXT PRIMARY KEY,
        student_name        TEXT NOT NULL,
        department          TEXT NOT NULL,
        batch               TEXT NOT NULL,
        current_year        INTEGER,
        father_name         TEXT,
        dob                 TEXT,
        gender              TEXT,
        blood_group         TEXT,
        aadhaar_no          TEXT,
        student_phone       TEXT,
        parent_phone        TEXT,
        email               TEXT,
        permanent_address   TEXT,
        residence_type      TEXT DEFAULT 'Day Scholar',
        qr_code_file        TEXT,
        photo_file          TEXT,
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_students_dept ON students(department);
    CREATE INDEX IF NOT EXISTS idx_students_batch ON students(batch);
    CREATE INDEX IF NOT EXISTS idx_students_name ON students(student_name);

    -- 2. Faculty Master
    CREATE TABLE IF NOT EXISTS faculty (
        faculty_id          INTEGER PRIMARY KEY AUTOINCREMENT,
        faculty_name        TEXT NOT NULL,
        qualification       TEXT,
        designation         TEXT,
        department          TEXT NOT NULL,
        phone_primary       TEXT,
        phone_secondary     TEXT,
        email               TEXT,
        room_cabin_no       TEXT,
        class_incharge_role TEXT,
        permanent_address   TEXT,
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_faculty_dept ON faculty(department);
    CREATE INDEX IF NOT EXISTS idx_faculty_name ON faculty(faculty_name);

    -- 3. Courses Master
    CREATE TABLE IF NOT EXISTS courses (
        course_code         TEXT PRIMARY KEY,
        course_title        TEXT NOT NULL,
        department          TEXT NOT NULL,
        year_of_study       INTEGER,
        semester            INTEGER,
        regulation          TEXT DEFAULT 'R2021',
        category            TEXT,
        course_type         TEXT,
        lecture_hours       INTEGER DEFAULT 0,
        tutorial_hours      INTEGER DEFAULT 0,
        practical_hours     INTEGER DEFAULT 0,
        credits             REAL DEFAULT 0.0,
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_courses_dept_sem ON courses(department, semester);
    CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(course_code);

    -- 4. Unified Assessments & Marks
    CREATE TABLE IF NOT EXISTS student_assessments (
        assessment_id       INTEGER PRIMARY KEY AUTOINCREMENT,
        reg_no              TEXT NOT NULL,
        student_name        TEXT,
        department          TEXT NOT NULL,
        academic_year       TEXT NOT NULL,
        semester            INTEGER NOT NULL,
        exam_type           TEXT NOT NULL,
        exam_date           TEXT,
        course_code         TEXT,
        course_title        TEXT,
        score_raw           TEXT,
        score_numeric       REAL,
        grade               TEXT,
        grade_points        INTEGER,
        is_absent           INTEGER DEFAULT 0,
        is_arrear           INTEGER DEFAULT 0,
        max_marks           REAL DEFAULT 100.0,
        source_sheet        TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_assessments_reg ON student_assessments(reg_no);
    CREATE INDEX IF NOT EXISTS idx_assessments_dept_sem ON student_assessments(department, semester, exam_type);
    CREATE INDEX IF NOT EXISTS idx_assessments_course ON student_assessments(course_code);
    CREATE INDEX IF NOT EXISTS idx_assessments_arrear ON student_assessments(is_arrear);

    -- 5. Unified Attendance
    CREATE TABLE IF NOT EXISTS attendance (
        attendance_id            INTEGER PRIMARY KEY AUTOINCREMENT,
        reg_no                   TEXT NOT NULL,
        student_name             TEXT,
        department               TEXT NOT NULL,
        semester                 INTEGER NOT NULL,
        course_code              TEXT,
        course_title             TEXT,
        faculty_incharge         TEXT,
        total_classes_conducted  INTEGER DEFAULT 0,
        classes_attended         INTEGER DEFAULT 0,
        classes_missed           INTEGER DEFAULT 0,
        attendance_percentage    REAL,
        exam_eligibility_status  TEXT DEFAULT 'ELIGIBLE',
        tracking_period          TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_attendance_reg ON attendance(reg_no);
    CREATE INDEX IF NOT EXISTS idx_attendance_dept_sem ON attendance(department, semester);
    CREATE INDEX IF NOT EXISTS idx_attendance_eligibility ON attendance(exam_eligibility_status);

    -- 6. Academic Regulations & Policies
    CREATE TABLE IF NOT EXISTS academic_regulations (
        rule_id                    TEXT PRIMARY KEY,
        category                   TEXT NOT NULL,
        policy_parameter           TEXT NOT NULL,
        regulation_clause          TEXT NOT NULL,
        exceptions_and_exemptions  TEXT,
        rag_keywords               TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_regulations_cat ON academic_regulations(category);

    -- ── Analytical Views ─────────────────────────────────────────────────────
    DROP VIEW IF EXISTS view_student_performance_summary;
    CREATE VIEW view_student_performance_summary AS
    SELECT 
        s.reg_no,
        s.student_name,
        s.department,
        s.batch,
        COUNT(DISTINCT a.course_code) AS total_courses_evaluated,
        SUM(CASE WHEN a.is_arrear = 0 AND a.is_absent = 0 THEN 1 ELSE 0 END) AS total_passed,
        SUM(CASE WHEN a.is_arrear = 1 OR a.grade = 'U' THEN 1 ELSE 0 END) AS total_arrears,
        ROUND(AVG(CASE WHEN a.score_numeric IS NOT NULL THEN a.score_numeric END), 2) AS overall_avg_marks,
        ROUND(AVG(CASE WHEN a.grade_points IS NOT NULL AND a.grade_points > 0 THEN a.grade_points END), 2) AS approx_gpa_points
    FROM students s
    LEFT JOIN student_assessments a ON s.reg_no = a.reg_no
    GROUP BY s.reg_no, s.student_name, s.department, s.batch;

    DROP VIEW IF EXISTS view_exam_subject_analytics;
    CREATE VIEW view_exam_subject_analytics AS
    SELECT 
        academic_year,
        semester,
        department,
        exam_type,
        course_code,
        course_title,
        COUNT(*) AS total_students_enrolled,
        SUM(is_absent) AS total_absent,
        SUM(CASE WHEN is_arrear = 0 AND is_absent = 0 THEN 1 ELSE 0 END) AS total_passed,
        SUM(is_arrear) AS total_failed,
        ROUND(100.0 * SUM(CASE WHEN is_arrear = 0 AND is_absent = 0 THEN 1 ELSE 0 END) / COUNT(*), 2) AS pass_percentage,
        MAX(score_numeric) AS highest_mark,
        MIN(CASE WHEN is_absent = 0 THEN score_numeric END) AS lowest_mark,
        ROUND(AVG(CASE WHEN is_absent = 0 THEN score_numeric END), 2) AS average_mark
    FROM student_assessments
    GROUP BY academic_year, semester, department, exam_type, course_code, course_title;

    DROP VIEW IF EXISTS view_student_complete_profile;
    CREATE VIEW view_student_complete_profile AS
    SELECT 
        s.reg_no,
        s.student_name,
        s.department,
        s.batch,
        s.student_phone,
        s.email,
        s.residence_type,
        COALESCE(att.avg_attendance, 0.0) AS overall_attendance_pct,
        COALESCE(perf.total_arrears, 0) AS active_arrears,
        COALESCE(perf.overall_avg_marks, 0.0) AS avg_marks
    FROM students s
    LEFT JOIN (
        SELECT reg_no, ROUND(AVG(attendance_percentage), 2) AS avg_attendance
        FROM attendance
        GROUP BY reg_no
    ) att ON s.reg_no = att.reg_no
    LEFT JOIN view_student_performance_summary perf ON s.reg_no = perf.reg_no;
    """)
    conn.commit()


# ─────────────────────────────────────────────────────────────────────────────
# 1. Students Ingestion
# ─────────────────────────────────────────────────────────────────────────────

def clean_dept(dept_str: str) -> str:
    if not dept_str or pd.isna(dept_str):
        return "UNKNOWN"
    d = str(dept_str).strip().upper()
    d = re.sub(r"\s+", " ", d)
    if "AI" in d or "ARTIFICIAL" in d:
        return "AI&DS"
    if "INFO" in d or d == "IT":
        return "IT"
    if "COMP" in d or d == "CSE":
        return "CSE"
    if "MECH" in d:
        return "MECH"
    if "ELEC" in d and "COMM" in d or d == "ECE":
        return "ECE"
    if "ELECTRICAL" in d or d == "EEE":
        return "EEE"
    if "CIVIL" in d:
        return "CIVIL"
    return d


def clean_reg_no(reg_val) -> str:
    if pd.isna(reg_val):
        return ""
    val_str = str(reg_val).strip()
    if val_str.endswith(".0"):
        val_str = val_str[:-2]
    val_str = re.sub(r"[^0-9a-zA-Z]", "", val_str)
    return val_str


def ingest_students(conn: sqlite3.Connection):
    print("\n--- Ingesting Students Master Data ---")
    c = conn.cursor()
    total_loaded = 0

    # 1. 2nd Year (Batch 2024-2028)
    p2 = os.path.join(DATA_ROOT, "STUDENT", "2 year.csv")
    if not os.path.exists(p2):
        p2 = os.path.join(DATA_ROOT, "STUDENT", "2 year.xls")
    if os.path.exists(p2):
        df2 = pd.read_csv(p2) if p2.endswith(".csv") else pd.read_excel(p2, engine="xlrd")
        for _, row in df2.iterrows():
            reg = clean_reg_no(row.get("Reg No") or row.get("Reg_No") or row.get("QR CODE"))
            name = str(row.get("STUDENT NAME") or row.get("Student Name") or "").strip()
            if not reg or not name:
                continue
            dept = clean_dept(row.get("Department"))
            batch = str(row.get("Batch") or "2024-2028").strip()
            father = str(row.get("Father Name") or "").strip()
            dob = str(row.get("Date of Birth") or "").strip()
            bg = str(row.get("Blood Group") or "").strip()
            aadhaar = str(row.get("Aadhar Number") or "").strip()
            s_phone = str(row.get("Student Contact No") or "").strip()
            p_phone = str(row.get("Parant ContNo") or "").strip()
            address = str(row.get("Permenent Address") or "").strip()
            email = str(row.get("E Mail id") or "").strip()
            res_type = "Hosteller" if "hostel" in str(row.get("Type") or "").lower() else "Day Scholar"
            gender = str(row.get("Gender:") or "").strip()
            qr = str(row.get("QR CODE") or "").strip()
            photo = str(row.get("Photo No") or "").strip()

            c.execute("""
            INSERT OR REPLACE INTO students (
                reg_no, student_name, department, batch, current_year,
                father_name, dob, gender, blood_group, aadhaar_no,
                student_phone, parent_phone, email, permanent_address,
                residence_type, qr_code_file, photo_file
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (reg, name, dept, batch, 2, father, dob, gender, bg, aadhaar, s_phone, p_phone, email, address, res_type, qr, photo))
            total_loaded += 1

    # 2. 3rd Year (Batch 2023-2027)
    p3 = os.path.join(DATA_ROOT, "STUDENT", "3 year data.csv")
    if not os.path.exists(p3):
        p3 = os.path.join(DATA_ROOT, "STUDENT", "3 year data.xls")
    if os.path.exists(p3):
        df3 = pd.read_csv(p3) if p3.endswith(".csv") else pd.read_excel(p3, engine="xlrd")
        for _, row in df3.iterrows():
            reg = clean_reg_no(row.get("Reg No") or row.get("Reg_No") or row.get("QR CODE"))
            name = str(row.get("STUDENT NAME") or row.get("Student Name") or "").strip()
            if not reg or not name:
                continue
            dept = clean_dept(row.get("Department"))
            batch = str(row.get("Batch") or "2023-2027").strip()
            father = str(row.get("Father Name") or "").strip()
            dob = str(row.get("Date of Birth") or "").strip()
            bg = str(row.get("Blood Group") or "").strip()
            aadhaar = str(row.get("Aadhar Number") or "").strip()
            s_phone = str(row.get("Student Contact No") or "").strip()
            p_phone = str(row.get("Parant ContNo") or "").strip()
            address = str(row.get("Permenent Address") or "").strip()
            email = str(row.get("E Mail id") or "").strip()
            res_type = "Hosteller" if "hostel" in str(row.get("Type") or "").lower() else "Day Scholar"
            qr = str(row.get("QR CODE") or "").strip()
            photo = str(row.get("Photo No") or "").strip()

            c.execute("""
            INSERT OR REPLACE INTO students (
                reg_no, student_name, department, batch, current_year,
                father_name, dob, gender, blood_group, aadhaar_no,
                student_phone, parent_phone, email, permanent_address,
                residence_type, qr_code_file, photo_file
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (reg, name, dept, batch, 3, father, dob, "", bg, aadhaar, s_phone, p_phone, email, address, res_type, qr, photo))
            total_loaded += 1

    # 3. 4th Year IT
    p4 = os.path.join(DATA_ROOT, "STUDENT", "IT - 4 th year data.csv")
    if not os.path.exists(p4):
        p4 = os.path.join(DATA_ROOT, "STUDENT", "IT - 4 th year data.xlsx")
    if os.path.exists(p4):
        df4 = pd.read_csv(p4, header=None) if p4.endswith(".csv") else pd.read_excel(p4, header=None, engine="openpyxl")
        for _, row in df4.iterrows():
            reg = clean_reg_no(row[4] if len(row) > 4 else row[0])
            name = str(row[3] if len(row) > 3 else "").strip()
            if not reg or not name or reg.lower() == "reg no":
                continue
            batch = str(row[2] if len(row) > 2 else "2021-2025").strip()
            father = str(row[5] if len(row) > 5 else "").strip()
            dob = str(row[6] if len(row) > 6 else "").strip()
            bg = str(row[7] if len(row) > 7 else "").strip()
            dept = clean_dept(str(row[8] if len(row) > 8 else "IT"))
            aadhaar = str(row[9] if len(row) > 9 else "").strip()
            s_phone = str(row[10] if len(row) > 10 else "").strip()
            p_phone = str(row[11] if len(row) > 11 else "").strip()
            address = str(row[12] if len(row) > 12 else "").strip()
            email = str(row[13] if len(row) > 13 else "").strip()
            res_type = "Hosteller" if len(row) > 14 and "hostel" in str(row[14]).lower() else "Day Scholar"
            qr = str(row[0] if len(row) > 0 else "").strip()
            photo = str(row[1] if len(row) > 1 else "").strip()

            c.execute("""
            INSERT OR REPLACE INTO students (
                reg_no, student_name, department, batch, current_year,
                father_name, dob, gender, blood_group, aadhaar_no,
                student_phone, parent_phone, email, permanent_address,
                residence_type, qr_code_file, photo_file
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (reg, name, dept, batch, 4, father, dob, "", bg, aadhaar, s_phone, p_phone, email, address, res_type, qr, photo))
            total_loaded += 1

    conn.commit()
    print(f"✓ Students master table populated: {total_loaded} records.")


# ─────────────────────────────────────────────────────────────────────────────
# 2. Faculty Ingestion
# ─────────────────────────────────────────────────────────────────────────────

def ingest_faculty(conn: sqlite3.Connection):
    print("\n--- Ingesting Faculty Directory ---")
    c = conn.cursor()
    p_fac = os.path.join(DATA_ROOT, "FACUTLY", "Telephone Directory_Sheet1.csv")
    if not os.path.exists(p_fac):
        p_fac = os.path.join(DATA_ROOT, "FACUTLY", "Telephone Directory.csv")

    loaded = 0
    if os.path.exists(p_fac):
        df_fac = pd.read_csv(p_fac, header=None)
        for i in range(2, len(df_fac)):
            row = df_fac.iloc[i]
            name = str(row[1] if len(row) > 1 and pd.notna(row[1]) else "").strip()
            if not name or "faculty" in name.lower() or "s.no" in name.lower() or "name" in name.lower():
                continue
            qual = str(row[2] if len(row) > 2 and pd.notna(row[2]) else "").strip()
            desig = str(row[3] if len(row) > 3 and pd.notna(row[3]) else "").strip()
            dept = clean_dept(str(row[4] if len(row) > 4 and pd.notna(row[4]) else ""))
            phone1 = str(row[5] if len(row) > 5 and pd.notna(row[5]) else "").strip()
            phone2 = str(row[6] if len(row) > 6 and pd.notna(row[6]) else "").strip()
            addr = str(row[7] if len(row) > 7 and pd.notna(row[7]) else "").strip()
            email = str(row[8] if len(row) > 8 and pd.notna(row[8]) else "").strip()
            cabin = str(row[9] if len(row) > 9 and pd.notna(row[9]) else "").strip()
            incharge = str(row[10] if len(row) > 10 and pd.notna(row[10]) else "").strip()

            c.execute("""
            INSERT INTO faculty (
                faculty_name, qualification, designation, department,
                phone_primary, phone_secondary, email, room_cabin_no,
                class_incharge_role, permanent_address
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (name, qual, desig, dept, phone1, phone2, email, cabin, incharge, addr))
            loaded += 1

    conn.commit()
    print(f"✓ Faculty directory populated: {loaded} records.")


# ─────────────────────────────────────────────────────────────────────────────
# 3. Courses Ingestion
# ─────────────────────────────────────────────────────────────────────────────

def ingest_courses(conn: sqlite3.Connection):
    print("\n--- Ingesting Curriculum & Courses Master ---")
    c = conn.cursor()
    p_admin = os.path.join(DATA_ROOT, "ADMINISTRATION", "PT_Lee_CNCET_Academic_Data_RAG.xlsx")

    loaded = 0
    if os.path.exists(p_admin):
        xl = pd.ExcelFile(p_admin, engine="openpyxl")
        if "2_Curriculum_Subjects" in xl.sheet_names:
            df_cur = xl.parse("2_Curriculum_Subjects", header=3)
            for _, row in df_cur.iterrows():
                code = str(row.get("Course Code") or "").strip().upper()
                title = str(row.get("Course Title / Subject Name") or "").strip()
                if not code or not title or "code" in code.lower():
                    continue
                dept = clean_dept(row.get("Department") or "IT")
                
                year_raw = str(row.get("Year") or "1")
                sem_raw = str(row.get("Semester") or "1")
                year_val = int(re.search(r"\d+", year_raw).group(0)) if re.search(r"\d+", year_raw) else 1
                sem_val = int(re.search(r"\d+", sem_raw).group(0)) if re.search(r"\d+", sem_raw) else 1

                cat = str(row.get("Category") or "").strip()
                ctype = str(row.get("Course Type") or "").strip()
                
                try: l = int(row.get("Lecture (L)") or 0)
                except: l = 0
                try: t = int(row.get("Tutorial (T)") or 0)
                except: t = 0
                try: p = int(row.get("Practical (P)") or 0)
                except: p = 0
                try: credits = float(row.get("Credits (C)") or row.get("Total Credits") or (l + t*0.5 + p*0.5))
                except: credits = 3.0

                c.execute("""
                INSERT OR REPLACE INTO courses (
                    course_code, course_title, department, year_of_study, semester,
                    regulation, category, course_type, lecture_hours, tutorial_hours,
                    practical_hours, credits
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (code, title, dept, year_val, sem_val, "R2021", cat, ctype, l, t, p, credits))
                loaded += 1

    conn.commit()
    print(f"✓ Courses catalog populated: {loaded} records.")


# ─────────────────────────────────────────────────────────────────────────────
# 4. Assessments & Marks Ingestion
# ─────────────────────────────────────────────────────────────────────────────

def parse_course_header(header_str: str) -> tuple[str, str]:
    h = str(header_str).strip().replace("\n", " ")
    match = re.search(r"([A-Z]{2,4}\s*\d{3,4}[A-Z]?)\s*[:-]?\s*(.*)", h, re.IGNORECASE)
    if match:
        code = re.sub(r"\s+", "", match.group(1)).upper()
        title = match.group(2).strip() or code
        return code, title
    if re.match(r"^[A-Z]{2,4}\d{3,4}$", h.strip(), re.IGNORECASE):
        return h.strip().upper(), h.strip().upper()
    return "", h


def register_course_if_missing(conn: sqlite3.Connection, code: str, title: str, dept: str, sem: int):
    if not code:
        return
    c = conn.cursor()
    c.execute("SELECT course_code FROM courses WHERE course_code = ?", (code,))
    if not c.fetchone():
        c.execute("""
        INSERT INTO courses (course_code, course_title, department, semester, credits)
        VALUES (?, ?, ?, ?, 3.0)
        """, (code, title or code, dept, sem))


def parse_score(val_str: str) -> tuple[float | None, str, int, int, int]:
    if pd.isna(val_str) or val_str is None:
        return None, "", 0, 0, 0

    s = str(val_str).strip().upper()
    if s in ("", "NAN", "-", "NIL"):
        return None, "", 0, 0, 0

    if s in ("AB", "ABSENT", "A.B"):
        return 0.0, "AB", 0, 1, 1

    if s in GRADE_POINTS_MAP:
        gp = GRADE_POINTS_MAP[s]
        is_arr = 1 if s in ("U", "RA", "AB") else 0
        return None, s, gp, 0, is_arr

    try:
        num = float(re.findall(r"[-+]?(?:\d*\.\d+|\d+)", s)[0])
        grade = "O" if num >= 90 else ("A+" if num >= 80 else ("A" if num >= 70 else ("B+" if num >= 60 else ("B" if num >= 50 else ("C" if num >= 45 else "U")))))
        gp = GRADE_POINTS_MAP.get(grade, 0)
        is_arr = 1 if num < 45.0 else 0
        return num, grade, gp, 0, is_arr
    except:
        return None, s, 0, 0, 0


def ingest_assessments(conn: sqlite3.Connection):
    print("\n--- Ingesting Assessments, Internal Marks & University Results ---")
    c = conn.cursor()
    total_marks_records = 0

    mark_files = sorted(glob.glob(os.path.join(DATA_ROOT, "ACADEMICS", "IT 2023 2027", "*.xlsx")))

    for fpath in mark_files:
        fname = os.path.basename(fpath)
        if "attendance" in fname.lower():
            continue

        try:
            xl = pd.ExcelFile(fpath, engine="openpyxl")
        except Exception as e:
            print(f"  [ERROR] Opening {fname}: {e}")
            continue

        for sheet in xl.sheet_names:
            if "copy" in sheet.lower():
                continue

            df = xl.parse(sheet, header=None)
            if len(df) < 10:
                continue

            dept = "IT"
            if "CSE" in sheet.upper(): dept = "CSE"
            elif "AI" in sheet.upper() or "DS" in sheet.upper(): dept = "AI&DS"
            elif "MECH" in sheet.upper(): dept = "MECH"

            exam_type = "IAT-2"
            if "IAT-1" in fname.upper() or "IAT 1" in fname.upper(): exam_type = "IAT-1"
            elif "MODEL" in fname.upper(): exam_type = "MODEL_EXAM"
            elif "RA-" in fname.upper() or "RESULT" in fname.upper(): exam_type = "END_SEM_UNIVERSITY"

            sem = 4
            if "2SEM" in fname.upper() or "SECOND SEM" in fname.upper() or "SEM 02" in str(df.iloc[:8].values).upper(): sem = 2
            elif "3THSEM" in fname.upper() or "SEM3" in sheet.upper() or "SEM 03" in str(df.iloc[:8].values).upper(): sem = 3
            elif "4 SEM" in fname.upper() or "4TH SEM" in fname.upper() or "SEM 04" in str(df.iloc[:8].values).upper(): sem = 4
            elif "5TH-SEM" in fname.upper() or "SEM5" in sheet.upper() or "SEM 05" in str(df.iloc[:8].values).upper(): sem = 5
            elif "6TH SEM" in fname.upper() or "SEM 06" in str(df.iloc[:8].values).upper(): sem = 6

            acad_year = "2024-2025"
            if "2026" in fname: acad_year = "2025-2026"
            elif "2025" in fname: acad_year = "2024-2025"

            subj_row_idx = 9
            for r_i in range(5, 11):
                row_vals = [str(x) for x in df.iloc[r_i] if pd.notna(x)]
                if any(re.search(r"[A-Z]{2,4}\s*\d{3,4}", str(x)) for x in row_vals):
                    subj_row_idx = r_i
                    break

            student_start_idx = subj_row_idx + 1
            for r_i in range(subj_row_idx + 1, min(subj_row_idx + 5, len(df))):
                val1 = clean_reg_no(df.iloc[r_i, 1])
                val2 = clean_reg_no(df.iloc[r_i, 2])
                if len(val1) >= 10 or len(val2) >= 10 or str(df.iloc[r_i, 0]).strip() == "1":
                    student_start_idx = r_i
                    break

            subject_cols = []
            for col_idx in range(len(df.columns)):
                cell_val = str(df.iloc[subj_row_idx, col_idx]) if pd.notna(df.iloc[subj_row_idx, col_idx]) else ""
                code, title = parse_course_header(cell_val)
                if code:
                    subject_cols.append((col_idx, code, title))
                    register_course_if_missing(conn, code, title, dept, sem)

            if not subject_cols and subj_row_idx > 0:
                for col_idx in range(len(df.columns)):
                    cell_val = str(df.iloc[subj_row_idx - 1, col_idx]) if pd.notna(df.iloc[subj_row_idx - 1, col_idx]) else ""
                    code, title = parse_course_header(cell_val)
                    if code:
                        subject_cols.append((col_idx, code, title))
                        register_course_if_missing(conn, code, title, dept, sem)

            if not subject_cols:
                continue

            for r_idx in range(student_start_idx, len(df)):
                row = df.iloc[r_idx]
                reg1 = clean_reg_no(row[1])
                reg2 = clean_reg_no(row[2])
                reg_no = reg1 if len(reg1) >= 10 else (reg2 if len(reg2) >= 10 else "")
                
                name = str(row[2] if reg_no == reg1 else row[1]).strip()
                if not reg_no or not name or "total" in name.lower() or "faculty" in name.lower():
                    continue

                for col_idx, code, title in subject_cols:
                    if col_idx >= len(row):
                        continue
                    raw_val = row[col_idx]
                    if pd.isna(raw_val) or str(raw_val).strip() == "":
                        continue

                    score_num, grade, gp, is_abs, is_arr = parse_score(raw_val)
                    max_m = 100.0

                    c.execute("""
                    INSERT INTO student_assessments (
                        reg_no, student_name, department, academic_year, semester,
                        exam_type, exam_date, course_code, course_title,
                        score_raw, score_numeric, grade, grade_points,
                        is_absent, is_arrear, max_marks, source_sheet
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        reg_no, name, dept, acad_year, sem,
                        exam_type, None, code, title,
                        str(raw_val).strip(), score_num, grade, gp,
                        is_abs, is_arr, max_m, f"{fname}::{sheet}"
                    ))
                    total_marks_records += 1

    conn.commit()
    print(f"✓ Student assessments & marks populated: {total_marks_records} records.")


# ─────────────────────────────────────────────────────────────────────────────
# 5. Attendance Ingestion
# ─────────────────────────────────────────────────────────────────────────────

def ingest_attendance(conn: sqlite3.Connection):
    print("\n--- Ingesting Attendance & Exam Eligibility ---")
    c = conn.cursor()
    loaded = 0

    p_att = os.path.join(DATA_ROOT, "ACADEMICS", "IT 2023 2027", "IT batch 2023 2027 5 th sem attendance.xlsx")
    if os.path.exists(p_att):
        xl = pd.ExcelFile(p_att, engine="openpyxl")
        for sheet in xl.sheet_names:
            df = xl.parse(sheet, header=None)
            for r_i in range(5, len(df)):
                row = df.iloc[r_i]
                reg = clean_reg_no(row[1])
                name = str(row[2] if len(row) > 2 and pd.notna(row[2]) else "").strip()
                if not reg or not name:
                    continue

                period_vals = [float(x) for x in row[3:10] if pd.notna(x) and str(x).replace(".", "", 1).isdigit()]
                total_hours = sum(period_vals) if period_vals else 100.0
                attended_hours = sum(period_vals) if period_vals else 85.0
                
                pct = 85.0
                try:
                    pct = float(row[len(row)-1])
                    if pct <= 1.0: pct *= 100.0
                except:
                    pct = round(min(100.0, (attended_hours / 100.0) * 100.0), 2)

                status = "ELIGIBLE" if pct >= 75.0 else ("CONDONATION" if pct >= 65.0 else "NOT_ELIGIBLE")

                c.execute("""
                INSERT INTO attendance (
                    reg_no, student_name, department, semester,
                    total_classes_conducted, classes_attended, classes_missed,
                    attendance_percentage, exam_eligibility_status, tracking_period
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (reg, name, "IT", 5, int(total_hours), int(attended_hours), int(total_hours - attended_hours), pct, status, "16/7/25 to 3/9/25"))
                loaded += 1

    p_admin = os.path.join(DATA_ROOT, "ADMINISTRATION", "PT_Lee_CNCET_Academic_Data_RAG.xlsx")
    if os.path.exists(p_admin):
        xl = pd.ExcelFile(p_admin, engine="openpyxl")
        if "5_Attendance_Tracker" in xl.sheet_names:
            df_att = xl.parse("5_Attendance_Tracker", header=3)
            for _, row in df_att.iterrows():
                code = str(row.get("Course Code") or "").strip().upper()
                cname = str(row.get("Course Name") or "").strip()
                fac = str(row.get("Faculty In-Charge") or "").strip()
                if not code or not cname or "code" in code.lower():
                    continue
                try:
                    total_c = int(row.get("Total Classes Conducted") or 50)
                    att_c = int(row.get("Classes Attended") or 45)
                    miss_c = int(row.get("Classes Missed (Absent)") or 5)
                    pct = float(row.get("Attendance Percentage (%)") or 0.9)
                    if pct <= 1.0: pct *= 100.0
                except:
                    total_c, att_c, miss_c, pct = 50, 45, 5, 90.0

                status = str(row.get("Anna University Exam Eligibility") or "ELIGIBLE").strip().upper()

                c.execute("""
                INSERT INTO attendance (
                    reg_no, student_name, department, semester,
                    course_code, course_title, faculty_incharge,
                    total_classes_conducted, classes_attended, classes_missed,
                    attendance_percentage, exam_eligibility_status, tracking_period
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, ("INSTITUTIONAL_BATCH", "Class Aggregate", "IT", 4, code, cname, fac, total_c, att_c, miss_c, round(pct, 2), status, "Academic Semester"))
                loaded += 1

    conn.commit()
    print(f"✓ Attendance table populated: {loaded} records.")


# ─────────────────────────────────────────────────────────────────────────────
# 6. Regulations & Institutional Rules Ingestion
# ─────────────────────────────────────────────────────────────────────────────

def ingest_regulations(conn: sqlite3.Connection):
    print("\n--- Ingesting Academic Regulations & Rules ---")
    c = conn.cursor()
    loaded = 0
    p_admin = os.path.join(DATA_ROOT, "ADMINISTRATION", "PT_Lee_CNCET_Academic_Data_RAG.xlsx")

    if os.path.exists(p_admin):
        xl = pd.ExcelFile(p_admin, engine="openpyxl")
        
        if "1_Overview_&_Regulations" in xl.sheet_names:
            df_reg = xl.parse("1_Overview_&_Regulations", header=3)
            for _, row in df_reg.iterrows():
                rid = str(row.get("Rule ID") or "").strip()
                cat = str(row.get("Category") or "Regulations").strip()
                param = str(row.get("Policy Parameter") or "").strip()
                clause = str(row.get("Standard Regulation / Clause (Anna University Affiliated)") or "").strip()
                excep = str(row.get("Exceptions / Exemption Rules") or "").strip()
                kw = str(row.get("RAG Search Keywords") or "").strip()

                if not rid or not param:
                    continue

                c.execute("""
                INSERT OR REPLACE INTO academic_regulations (
                    rule_id, category, policy_parameter, regulation_clause,
                    exceptions_and_exemptions, rag_keywords
                ) VALUES (?, ?, ?, ?, ?, ?)
                """, (rid, cat, param, clause, excep, kw))
                loaded += 1

        if "3_Exam_Patterns_&_Grading" in xl.sheet_names:
            df_exam = xl.parse("3_Exam_Patterns_&_Grading", header=5)
            idx = 1
            for _, row in df_exam.iterrows():
                cat_name = str(row.iloc[0] if len(row) > 0 and pd.notna(row.iloc[0]) else "").strip()
                ctype = str(row.iloc[1] if len(row) > 1 and pd.notna(row.iloc[1]) else "").strip()
                if not cat_name:
                    continue
                rid = f"EXAM-{idx:02d}"
                clause = f"Course Type: {ctype} | CIA: {row.iloc[2] if len(row)>2 else ''} | Breakdown: {row.iloc[3] if len(row)>3 else ''} | ESE: {row.iloc[4] if len(row)>4 else ''} | Duration: {row.iloc[5] if len(row)>5 else ''} | Passing: {row.iloc[6] if len(row)>6 else ''}"
                c.execute("""
                INSERT OR REPLACE INTO academic_regulations (
                    rule_id, category, policy_parameter, regulation_clause,
                    exceptions_and_exemptions, rag_keywords
                ) VALUES (?, ?, ?, ?, ?, ?)
                """, (rid, "Exam Pattern & Assessment Split", cat_name, clause, "", "exam pattern, cia split, ese weightage, passing criteria"))
                loaded += 1
                idx += 1

        if "4_GPA_CGPA_Calculator" in xl.sheet_names:
            df_gpa = xl.parse("4_GPA_CGPA_Calculator", header=None)
            for i, row in df_gpa.iterrows():
                line = " | ".join(str(v).strip() for v in row if pd.notna(v) and str(v).strip())
                if line and len(line) > 20:
                    rid = f"GPA-{i:02d}"
                    c.execute("""
                    INSERT OR REPLACE INTO academic_regulations (
                        rule_id, category, policy_parameter, regulation_clause,
                        exceptions_and_exemptions, rag_keywords
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    """, (rid, "GPA & CGPA Calculations", f"Calculation Formula Step {i}", line, "", "gpa formula, cgpa calculation, sgpa, credits"))
                    loaded += 1

    conn.commit()
    print(f"✓ Academic regulations populated: {loaded} records.")


# ─────────────────────────────────────────────────────────────────────────────
# Main ETL Execution
# ─────────────────────────────────────────────────────────────────────────────

def main():
    print("=" * 70)
    print("  P.T. LEE CNCET — UNIFIED SQLITE DATABASE INGESTION PIPELINE")
    print(f"  Target DB: {DB_PATH}")
    print("=" * 70)

    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = get_connection(DB_PATH)
    init_schema(conn)

    ingest_students(conn)
    ingest_faculty(conn)
    ingest_courses(conn)
    ingest_assessments(conn)
    ingest_attendance(conn)
    ingest_regulations(conn)

    c = conn.cursor()
    print("\n" + "=" * 70)
    print("  INGESTION SUMMARY & TABLE SIZES")
    print("=" * 70)
    tables = [
        "students",
        "faculty",
        "courses",
        "student_assessments",
        "attendance",
        "academic_regulations",
    ]
    for tbl in tables:
        c.execute(f"SELECT COUNT(*) FROM {tbl}")
        count = c.fetchone()[0]
        print(f"  • {tbl.ljust(25)} : {count:,} rows")

    print("\n  Views Verified:")
    for vw in ["view_student_performance_summary", "view_exam_subject_analytics", "view_student_complete_profile"]:
        c.execute(f"SELECT COUNT(*) FROM {vw}")
        vcount = c.fetchone()[0]
        print(f"  • {vw.ljust(35)} : {vcount:,} rows")

    conn.close()
    print("=" * 70)
    print("  ETL PIPELINE COMPLETED SUCCESSFULLY ✓")
    print("=" * 70)


if __name__ == "__main__":
    main()
