import pymupdf

def extract_pdf_text(file_path):
    """
    Extract text from a PDF page by page.

    Returns a list containing page numbers and extracted text.
    """

    extracted_pages = []

    with pymupdf.open(file_path) as pdf:
        if pdf.is_encrypted:
            raise ValueError("Password-protected PDFs are not supported.")

        if pdf.page_count == 0:
            raise ValueError("The PDF contains no pages.")

        for page_number, page in enumerate(pdf, start=1):
            text = page.get_text("text").strip()

            if text:
                extracted_pages.append({
                    "page_number": page_number,
                    "text": text,
                })

    if not extracted_pages:
        raise ValueError(
            "No readable text found. This PDF may contain scanned images."
        )

    return extracted_pages