# 05 — PDF Document Processing

Files inspected:

- `backend/documents/serializers.py`
- `backend/documents/views.py`
- `backend/documents/models.py`
- `backend/documents/services/document_processor.py`
- `backend/documents/services/pdf_extractor.py`
- `backend/documents/services/text_chunker.py`
- `backend/documents/services/embedding_service.py`

---

## 1. Complete upload lifecycle

```text
1. User selects/drops a PDF in Documents.jsx
2. Frontend checks extension and 20 MB limit
3. documentService.uploadDocument() builds FormData and POSTs to /api/documents/
4. api.js removes Content-Type so the browser sets multipart boundary
5. DocumentListCreateView uses MultiPartParser/FormParser
6. DocumentSerializer validates extension, size, and %PDF- signature
7. serializer.save(uploaded_by=request.user) creates Document row
8. process_document(document) runs synchronously
9. status becomes "processing"
10. PyMuPDF extracts text per page
11. chunk_pages() creates 1,000-char chunks with 200-char overlap
12. generate_embeddings() creates normalized 384-d vectors
13. transaction.atomic() deletes old chunks, bulk-creates new chunks, sets "completed"
14. View returns HTTP 201 with document + processing summary
```

---

## 2. Django receives the multipart request

`DocumentListCreateView` declares:

```python
parser_classes = [MultiPartParser, FormParser]
```

Axios interceptor in `frontend/src/services/api.js` removes the default JSON `Content-Type` for `FormData`, allowing the browser to set:

```text
Content-Type: multipart/form-data; boundary=...
```

---

## 3. Serializer validation

`DocumentSerializer.validate_file()` performs three checks:

```python
extension = os.path.splitext(uploaded_file.name)[1].lower()

if extension != ".pdf":
    raise serializers.ValidationError("Only PDF documents are allowed.")

if uploaded_file.size > 20 * 1024 * 1024:
    raise serializers.ValidationError("PDF size cannot exceed 20 MB.")

signature = uploaded_file.read(5)
uploaded_file.seek(0)

if signature != b"%PDF-":
    raise serializers.ValidationError("The uploaded file is not a valid PDF.")
```

Important details:

- extension check is case-insensitive because of `.lower()`;
- size check is 20 MB;
- signature check reads 5 bytes then resets the file pointer;
- `file` is `write_only`, so the stored path is not returned in API responses.

`settings.py` also sets `DATA_UPLOAD_MAX_MEMORY_SIZE` and `FILE_UPLOAD_MAX_MEMORY_SIZE` to 20 MB.

`DocumentSerializer.create()` derives the title from the filename:

```python
validated_data["title"] = os.path.splitext(uploaded_file.name)[0]
validated_data["file_size"] = uploaded_file.size
```

---

## 4. Document record and file path

`document_upload_path()`:

```python
def document_upload_path(instance, filename):
    extension = os.path.splitext(filename)[1].lower()
    return f"documents/user_{instance.uploaded_by_id}/{instance.id}{extension}"
```

Result: files are stored under `MEDIA_ROOT/documents/user_<id>/<document_id>.pdf`.

`MEDIA_ROOT = BASE_DIR / "media"` in settings.

No URL route serves media files in `config/urls.py`, so uploaded file paths are not directly downloadable through the API.

---

## 5. Text extraction

`extract_pdf_text(file_path)`:

```python
with pymupdf.open(file_path) as pdf:
    if pdf.is_encrypted:
        raise ValueError("Password-protected PDFs are not supported.")

    if pdf.page_count == 0:
        raise ValueError("The PDF contains no pages.")

    for page_number, page in enumerate(pdf, start=1):
        text = page.get_text("text").strip()

        if text:
            extracted_pages.append({
                "page_number": page_number,
                "text": text,
            })
```

Output example:

```python
[
    {"page_number": 1, "text": "Employee Handbook..."},
    {"page_number": 2, "text": "Leave policy..."}
]
```

If every page is empty:

```python
raise ValueError("No readable text found. This PDF may contain scanned images.")
```

OCR is **NOT IMPLEMENTED**.

---

## 6. Chunking and page metadata

`chunk_pages()` calls `chunk_text(page["text"], chunk_size=1000, overlap=200)` for each page. It assigns a global `chunk_number` across the whole document and copies the source `page_number`.

Example:

```python
{
    "chunk_number": 7,
    "page_number": 3,
    "content": "Employees are entitled to..."
}
```

This is why a search result can show both document title and page number.

---

## 7. Embedding and database write

`process_document()`:

```python
texts = [chunk["content"] for chunk in chunks]
embeddings = generate_embeddings(texts)

with transaction.atomic():
    DocumentChunk.objects.filter(document=document).delete()

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
    document.save(update_fields=["status", "updated_at"])
```

Why the transaction?

- deleting old chunks and inserting new ones should be all-or-nothing;
- a failed bulk insert cannot leave half-indexed content;
- status becomes `completed` only after chunks are written.

---

## 8. Exact models and relationships

### `Document`

| Field | Type | Purpose |
|---|---|---|
| `id` | BigAutoField | Primary key |
| `uploaded_by` | FK to User, `CASCADE`, `related_name="documents"` | Owner |
| `title` | CharField(255) | Filename without extension |
| `file` | FileField with `document_upload_path` | Stored PDF |
| `file_size` | PositiveBigIntegerField | Bytes |
| `status` | CharField choices | `uploaded`, `processing`, `completed`, `failed` |
| `created_at` | DateTimeField(auto_now_add) | Creation time |
| `updated_at` | DateTimeField(auto_now) | Last change |

