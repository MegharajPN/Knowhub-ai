from django.contrib.auth import get_user_model
from documents.services.vector_search import search_documents

User = get_user_model()

user = User.objects.first()

if user:
    results = search_documents(
        user=user,
        query="What are the technical skills and work experience?",
        top_k=5,
    )

    for result in results:
        print("\nDocument:", result["document_title"])
        print("Page:", result["page_number"])
        print("Similarity:", result["similarity"])
        print("Content:", result["content"][:300])
else:
    print("No user found. Register and upload a PDF first.")