from django.db import transaction

from documents.models import WebPageChunk
from documents.services.text_chunker import chunk_text
from documents.services.embedding_service import generate_embeddings

def process_web_page(page):
    """
    Generate chunks and embeddings for one crawled webpage.
    Existing chunks are replaced only after new embeddings
    have been generated successfully.
    """

    if not page.content or not page.content.strip():
        with transaction.atomic():
            WebPageChunk.objects.filter(page=page).delete()

        return 0

    # Step 1: Split webpage content into overlapping chunks.
    chunks = chunk_text(
        page.content,
        chunk_size=1000,
        overlap=200,
    )

    if not chunks:
        return 0

    # Step 2: Generate embeddings.
    embeddings = generate_embeddings(chunks)

    if len(embeddings) != len(chunks):
        raise ValueError("Embedding count does not match chunk count.")

    # Step 3: Prepare database records.
    chunk_objects = []

    for index, (content, embedding) in enumerate(
        zip(chunks, embeddings)
    ):
        chunk_objects.append(
            WebPageChunk(
                page=page,
                chunk_number=index + 1,
                content=content,
                embedding=embedding.tolist(),
            )
        )

    # Step 4: Replace old chunks safely.
    with transaction.atomic():
        WebPageChunk.objects.filter(page=page).delete()

        WebPageChunk.objects.bulk_create(chunk_objects)

    return len(chunk_objects)


def process_web_source(source):
    """
    Process all webpages belonging to a website source.
    """

    pages = source.pages.all()

    total_chunks = 0
    processed_pages = 0

    for page in pages:
        chunk_count = process_web_page(page)

        total_chunks += chunk_count
        processed_pages += 1

    return {
        "processed_pages": processed_pages,
        "total_chunks": total_chunks,
    }