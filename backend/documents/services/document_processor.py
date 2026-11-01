from django.db import transaction

from documents.models import DocumentChunk
from documents.services.pdf_extractor import extract_pdf_text
from documents.services.text_chunker import chunk_pages
from documents.services.embedding_service import generate_embeddings


def process_document(document):
    document.status = "processing"
    document.save(update_fields=["status", "updated_at"])

    try:
        pages = extract_pdf_text(document.file.path)

        chunks = chunk_pages(
            pages,
            chunk_size=1000,
            overlap=200,
        )

        if not chunks:
            raise ValueError("No text chunks were generated.")

        texts = [chunk["content"] for chunk in chunks]

        # Generate normalized 384-dimensional embeddings.
        embeddings = generate_embeddings(texts)

        with transaction.atomic():
            DocumentChunk.objects.filter(
                document=document
            ).delete()

            chunk_objects = []

            for chunk, embedding in zip(chunks, embeddings):
                chunk_objects.append(
                    DocumentChunk(
                        document=document,
                        chunk_number=chunk["chunk_number"],
                        page_number=chunk["page_number"],
                        content=chunk["content"],
                        embedding=embedding.tolist(),
                    )
                )

            DocumentChunk.objects.bulk_create(chunk_objects)

            document.status = "completed"
            document.save(
                update_fields=["status", "updated_at"]
            )

        return {
            "status": "completed",
            "pages": len(pages),
            "chunks": len(chunks),
            "embeddings": len(embeddings),
            "dimensions": int(embeddings.shape[1]),
        }

    except Exception:
        document.status = "failed"
        document.save(update_fields=["status", "updated_at"])
        raise