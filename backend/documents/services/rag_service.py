from documents.services.vector_search import search_documents
from documents.services.llm_service import generate_answer

def ask_documents(user, question, top_k=5):
    question = question.strip()

    if not question:
        raise ValueError("Question cannot be empty.")

    # Retrieve relevant chunks belonging only to this user.
    results = search_documents(
        user=user,
        query=question,
        top_k=top_k,
    )

    if not results:
        return {
            "answer": "I couldn't find relevant information in your uploaded documents.",
            "sources": [],
        }

    # Build context with source references.
    context_parts = []

    for index, result in enumerate(results, start=1):
        context_parts.append(
            f"""
SOURCE {index}
Document: {result['document_title']}
Page: {result['page_number']}
Content:
{result['content']}
"""
        )

    context = "\n\n".join(context_parts)

    # Generate answer using local Ollama.
    answer = generate_answer(
        question=question,
        context=context,
    )

    sources = [
        {
            "document_id": result["document_id"],
            "document_title": result["document_title"],
            "page_number": result["page_number"],
            "chunk_id": result["chunk_id"],
            "similarity": result["similarity"],
        }
        for result in results
    ]

    return {
        "answer": answer,
        "sources": sources,
    }