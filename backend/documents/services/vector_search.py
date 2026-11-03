import faiss
import numpy as np

from documents.models import DocumentChunk
from documents.services.embedding_service import generate_embeddings


def search_documents(user, query, top_k=5):
    """
    Search only the current user's document chunks.

    Embeddings are normalized, so FAISS inner product gives
    cosine similarity.
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

    if not chunks:
        return []

    # Convert stored embeddings into a NumPy matrix.
    vectors = np.array(
        [chunk.embedding for chunk in chunks],
        dtype=np.float32,
    )

    if vectors.ndim != 2 or vectors.shape[1] != 384:
        raise ValueError("Stored embeddings must have 384 dimensions.")

    # Build a FAISS index for this user's documents.
    index = faiss.IndexFlatIP(384)
    index.add(vectors)

    # Generate an embedding for the search query.
    query_vector = generate_embeddings([query]).astype(np.float32)

    # Search for the most relevant chunks.
    result_count = min(top_k, len(chunks))
    scores, positions = index.search(query_vector, result_count)

    results = []

    for score, position in zip(scores[0], positions[0]):
        if position < 0:
            continue

        chunk = chunks[int(position)]

        results.append({
            "chunk_id": chunk.id,
            "document_id": chunk.document_id,
            "document_title": chunk.document.title,
            "page_number": chunk.page_number,
            "content": chunk.content,
            "similarity": round(float(score), 4),
        })

    return results