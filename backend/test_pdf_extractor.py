from documents.services.pdf_extractor import extract_pdf_text

# Replace this with the actual path to an uploaded PDF.
pdf_path = r"C:\Users\meghr\OneDrive\Desktop\knowhub-ai\backend\media\documents\user_2\None.pdf"

pages = extract_pdf_text(pdf_path)

print("Total extracted pages:", len(pages))

for page in pages:
    print("\nPage:", page["page_number"])
    print("Text preview:", page["text"][:300])