import fitz


def extract_text(file_path: str):
    """
    Extract text page by page.
    Returns a list of dictionaries:
    [
        {
            "page": 1,
            "text": "..."
        },
        ...
    ]
    """

    document = fitz.open(file_path)

    pages = []

    for page_number, page in enumerate(document, start=1):

        text = page.get_text().strip()

        if text:

            pages.append(
                {
                    "page": page_number,
                    "text": text
                }
            )

    document.close()

    return pages