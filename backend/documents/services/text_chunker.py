
def chunk_text(text, chunk_size=1000, overlap=200):
    """
    Split text into overlapping chunks.

    Returns a list of text chunks.
    """

    if chunk_size <= 0:
        raise ValueError("Chunk size must be greater than zero.")

    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("Overlap must be smaller than chunk size.")

    chunks = []
    start = 0

    while start < len(text):
        end = min(start + chunk_size, len(text))

        # Prefer ending at a word boundary.
        if end < len(text):
            boundary = text.rfind(" ", start, end)

            if boundary > start:
                end = boundary

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= len(text):
            break

        start = end - overlap

    return chunks


def chunk_pages(extracted_pages, chunk_size=1000, overlap=200):
    """
    Chunk extracted PDF pages while preserving page numbers.
    """

    all_chunks = []
    chunk_id = 1

    for page in extracted_pages:
        page_chunks = chunk_text(
            page["text"],
            chunk_size=chunk_size,
            overlap=overlap,
        )

        for content in page_chunks:
            all_chunks.append({
                "chunk_number": chunk_id,
                "page_number": page["page_number"],
                "content": content,
            })

            chunk_id += 1

    return all_chunks