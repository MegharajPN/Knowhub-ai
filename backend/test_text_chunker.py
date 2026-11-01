from documents.services.pdf_extractor import extract_pdf_text
from documents.services.text_chunker import chunk_pages

pdf_path = r"C:\Users\meghr\OneDrive\Desktop\knowhub-ai\backend\media\documents\user_2\None.pdf"

# Extract PDF pages
pages = extract_pdf_text(pdf_path)

# Generate chunks
chunks = chunk_pages(
    pages,
    chunk_size=1000,
    overlap=200,
)

print("Total PDF pages:", len(pages))
print("Total generated chunks:", len(chunks))

for chunk in chunks:
    print("\n------------------------------")
    print("Chunk number:", chunk["chunk_number"])
    print("Page number:", chunk["page_number"])
    print("Content length:", len(chunk["content"]))
    print("Content preview:", chunk["content"][:200])
