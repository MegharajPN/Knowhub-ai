from documents.services.embedding_service import generate_embeddings
from documents.services.pdf_extractor import extract_pdf_text
from documents.services.text_chunker import chunk_pages

# texts = [
#     "Laravel is a PHP framework.",
#     "Django is a Python web framework.",
#     "Machine learning enables computers to learn from data.",
# ]
pdf_path = r"C:\Users\meghr\OneDrive\Desktop\knowhub-ai\backend\media\documents\user_2\None.pdf"

# Extract PDF pages
pages = extract_pdf_text(pdf_path)

# Generate chunks
chunks = chunk_pages(
    pages,
    chunk_size=1000,
    overlap=200,
)

texts = [chunk["content"] for chunk in chunks]

embeddings = generate_embeddings(texts)

print("Number of embeddings:", len(embeddings))
print("Vector dimensions:", embeddings.shape)

for index, embedding in enumerate(embeddings):
    print(f"\nText {index + 1}: {texts[index]}")
    print("Vector sample:", embedding[:5])