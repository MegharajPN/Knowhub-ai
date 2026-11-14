import faiss
import numpy as np

from documents.models import DocumentChunk, WebPageChunk
from documents.services.embedding_service import generate_embeddings

DIMENSIONS = 384

def _search_faiss(query, records, top_k):
    """
    Search mixed PDF and website chunks using one FAISS index.
    """

    if not records:
        return []

    vectors = np.asarray(
        [record["embedding"] for record in records],
        dtype=np.float32,
    )

    if vectors.ndim != 2 or vectors.shape[1] != DIMENSIONS:
        raise ValueError("Stored embeddings must have 384 dimensions.")

    if not np.isfinite(vectors).all():
        raise ValueError("Stored embeddings contain invalid values.")

    index = faiss.IndexFlatIP(DIMENSIONS)
    index.add(vectors)

    query_vector = generate_embeddings([query]).astype(np.float32)

    result_count = min(top_k, len(records))
    scores, positions = index.search(query_vector, result_count)

    results = []

    for score, position in zip(scores[0], positions[0]):
        if position < 0:
            continue

        result = records[int(position)]["metadata"].copy()
        result["similarity"] = round(float(score), 4)

        results.append(result)

    return results


def search_knowledge(user, query, top_k=5):
    """
    Search the current user's PDF documents and crawled websites.
    """

    query = query.strip()

    if not query:
        return []

    records = []

    # 1. Collect PDF chunks belonging to this user.
    pdf_chunks = DocumentChunk.objects.filter(
        document__uploaded_by=user,
        embedding__isnull=False,
    ).select_related("document")

    for chunk in pdf_chunks:
        records.append({
            "embedding": chunk.embedding,
            "metadata": {
                "source_type": "pdf",
                "chunk_id": chunk.id,
                "document_id": chunk.document_id,
                "document_title": chunk.document.title,
                "page_number": chunk.page_number,
                "page_url": None,
                "content": chunk.content,
            },
        })

    # 2. Collect website chunks belonging to this user.
    web_chunks = WebPageChunk.objects.filter(
        page__source__user=user,
        embedding__isnull=False,
    ).select_related("page", "page__source")

    for chunk in web_chunks:
        records.append({
            "embedding": chunk.embedding,
            "metadata": {
                "source_type": "website",
                "chunk_id": chunk.id,
                "document_id": None,
                "document_title": (
                    chunk.page.title
                    or chunk.page.source.title
                    or chunk.page.url
                ),
                "page_number": None,
                "page_url": chunk.page.url,
                "web_source_id": chunk.page.source_id,
                "content": chunk.content,
            },
        })

    # 3. Search both sources together.
    return _search_faiss(query, records, top_k)


def search_documents(user, query, top_k=5):
    """
    Backward-compatible PDF-only search.
    """

    query = query.strip()

    if not query:
        return []

    chunks = list(
        DocumentChunk.objects.filter(
            document__uploaded_by=user,
            embedding__isnull=False,
        ).select_related("document")
    )

    records = []

    for chunk in chunks:
        records.append({
            "embedding": chunk.embedding,
            "metadata": {
                "chunk_id": chunk.id,
                "document_id": chunk.document_id,
                "document_title": chunk.document.title,
                "page_number": chunk.page_number,
                "content": chunk.content,
            },
        })

    return _search_faiss(query, records, top_k)