Meta: `ordering = ["-created_at"]`.

### `DocumentChunk`

| Field | Type | Purpose |
|---|---|---|
| `id` | BigAutoField | Primary key |
| `document` | FK to Document, `CASCADE`, `related_name="chunks"` | Parent document |
| `chunk_number` | PositiveIntegerField | Global chunk order |
| `page_number` | PositiveIntegerField | Source page for citation |
| `content` | TextField | Searchable text |
| `embedding` | JSONField(null=True, blank=True) | 384-number vector |
| `created_at` | DateTimeField(auto_now_add) | Creation time |

Constraints/indexes:

- `UniqueConstraint(fields=["document", "chunk_number"], name="unique_document_chunk")`
- `Index(fields=["document", "page_number"], name="document_page_idx")`
- `ordering = ["chunk_number"]`

Relationship: `User 1 → N Document 1 → N DocumentChunk`.

---

## 9. Response behavior

Success:

```json
{
  "message": "Document uploaded and processed successfully.",
  "document": {
    "id": 12,
    "title": "handbook",
    "file_size": 123456,
    "status": "completed",
    "created_at": "..."
  },
  "processing": {
    "status": "completed",
    "pages": 8,
    "chunks": 31,
    "embeddings": 31,
    "dimensions": 384
  }
}
```

Failure during processing:

```json
{
  "message": "Document uploaded, but processing failed.",
  "document": { "...": "..." },
  "error": "PDF processing failed. Check the backend logs."
}
```

The failure response is still **HTTP 201** because the Document record was created successfully. This is a real implementation detail worth mentioning in interviews.

---

## 10. What happens in specific failure cases?

### PDF extraction fails

- `extract_pdf_text()` raises `ValueError`.
- `process_document()` sets `document.status = "failed"` and re-raises.
- `DocumentListCreateView` catches the exception and returns HTTP 201 with the generic failure message.
- No chunks are created for that attempt.
- The uploaded file remains on disk.
- No database rollback of the Document occurs because processing happens after `serializer.save()`.

### PDF contains no extractable text

Same path as above. The specific extractor error is:

```text
No readable text found. This PDF may contain scanned images.
```

The API does not expose this exact message; it returns the generic message.

### Embedding generation fails

- Failure happens before `transaction.atomic()`.
- Status becomes `failed`.
- No chunk rows are written.
- View returns HTTP 201 generic failure response.

### User uploads the same PDF again

Verified behavior:

- no duplicate check exists;
- a new `Document` row is created;
- the new document gets a new ID and a distinct file path;
- title is derived again from the filename;
- a new set of chunks is created;
- old document and chunks remain.

Deduplication is **NOT IMPLEMENTED**.

### Document is deleted

`DocumentDetailView.perform_destroy()`:

```python
if instance.file:
    instance.file.delete(save=False)

instance.delete()
```

- file is removed from storage;
- document row is deleted;
- `DocumentChunk` rows are deleted by `CASCADE`;
- FAISS index needs no update because it is rebuilt from MySQL on each search.

### User tries accessing another user's document

List and detail views use:

```python
Document.objects.filter(uploaded_by=self.request.user)
```

For detail/delete, a foreign ID is outside the queryset, so DRF returns 404. Chunk search also filters by `document__uploaded_by=user`.

Automated tests proving this isolation are **NOT IMPLEMENTED**.

---

## 11. Interview Q&A

### Q1. Why is file validation done in both frontend and backend?

**Spoken:** “The frontend improves user experience; the backend is the real security boundary.”

**Detail:** The frontend checks extension/size in `Documents.jsx`; the serializer checks extension, size, and signature.

**Source:** `Documents.jsx`, `serializers.py`.

**Follow-up:** Is the signature check enough? No; malware scanning and stronger parsing are needed.

---

### Q2. Why read the first five bytes?

**Spoken:** “To check the PDF magic header `%PDF-` instead of trusting only the extension.”

**Detail:** `uploaded_file.read(5)` then `seek(0)` restores the pointer for saving.

**Source:** `serializers.py`.

**Follow-up:** Can the header be forged? Yes.

---

### Q3. Why use `transaction.atomic()` around chunk writes?

**Spoken:** “To avoid half-indexed documents.”

**Detail:** Old chunks are deleted, new chunks bulk-created, and status updated in one transaction.

**Source:** `document_processor.py`.

**Follow-up:** Should extraction also be in the transaction? Not necessarily; long file processing inside a DB transaction can hold locks.

---

### Q4. How are page numbers preserved?

**Spoken:** “The extractor returns page-numbered blocks, and the chunker copies that number into every chunk.”

**Detail:** `chunk_pages()` builds dictionaries with `page_number`.

**Source:** `pdf_extractor.py`, `text_chunker.py`.

**Follow-up:** How does the frontend show it? Chat source cards show `Page n`.

---

### Q5. What is the status lifecycle?

**Spoken:** “The model starts as uploaded, becomes processing, then completed or failed.”

**Detail:** `STATUS_CHOICES` in `Document`; the service writes transitions.

**Source:** `models.py`, `document_processor.py`.

**Follow-up:** Is there a retry endpoint? No.

---

### Q6. Why does the response say 201 even when processing fails?

**Spoken:** “Because record creation succeeded; processing failure is reported in the body.”

**Detail:** The view catches all exceptions after `serializer.save()` and returns 201.

**Source:** `views.py`.

**Follow-up:** Would I change that in production? Yes, probably return 202 for queued processing and expose a status endpoint.
