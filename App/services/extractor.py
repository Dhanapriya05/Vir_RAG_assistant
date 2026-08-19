import os
import pymupdf
import pandas as pd
from docx import Document


def extract_text(file_path: str):
    """
    Extract text page by page or section by section across supported file types
    (PDF, DOCX, TXT, CSV, XLSX, XLS).
    Returns a list of dictionaries:
    [
        {
            "page": 1,
            "text": "..."
        },
        ...
    ]
    """
    ext = os.path.splitext(file_path)[1].lower().lstrip(".")
    pages = []

    if ext == "pdf":
        document = pymupdf.open(file_path)
        for page_number, page in enumerate(document, start=1):
            text = page.get_text().strip()
            if text:
                pages.append({"page": page_number, "text": text})
        document.close()

    elif ext == "docx":
        doc = Document(file_path)
        full_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
        if full_text.strip():
            pages.append({"page": 1, "text": full_text.strip()})

    elif ext in ("xlsx", "xls"):
        try:
            excel_file = pd.ExcelFile(file_path)
            for sheet_idx, sheet_name in enumerate(excel_file.sheet_names, start=1):
                df = pd.read_excel(excel_file, sheet_name=sheet_name)
                # Clean and convert sheet to structured text
                df_clean = df.dropna(how="all")
                sheet_text = f"=== Sheet: {sheet_name} ===\n" + df_clean.to_string(index=False)
                if sheet_text.strip():
                    pages.append({"page": sheet_idx, "text": sheet_text.strip()})
        except Exception as e:
            print(f"Error reading Excel file {file_path}: {e}")
            try:
                df = pd.read_excel(file_path)
                sheet_text = df.to_string(index=False)
                if sheet_text.strip():
                    pages.append({"page": 1, "text": sheet_text.strip()})
            except Exception as ex:
                print(f"Fallback Excel read failed: {ex}")

    elif ext == "csv":
        try:
            df = pd.read_csv(file_path)
            csv_text = df.to_string(index=False)
        except Exception:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                csv_text = f.read()
        if csv_text.strip():
            pages.append({"page": 1, "text": csv_text.strip()})

    elif ext in ("txt", ""):
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read().strip()
        if text:
            pages.append({"page": 1, "text": text})

    return pages