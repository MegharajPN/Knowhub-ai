from documents.services.vector_search import search_knowledge
from documents.services.llm_service import generate_answer

def ask_documents(user, question, top_k=5):
    question = question.strip()

    if not question:
        raise ValueError("Question cannot be empty.")

    # Retrieve relevant PDF and website chunks.
    results = search_knowledge(
        user=user,
        query=question,
        top_k=top_k,
    )

    if not results:
        return {
            "answer": (
                "I couldn't find relevant information in your "
                "uploaded documents or connected websites."
            ),
            "sources": [],
        }

    context_parts = []

    for index, result in enumerate(results, start=1):

        if result["source_type"] == "pdf":
            source_description = (
                f"PDF: {result['document_title']}\n"
                f"Page: {result['page_number']}"
            )
        else:
            source_description = (
                f"Website: {result['document_title']}\n"
                f"URL: {result['page_url']}"
            )

        context_parts.append(
            f"""
SOURCE {index}
{source_description}

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
            "source_type": result["source_type"],
            "chunk_id": result["chunk_id"],
            "document_id": result["document_id"],
            "document_title": result["document_title"],
            "page_number": result["page_number"],
            "page_url": result["page_url"],
            "web_source_id": result.get("web_source_id"),
            "similarity": result["similarity"],
        }
        for result in results
    ]

    return {
        "answer": answer,
        "sources": sources,
    }