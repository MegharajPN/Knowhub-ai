# 15 — Interview Questions and Answers

112 questions grouped into 22 categories. Each answer has a short spoken version, a technical explanation, a project example, a source reference, and a likely follow-up.

Source paths are relative to the repository root unless stated otherwise.

---

## 1. Project explanation

### Q1. What is KnowHub AI?

- **Spoken answer:** “It is a local full-stack RAG knowledge assistant over PDFs and websites with semantic search, grounded answers, citations, and chat history.”
- **Detailed explanation:** React frontend, Django REST Framework API, MySQL storage, Sentence Transformers embeddings, FAISS retrieval, and local Ollama/Qwen generation.
- **Project example:** User uploads a PDF, asks a question, and gets an answer with a PDF page citation.
- **Source reference:** `README.md`, `backend/config/urls.py`, `frontend/src/App.jsx`.
- **Likely follow-up:** Is it deployed? No; local portfolio project.

### Q2. Why did you build it?

- **Spoken answer:** “To demonstrate the complete RAG loop end to end, not just call a chat API.”
- **Detailed explanation:** README positions it as an educational/portfolio project showing full-stack AI integration and local inference.
- **Project example:** Both ingestion and generation pipelines are implemented in the repository.
- **Source reference:** `README.md` Overview and “What This Project Demonstrates”.
- **Likely follow-up:** Was it built for a customer? No customer deployment is documented.

### Q3. Who are the users?

- **Spoken answer:** “Individual knowledge workers or developers using a private workspace of documents and websites.”
- **Detailed explanation:** Implemented support is per-user documents, web sources, search, and conversations.
- **Project example:** Each queryset filters by `request.user`.
- **Source reference:** `documents/views.py`, `web_views.py`, `conversations/views.py`.
- **Likely follow-up:** Are there roles? No RBAC is implemented.

### Q4. What makes it different from a chatbot?

- **Spoken answer:** “It retrieves from user-owned content and returns sources; a normal chatbot relies mainly on training data.”
- **Detailed explanation:** RAG retrieval happens before generation.
- **Project example:** `ask_documents()` calls `search_knowledge()` before `generate_answer()`.
- **Source reference:** `backend/documents/services/rag_service.py`.
- **Likely follow-up:** Does it guarantee correct answers? No.

### Q5. What is the architecture in one minute?

- **Spoken answer:** “React calls Django REST APIs; Django stores data in MySQL; ingestion creates chunks and embeddings; FAISS retrieves; Ollama generates; sources return to React.”
- **Detailed explanation:** Two ingestion paths converge on one vector search pipeline.
- **Project example:** PDF and website chunks both enter `search_knowledge()`.
- **Source reference:** `01_SYSTEM_ARCHITECTURE.md`, `backend/documents/services/vector_search.py`.
- **Likely follow-up:** Draw the diagram. See `01_SYSTEM_ARCHITECTURE.md`.

---

## 2. Python

### Q6. Which Python concepts are used here?

- **Spoken answer:** “Generators/loops for extraction, NumPy arrays, decorators implicitly through Django/DRF, context managers, exceptions, and module-level singletons.”
- **Detailed explanation:** `with pymupdf.open(...)`, `with transaction.atomic()`, `global _model`, and NumPy array validation.
- **Project example:** `get_embedding_model()` uses a global cached model.
- **Source reference:** `pdf_extractor.py`, `embedding_service.py`, `document_processor.py`.
- **Likely follow-up:** Why a global singleton? Avoid reloading model weights.

### Q7. Why use NumPy?

- **Spoken answer:** “FAISS expects numeric arrays, and NumPy makes shape/type validation easy.”
- **Detailed explanation:** Code builds `np.asarray(..., dtype=np.float32)` and checks `ndim`/`shape`.
- **Project example:** `_search_faiss()` validates `N x 384`.
- **Source reference:** `vector_search.py`.
- **Likely follow-up:** Why float32? FAISS CPU commonly uses float32 and it saves memory.

### Q8. How are exceptions handled?

- **Spoken answer:** “Services raise `ValueError` or `CrawlerError`; views catch broad exceptions and return generic responses.”
- **Detailed explanation:** `process_document()` re-raises after marking status failed; `DocumentAskView` catches `Exception`.
- **Project example:** Ollama failure becomes HTTP 500.
- **Source reference:** `document_processor.py`, `documents/views.py`, `web_crawler.py`.
- **Likely follow-up:** Is broad catching ideal? No; log specific failures.

### Q9. What is a context manager?

- **Spoken answer:** “A construct that sets up and cleans up resources automatically, using `with`.”
- **Detailed explanation:** PyMuPDF document and Django transaction both use context managers.
- **Project example:** `with pymupdf.open(file_path) as pdf:` closes the file.
- **Source reference:** `pdf_extractor.py`, `document_processor.py`.
- **Likely follow-up:** What happens on exception inside `transaction.atomic()`? Rollback.

### Q10. Why separate modules?

- **Spoken answer:** “Each module has one responsibility: extract, chunk, embed, search, generate, or crawl.”
- **Detailed explanation:** Views orchestrate; services contain domain logic.
- **Project example:** Both ask endpoints reuse `rag_service.ask_documents()`.
- **Source reference:** `backend/documents/services/`.
- **Likely follow-up:** How would you test them? Unit tests with mock model/LLM calls.

---

## 3. Django

### Q11. Describe the Django project structure.

- **Spoken answer:** “The `config` package has settings, URLs, WSGI, and ASGI; apps are accounts, documents, and conversations.”
- **Detailed explanation:** `manage.py` sets `DJANGO_SETTINGS_MODULE=config.settings`.
- **Project example:** `config/urls.py` includes three API URLconfs.
- **Source reference:** `backend/config/`, `backend/manage.py`.
- **Likely follow-up:** What is the unused `backend/apps/accounts/`? Duplicate, not installed.

### Q12. What is the ORM used for?

- **Spoken answer:** “To create, filter, join, and delete records without writing raw SQL.”
- **Detailed explanation:** Querysets with `filter`, `select_related`, `prefetch_related`, `bulk_create`, and `update_or_create`.
- **Project example:** `search_knowledge()` loads chunks with owner filters.
- **Source reference:** `vector_search.py`, `web_views.py`.
- **Likely follow-up:** What is `select_related`? SQL join for FK.

### Q13. How does authentication work in Django?

- **Spoken answer:** “Django's auth User model is used; DRF authenticates via JWT and sets `request.user`.”
- **Detailed explanation:** No custom user model; `accounts` only has serializers/views/URLs.
- **Project example:** `create_user()` hashes passwords.
- **Source reference:** `backend/accounts/serializers.py`, `settings.py`.
- **Likely follow-up:** Why use `settings.AUTH_USER_MODEL`? Best practice for FKs.

### Q14. What are migrations here?

- **Spoken answer:** “Generated schema files that create documents, chunks, web sources, pages, conversations, and messages.”
- **Detailed explanation:** Four document migrations and one conversation migration exist.
- **Project example:** `0003_documentchunk_embedding.py` adds JSON embedding.
- **Source reference:** `documents/migrations/`, `conversations/migrations/`.
- **Likely follow-up:** Were migrations run here? No.

### Q15. Is this production-ready Django settings?

- **Spoken answer:** “No. Debug is true, secret is hardcoded, hosts are empty, and CORS is localhost-only.”
- **Detailed explanation:** These are development defaults.
- **Project example:** `settings.py` lines 24–30 and CORS list.
- **Source reference:** `backend/config/settings.py`.
- **Likely follow-up:** What would you change first? Secret/env, Debug, hosts, HTTPS.

---

## 4. Django REST Framework

### Q16. Why DRF?

- **Spoken answer:** “It gives serializers, permissions, parsers, views, and JSON responses on top of Django.”
- **Detailed explanation:** Generic views handle CRUD; APIView handles custom actions.
- **Project example:** `DocumentListCreateView` extends `ListCreateAPIView`.
- **Source reference:** `documents/views.py`.
- **Likely follow-up:** Why APIView for ask/search? Custom action semantics.

### Q17. What do serializers do here?

- **Spoken answer:** “They validate input and control output fields.”
- **Detailed explanation:** PDF checks, query limits, registration uniqueness, web URL/page limits.
- **Project example:** `DocumentSerializer.validate_file()`.
- **Source reference:** `documents/serializers.py`, `accounts/serializers.py`.
- **Likely follow-up:** Why `write_only` file? Avoid exposing storage path.

### Q18. What are permissions?

- **Spoken answer:** “Global default is IsAuthenticated; register and login allow anonymous users.”
- **Detailed explanation:** DRF evaluates authentication then permission.
- **Project example:** `RegisterView.permission_classes = [AllowAny]`.
- **Source reference:** `settings.py`, `accounts/views.py`.
- **Likely follow-up:** What status for anonymous? 401 with JWT auth.

### Q19. How does a request reach a view?

- **Spoken answer:** “Root URLconf includes app URLconf, which maps path to `as_view()`.”
- **Detailed explanation:** DRF dispatches by HTTP method to `get`, `post`, `delete`, etc.
- **Project example:** `/api/documents/ask/` → `DocumentAskView.post`.
- **Source reference:** `config/urls.py`, `documents/urls.py`.
- **Likely follow-up:** What parser handles PDF upload? `MultiPartParser`.

### Q20. How are errors returned?

- **Spoken answer:** “Serializer errors return 400; service failures are caught and mostly return generic 500 or 201 messages.”
- **Detailed explanation:** Inconsistent error envelope is a known limitation.
- **Project example:** Processing failure returns 201 with `message`.
- **Source reference:** `documents/views.py`, `web_views.py`.
- **Likely follow-up:** How improve? Consistent error middleware/logging.

---

## 5. React

### Q21. What does App.jsx do?

- **Spoken answer:** “It defines routes and wraps private pages inside DashboardLayout.”
- **Detailed explanation:** Public login/register; nested layout routes.
- **Project example:** `/chat` renders `Chat`.
- **Source reference:** `frontend/src/App.jsx`.
- **Likely follow-up:** Is the route guard server-side? No; layout check only.

### Q22. How is JWT handled?

- **Spoken answer:** “Stored in localStorage; Axios adds Bearer header and refreshes on 401.”
- **Detailed explanation:** Request and response interceptors in `api.js`.
- **Project example:** After refresh, original request is retried.
- **Source reference:** `frontend/src/services/api.js`.
- **Likely follow-up:** Is localStorage safe? XSS risk.

### Q23. How does PDF upload work in React?

- **Spoken answer:** “Documents.jsx validates the file, builds FormData, and calls the upload service.”
- **Detailed explanation:** Drag/drop and file picker; status refresh after response.
- **Project example:** `documentService.uploadDocument(file)`.
- **Source reference:** `Documents.jsx`, `documentService.js`.
- **Likely follow-up:** Why delete Content-Type? Multipart boundary.

### Q24. How are citations rendered?

- **Spoken answer:** “Chat checks `source_type`/`page_url`; websites show links, PDFs show page numbers.”
- **Detailed explanation:** Similarity displayed with `toFixed(3)`.
- **Project example:** Website source card uses globe icon.
- **Source reference:** `Chat.jsx` lines 690–795.
- **Likely follow-up:** Are inline citations present? No.

### Q25. What is the web-source frontend bug?

- **Spoken answer:** “The service sends `root_url`, but the serializer expects `url`.”
- **Detailed explanation:** Verified field mismatch causes validation failure.
- **Project example:** `createWebSource(rootUrl, maxPages)`.
- **Source reference:** `webSourceService.js`, `web_serializers.py`.
- **Likely follow-up:** How fix? Rename payload key to `url`.

---

## 6. MySQL

### Q26. Why MySQL?

- **Spoken answer:** “It stores users, metadata, chunks, embeddings, and conversations transactionally.”
- **Detailed explanation:** Relational model fits ownership and hierarchy.
- **Project example:** Cascade deletes from user to documents to chunks.
- **Source reference:** `settings.py`, model files.
- **Likely follow-up:** Is it a vector DB? No.

### Q27. How are embeddings stored?

- **Spoken answer:** “As JSON lists in `DocumentChunk.embedding` and `WebPageChunk.embedding`.”
- **Detailed explanation:** `.tolist()` converts NumPy output to JSON-compatible list.
- **Project example:** 384 floats per chunk.
- **Source reference:** `models.py`, `document_processor.py`.
- **Likely follow-up:** Production alternative? Vector DB/binary index.

### Q28. What constraints exist?

- **Spoken answer:** “Unique chunk numbers per parent and unique URL per web source.”
- **Detailed explanation:** Three named unique constraints plus indexes.
- **Project example:** `unique_document_chunk`.
- **Source reference:** `documents/models.py`.
- **Likely follow-up:** What about duplicate content? Not constrained.

### Q29. What is CASCADE used for?

- **Spoken answer:** “Deleting a parent removes its child rows.”
- **Detailed explanation:** All FKs use `on_delete=models.CASCADE`.
- **Project example:** Deleting a document deletes its chunks.
- **Source reference:** model files.
- **Likely follow-up:** Is soft delete used? No.

### Q30. How is data isolated per user?

- **Spoken answer:** “All list/detail/search querysets include the current user.”
- **Detailed explanation:** Applies to documents, web sources, conversations, PDF chunks, and web chunks.
- **Project example:** `page__source__user=user`.
- **Source reference:** `vector_search.py`, views.
- **Likely follow-up:** Are authorization tests present? No.

---

## 7. REST APIs

### Q31. List the API endpoints.

- **Spoken answer:** “Auth register/login/refresh/me; documents list, detail, search, ask; web-source list/detail; conversation list/detail/ask.”
- **Detailed explanation:** All mounted under `/api/`.
- **Project example:** `/api/conversations/{id}/ask/`.
- **Source reference:** `config/urls.py` and app URL files.
- **Likely follow-up:** Which are public? Register and login.

### Q32. What is REST about these endpoints?

- **Spoken answer:** “Resources use nouns, HTTP verbs express actions, and JSON is the representation.”
- **Detailed explanation:** `GET/POST/DELETE` on collections and items.
- **Project example:** `DELETE /api/documents/{id}/`.
- **Source reference:** `documents/urls.py`.
- **Likely follow-up:** Why `POST` for search? Query body needs validation/top_k.

### Q33. How is upload validated?

- **Spoken answer:** “Extension, 20 MB size, and PDF header signature.”
- **Detailed explanation:** Serializer validation with file pointer reset.
- **Project example:** `%PDF-` check.
- **Source reference:** `documents/serializers.py`.
- **Likely follow-up:** Is malware scanning done? No.

### Q34. What status codes are used?

- **Spoken answer:** “201 create, 200 success, 400 validation/crawl failure, 401 unauthorized, 404 wrong owner, 500 service failure, 204 conversation delete.”
- **Detailed explanation:** Document processing failure unusually still returns 201.
- **Project example:** `DocumentAskView` returns 500 on exception.
- **Source reference:** views files.
- **Likely follow-up:** What would you improve? Consistent error format/202 for jobs.

### Q35. Is there pagination?

- **Spoken answer:** “No.”
- **Detailed explanation:** List endpoints return arrays directly.
- **Project example:** `api.get("documents/")`.
- **Source reference:** `documents/views.py`, DRF settings.
- **Likely follow-up:** What would you add? `PageNumberPagination`.

---

## 8. Embeddings

### Q36. What is an embedding?

- **Spoken answer:** “A numeric vector representing semantic meaning of text.”
- **Detailed explanation:** Enables vector similarity search.
- **Project example:** Chunk text becomes 384 floats.
- **Source reference:** `embedding_service.py`.
- **Likely follow-up:** Does it store text? No.

### Q37. What does 384 dimensions mean?

- **Spoken answer:** “Each text is described by 384 learned numeric features.”
- **Detailed explanation:** Matches `all-MiniLM-L6-v2` output and FAISS dimension.
- **Project example:** `DIMENSIONS = 384`.
- **Source reference:** `vector_search.py`.
- **Likely follow-up:** What if mismatch? ValueError.

### Q38. What is cosine similarity?

- **Spoken answer:** “Similarity based on angle between vectors, ignoring magnitude.”
- **Detailed explanation:** With normalized vectors, cosine equals inner product.
- **Project example:** Used indirectly via `IndexFlatIP`.
- **Source reference:** `embedding_service.py`, `vector_search.py`.
- **Likely follow-up:** Why normalize? Make IP equal cosine.

### Q39. Why same model for query and chunks?

- **Spoken answer:** “Vectors from different models are not comparable.”
- **Detailed explanation:** Both paths call the same `generate_embeddings()`.
- **Project example:** Question vector built in `_search_faiss()`.
- **Source reference:** `embedding_service.py`.
- **Likely follow-up:** What after model change? Re-embed all chunks.

### Q40. What happens with NaN embeddings?

- **Spoken answer:** “Search rejects them before FAISS.”
- **Detailed explanation:** `np.isfinite(vectors).all()` check.
- **Project example:** Raises `ValueError`.
- **Source reference:** `vector_search.py` lines 25–26.
- **Likely follow-up:** Where surface? HTTP 500 via view.

---

## 9. Sentence Transformers

### Q41. What is Sentence Transformers?

- **Spoken answer:** “A library that turns text into fixed-length semantic vectors.”
- **Detailed explanation:** Uses transformer models and pooling.
- **Project example:** Imported in `embedding_service.py`.
- **Source reference:** `embedding_service.py`.
- **Likely follow-up:** Is it an LLM? No.

### Q42. Which model is used?

- **Spoken answer:** “`sentence-transformers/all-MiniLM-L6-v2`.”
- **Detailed explanation:** Produces normalized 384-d vectors.
- **Project example:** `MODEL_NAME`.
- **Source reference:** `embedding_service.py`.
- **Likely follow-up:** Why selected? Small local model.

### Q43. What does the lazy singleton do?

- **Spoken answer:** “Loads the model on first use and reuses it.”
- **Detailed explanation:** Module-level `_model`.
- **Project example:** Avoids loading weights for every query.
- **Source reference:** `get_embedding_model()`.
- **Likely follow-up:** Per Gunicorn worker? Yes, memory repeats.

### Q44. What does `normalize_embeddings=True` do?

- **Spoken answer:** “Scales each vector to length 1.”
- **Detailed explanation:** Needed for cosine-equivalent inner product.
- **Project example:** Passed to `model.encode()`.
- **Source reference:** `embedding_service.py`.
- **Likely follow-up:** How verify? `np.linalg.norm(v) ≈ 1`.

### Q45. What are limitations?

- **Spoken answer:** “Small generic model, short effective input, no domain fine-tuning, semantic-only, CPU cost.”
- **Detailed explanation:** Exact identifiers and specialized domains can suffer.
- **Project example:** No evaluation dataset exists.
- **Source reference:** model choice + no eval files.
- **Likely follow-up:** How improve? Evaluate, hybrid search, rerank.

---

## 10. FAISS

### Q46. What is FAISS?

- **Spoken answer:** “A library for fast vector similarity search.”
- **Detailed explanation:** It compares numbers; it does not create embeddings.
- **Project example:** Used in `_search_faiss()`.
- **Source reference:** `vector_search.py`.
- **Likely follow-up:** What does it stand for? Facebook AI Similarity Search.

### Q47. Is FAISS a database or LLM?

- **Spoken answer:** “Neither. It is an index/search library.”
- **Detailed explanation:** MySQL stores data; Sentence Transformers embeds; Ollama generates.
- **Project example:** Index exists only during search.
- **Source reference:** `vector_search.py`, `models.py`.
- **Likely follow-up:** Where are vectors persisted? MySQL JSON.

### Q48. What is `IndexFlatIP`?

- **Spoken answer:** “An exact flat index using inner product.”
- **Detailed explanation:** `Flat` means full scan; `IP` means inner product; 384 is dimension.
- **Project example:** `faiss.IndexFlatIP(DIMENSIONS)`.
- **Source reference:** `vector_search.py`.
- **Likely follow-up:** Exact vs ANN? Flat is exact.

### Q49. Is the FAISS index persisted?

- **Spoken answer:** “No. It is rebuilt on every search.”
- **Detailed explanation:** No write/read index calls exist.
- **Project example:** Constructed inside `_search_faiss()`.
- **Source reference:** `vector_search.py`.
- **Likely follow-up:** Why? Simplicity and consistency.

### Q50. How map FAISS result to chunk?

- **Spoken answer:** “FAISS returns a position; we use it in the parallel `records` list.”
- **Detailed explanation:** Metadata stored next to embedding in `records`.
- **Project example:** `records[int(position)]["metadata"]`.
- **Source reference:** `vector_search.py`.
- **Likely follow-up:** What if index persisted? Need stable IDs.

### Q51. How would FAISS behave at 10M vectors?

- **Spoken answer:** “Flat index would scan all vectors and require large memory; we would need ANN or a vector DB.”
- **Detailed explanation:** Raw float32 alone is about 15 GB for 10M × 384, plus overhead.
- **Project example:** Current rebuild-per-query makes it worse.
- **Source reference:** current implementation.
- **Likely follow-up:** Which ANN? Benchmark IVF-PQ/HNSW.

---

## 11. RAG

### Q52. What is RAG?

- **Spoken answer:** “Retrieve relevant content first, then ask the LLM to answer from it.”
- **Detailed explanation:** Keeps knowledge external and citable.
- **Project example:** `ask_documents()`.
- **Source reference:** `rag_service.py`.
- **Likely follow-up:** Why not fine-tune? RAG is cheaper for changing content.

### Q53. What happens when no chunks are found?

- **Spoken answer:** “We return a fixed no-information answer and do not call Ollama.”
- **Detailed explanation:** Avoids ungrounded generation.
- **Project example:** Empty source response.
- **Source reference:** `rag_service.py` lines 17–24.
- **Likely follow-up:** Is the message customizable? No.

### Q54. How is context built?

- **Spoken answer:** “Numbered SOURCE blocks with title/page or URL and chunk content.”
- **Detailed explanation:** Helps the model distinguish sources.
- **Project example:** `SOURCE 1 PDF: ... Page: 4`.
- **Source reference:** `rag_service.py`.
- **Likely follow-up:** Are inline markers added? No.

### Q55. What is grounded generation?

- **Spoken answer:** “The answer is constrained to supplied evidence.”
- **Detailed explanation:** Prompt rules and no-result fallback support it.
- **Project example:** Temperature 0.2.
- **Source reference:** `llm_service.py`.
- **Likely follow-up:** Guaranteed? No.

### Q56. How are sources returned?

- **Spoken answer:** “A structured `sources` array with type, IDs, title, page/URL, and similarity.”
- **Detailed explanation:** Stored in assistant message JSON.
- **Project example:** Chat source cards.
- **Source reference:** `rag_service.py`, `Chat.jsx`.
- **Likely follow-up:** Sentence-level citations? Not implemented.

### Q57. Is conversation history used for retrieval?

- **Spoken answer:** “No. Each question is standalone.”
- **Detailed explanation:** `ask_documents()` only receives current question.
- **Project example:** Follow-up pronouns are not resolved.
- **Source reference:** `conversations/views.py`, `rag_service.py`.
- **Likely follow-up:** How add? Query rewriting/history-aware retrieval.

---

## 12. Chunking

### Q58. Why chunk text?

- **Spoken answer:** “To make retrieval precise and fit model context.”
- **Detailed explanation:** Smaller passages rank better and give exact citations.
- **Project example:** 1,000-character chunks.
- **Source reference:** `text_chunker.py`.
- **Likely follow-up:** Too small? Loses context.

### Q59. What is overlap?

- **Spoken answer:** “Repeated text between adjacent chunks.”
- **Detailed explanation:** Prevents boundary loss.
- **Project example:** 200 characters.
- **Source reference:** `text_chunker.py`.
- **Likely follow-up:** Downside? Duplication.

### Q60. How are page numbers preserved?

- **Spoken answer:** “The extractor returns page-numbered text and the chunker copies it.”
- **Detailed explanation:** Enables page citations.
- **Project example:** `chunk_pages()`.
- **Source reference:** `pdf_extractor.py`, `text_chunker.py`.
- **Likely follow-up:** Website page numbers? `null`.

### Q61. Does chunking respect sentences?

- **Spoken answer:** “Only loosely. It prefers a space boundary, not a sentence boundary.”
- **Detailed explanation:** `rfind(" ")` finds last space before end.
- **Project example:** Long text can split mid-sentence.
- **Source reference:** `chunk_text()`.
- **Likely follow-up:** Better approach? Recursive/sentence chunking.

### Q62. Are website and PDF chunks the same size?

- **Spoken answer:** “Yes. Both use 1,000 chars and 200 overlap.”
- **Detailed explanation:** Same `chunk_text()` function.
- **Project example:** `process_web_page()`.
- **Source reference:** `document_processor.py`, `web_embedding_service.py`.
- **Likely follow-up:** Always ideal? No, HTML vs PDF differ.

---

## 13. Vector search

### Q63. What does `search_knowledge()` do?

- **Spoken answer:** “Loads the user's PDF and website chunks, builds metadata records, and calls FAISS.”
- **Detailed explanation:** Unified retrieval for both source types.
- **Project example:** `/documents/search/` uses it.
- **Source reference:** `vector_search.py`.
- **Likely follow-up:** What is `search_documents()`? PDF-only compatibility.

### Q64. How are two source types ranked together?

- **Spoken answer:** “Their vectors go into one FAISS index.”
- **Detailed explanation:** Metadata keeps source identity.
- **Project example:** PDF and website chunks in one result list.
- **Source reference:** `search_knowledge()`.
- **Likely follow-up:** Can one type dominate? Yes.

### Q65. What is top-K?

- **Spoken answer:** “The number of highest-scoring chunks returned.”
- **Detailed explanation:** Default 5, allowed 1–10.
- **Project example:** `top_k=5`.
- **Source reference:** serializers and `vector_search.py`.
- **Likely follow-up:** Is larger always better? No.

### Q66. Why validate embeddings before FAISS?

- **Spoken answer:** “To prevent shape/value errors and misleading results.”
- **Detailed explanation:** Checks dimension and finite values.
- **Project example:** 768-d vector raises.
- **Source reference:** `_search_faiss()`.
- **Likely follow-up:** What exception surfaces? 500.

### Q67. How does frontend know source type?

- **Spoken answer:** “From `source_type` and `page_url` in each result.”
- **Detailed explanation:** Chat uses them to choose icon/link/page display.
- **Project example:** `isWebsite` logic.
- **Source reference:** `Chat.jsx`.
- **Likely follow-up:** Search page handles it? Poorly; page chip can show null.

---

## 14. LLM

### Q68. What is an LLM?

- **Spoken answer:** “A model that generates text from a prompt.”
- **Detailed explanation:** Here it is the final answer generator, not the knowledge store.
- **Project example:** Qwen via Ollama.
- **Source reference:** `llm_service.py`.
- **Likely follow-up:** Does it read MySQL? No.

### Q69. What is inference?

- **Spoken answer:** “Running the trained model on the prompt to produce output.”
- **Detailed explanation:** No training occurs in this app.
- **Project example:** `POST /api/generate`.
- **Source reference:** `llm_service.py`.
- **Likely follow-up:** Training vs inference? Training changes weights; inference uses them.

### Q70. What are temperature and num_predict?

- **Spoken answer:** “Temperature controls randomness; num_predict caps generated tokens.”
- **Detailed explanation:** Values 0.2 and 400.
- **Project example:** JSON `options`.
- **Source reference:** `llm_service.py`.
- **Likely follow-up:** Is num_predict context window? No.

### Q71. What are small-model limitations?

- **Spoken answer:** “Weaker reasoning, instruction following, and long-context handling.”
- **Detailed explanation:** 0.5B model chosen for local simplicity.
- **Project example:** Hallucination risk remains.
- **Source reference:** `OLLAMA_MODEL`.
- **Likely follow-up:** How improve? Larger model, reranking, evaluation.

---

## 15. Ollama

### Q72. What is Ollama?

- **Spoken answer:** “A local runtime that serves open models over HTTP.”
- **Detailed explanation:** Backend calls `/api/generate`.
- **Project example:** URL `http://127.0.0.1:11434/api/generate`.
- **Source reference:** `llm_service.py`.
- **Likely follow-up:** Is it public? No, local in current code.

### Q73. How does Django call Ollama?

- **Spoken answer:** “Synchronous `requests.post()` with JSON model, prompt, stream, and options.”
- **Detailed explanation:** `raise_for_status()` then parse JSON.
- **Project example:** `data.get("response")`.
- **Source reference:** `llm_service.py`.
- **Likely follow-up:** What if empty? ValueError.

### Q74. What happens if Ollama is unavailable?

- **Spoken answer:** “Exception bubbles up and the view returns HTTP 500 generic message.”
- **Detailed explanation:** No retry/fallback.
- **Project example:** `RequestException`.
- **Source reference:** `llm_service.py`, views.
- **Likely follow-up:** What add? Health check/retry/fallback.

### Q75. Is the response streamed?

- **Spoken answer:** “No. `stream=False`.”
- **Detailed explanation:** Frontend spinner waits for complete answer.
- **Project example:** Chat loading bubble.
- **Source reference:** `llm_service.py`, `Chat.jsx`.
- **Likely follow-up:** How stream? SSE/WebSocket.

---

## 16. Qwen

### Q76. What is Qwen?

- **Spoken answer:** “A family of open language models; we use qwen2.5:0.5b.”
- **Detailed explanation:** Configured as Ollama model tag.
- **Project example:** `OLLAMA_MODEL`.
- **Source reference:** `llm_service.py`.
- **Likely follow-up:** Why 0.5B? Local lightweight demo.

### Q77. What does 0.5b mean?

- **Spoken answer:** “About 0.5 billion parameters.”
- **Detailed explanation:** Parameter count roughly indicates model size/capacity.
- **Project example:** Smaller than hosted large models.
- **Source reference:** model tag.
- **Likely follow-up:** Larger always better? Not always for latency/cost.

### Q78. Is Qwen used for embeddings?

- **Spoken answer:** “No. Embeddings come from `all-MiniLM-L6-v2`.”
- **Detailed explanation:** Two separate models for two tasks.
- **Project example:** `embedding_service.py` vs `llm_service.py`.
- **Source reference:** both files.
- **Likely follow-up:** Could one model do both? Possibly, but not here.

### Q79. Why use a local model?

- **Spoken answer:** “No paid API and self-contained local workflow.”
- **Detailed explanation:** README states no external paid LLM API.
- **Project example:** Local URL.
- **Source reference:** `README.md`, `llm_service.py`.
- **Likely follow-up:** Production trade-off? Hardware/model ops.

---

## 17. Website crawling

### Q80. What is crawling?

- **Spoken answer:** “Fetching pages and discovering links from a starting URL.”
- **Detailed explanation:** BFS with queue and visited set.
- **Project example:** Same-host crawl.
- **Source reference:** `web_crawler.py`.
- **Likely follow-up:** Scraping vs crawling? Extraction vs discovery.

### Q81. How are URLs validated?

- **Spoken answer:** “HTTP/HTTPS, hostname, no credentials, ports 80/443, no localhost/private IPs.”
- **Detailed explanation:** `validate_public_url()` uses DNS and `ip.is_global`.
- **Project example:** Rejects `http://localhost`.
- **Source reference:** `web_crawler.py`.
- **Likely follow-up:** DNS rebinding? Needs network controls.

### Q82. How does robots.txt fit?

- **Spoken answer:** “Fetched first and checked before each page; fail closed on error.”
- **Detailed explanation:** `RobotFileParser`.
- **Project example:** `robots.can_fetch(USER_AGENT, url)`.
- **Source reference:** `get_robots_parser()`.
- **Likely follow-up:** What if robots.txt missing? Code allows all.

### Q83. How are pages converted to chunks?

- **Spoken answer:** “BeautifulSoup extracts text; `process_web_page()` chunks and embeds it.”
- **Detailed explanation:** Same chunker/embedder as PDFs.
- **Project example:** `WebPageChunk` rows.
- **Source reference:** `web_embedding_service.py`.
- **Likely follow-up:** JavaScript-rendered pages? Not handled.

### Q84. What are crawl limits?

- **Spoken answer:** “1–20 pages, default depth 2, 2 MB page size, 15s timeout, 5 redirects, 0.5s delay.”
- **Detailed explanation:** Constants and validators.
- **Project example:** `max_pages` from serializer.
- **Source reference:** `web_crawler.py`, `web_serializers.py`.
- **Likely follow-up:** Is depth configurable via API? No.

---

## 18. Security

### Q85. How are protected endpoints secured?

- **Spoken answer:** “JWT authentication plus global `IsAuthenticated`.”
- **Detailed explanation:** Views can override for public registration.
- **Project example:** Document endpoints.
- **Source reference:** `settings.py`, views.
- **Likely follow-up:** What about admin? No hardening shown.

### Q86. How do you prevent cross-user access?

- **Spoken answer:** “Every resource query includes the current user.”
- **Detailed explanation:** Applies to chunks too.
- **Project example:** `Document.objects.filter(uploaded_by=request.user)`.
- **Source reference:** views, `vector_search.py`.
- **Likely follow-up:** Automated tests? Not implemented.

### Q87. What is SSRF?

- **Spoken answer:** “Server-Side Request Forgery: making the server request internal targets.”
- **Detailed explanation:** Crawler blocks local/private destinations but needs network controls.
- **Project example:** `ip.is_global`.
- **Source reference:** `validate_public_url()`.
- **Likely follow-up:** DNS rebinding? Still a risk.

### Q88. Are secrets handled well?

- **Spoken answer:** “DB values use environment variables, but the Django secret is hardcoded and Debug is on; that is not production-safe.”
- **Detailed explanation:** Values not reproduced here.
- **Project example:** `settings.py`.
- **Source reference:** `settings.py`.
- **Likely follow-up:** What change first? Secret manager + Debug false.

### Q89. Is prompt injection addressed?

- **Spoken answer:** “Partially, by prompt rules telling the model to ignore instructions in documents.”
- **Detailed explanation:** No hard isolation or output validation.
- **Project example:** Rules 4–5 in prompt.
- **Source reference:** `llm_service.py`.
- **Likely follow-up:** Any tools exposed? No.

---

## 19. Production deployment

### Q90. Is this deployed in production?

- **Spoken answer:** “No. It runs locally as a portfolio project.”
- **Detailed explanation:** No deployment config exists.
- **Project example:** README documents runserver/Vite/Ollama local.
- **Source reference:** `README.md`, repository files.
- **Likely follow-up:** How would you deploy? Nginx/Gunicorn/etc.

### Q91. What serves Django in production?

- **Spoken answer:** “Proposed: Gunicorn behind Nginx, not runserver.”
- **Detailed explanation:** `config.wsgi.application` exists.
- **Project example:** Gunicorn command in `12_PRODUCTION_DEPLOYMENT.md`.
- **Source reference:** `config/wsgi.py`.
- **Likely follow-up:** PHP-FPM comparison? Similar process-manager role.

### Q92. How handle long jobs?

- **Spoken answer:** “Move PDF processing and crawling to Celery with Redis.”
- **Detailed explanation:** Return 202 and poll status.
- **Project example:** Status fields already exist.
- **Source reference:** models, proposed design.
- **Likely follow-up:** What is broker? Redis.

### Q93. How deploy Ollama?

- **Spoken answer:** “As a separate private model service with URL in config, not hardcoded localhost.”
- **Detailed explanation:** Add auth/network policy and monitoring.
- **Project example:** Current constant must change.
- **Source reference:** `llm_service.py`.
- **Likely follow-up:** GPU? Size by benchmarking.

### Q94. How handle production vectors?

- **Spoken answer:** “Persist the index or use a vector DB, with stable IDs and incremental updates.”
- **Detailed explanation:** Current rebuild-per-search does not scale.
- **Project example:** MySQL remains source of truth.
- **Source reference:** `vector_search.py`.
- **Likely follow-up:** Reindex on model change? Yes.

---

## 20. Scalability

### Q95. What breaks at 10,000 users?

- **Spoken answer:** “Rebuilding FAISS per query, synchronous jobs, and LLM worker occupancy.”
- **Detailed explanation:** Needs queues, persistent index, model scaling.
- **Project example:** `IndexFlatIP` built per search.
- **Source reference:** `vector_search.py`.
- **Likely follow-up:** Benchmark first? Yes.

### Q96. How handle millions of chunks?

- **Spoken answer:** “ANN/vector DB, persistent index, filters, incremental updates.”
- **Detailed explanation:** Raw flat vectors need GB-scale memory.
- **Project example:** Current JSON storage is heavy.
- **Source reference:** current design.
- **Likely follow-up:** Recall vs latency trade-off.

### Q97. How handle simultaneous questions?

- **Spoken answer:** “Rate limits, model concurrency control, queues, streaming, and more workers.”
- **Detailed explanation:** LLM calls can hold workers for 180s.
- **Project example:** `timeout=180`.
- **Source reference:** `llm_service.py`.
- **Likely follow-up:** What if queues fill? Backpressure/503.

### Q98. What caching would help?

- **Spoken answer:** “Metadata, model loading, and identical query answers with strict invalidation.”
- **Detailed explanation:** Model singleton already caches in-process.
- **Project example:** `_model`.
- **Source reference:** `embedding_service.py`.
- **Likely follow-up:** Cache key? user + query + source version.

### Q99. Why connection pooling?

- **Spoken answer:** “To avoid connection setup overhead under concurrency.”
- **Detailed explanation:** Not configured now.
- **Project example:** MySQL settings.
- **Source reference:** `settings.py`.
- **Likely follow-up:** Don't hold DB connections during LLM calls.

---

## 21. System design

### Q100. Design RAG for an enterprise.

- **Spoken answer:** “Ingest to object storage/DB, queue chunk+embed jobs, persist vectors, filter by tenant, retrieve, rerank, generate with guardrails, log evaluations.”
- **Detailed explanation:** Keep source of truth separate from index.
- **Project example:** Current app has the core loop but not enterprise controls.
- **Source reference:** architecture docs.
- **Likely follow-up:** Multi-tenancy? Row filters or index per tenant.

### Q101. How would you add hybrid search?

- **Spoken answer:** “Combine FAISS semantic results with BM25 keyword results using RRF.”
- **Detailed explanation:** Then rerank and build context.
- **Project example:** Current search is semantic-only.
- **Source reference:** `vector_search.py`.
- **Likely follow-up:** Why RRF? Rank fusion without score calibration.

### Q102. How would you handle model change?

- **Spoken answer:** “Version embeddings, re-embed asynchronously, build new index, then switch traffic.”
- **Detailed explanation:** Avoid mixed-model vectors in one index.
- **Project example:** No version field exists.
- **Source reference:** models.
- **Likely follow-up:** Blue-green index? Yes.

### Q103. How ensure no data leakage?

- **Spoken answer:** “Enforce owner filters before retrieval, in vector metadata, and again before displaying sources.”
- **Detailed explanation:** Backend is the only trusted layer.
- **Project example:** Current filters in SQL.
- **Source reference:** `vector_search.py`.
- **Likely follow-up:** Tests? Add authorization suite.

### Q104. Where do you put observability?

- **Spoken answer:** “At Nginx, Gunicorn, Django, queue workers, vector search, and model service.”
- **Detailed explanation:** Capture latency, errors, queue depth, and model health.
- **Project example:** Logging is currently minimal.
- **Source reference:** current code.
- **Likely follow-up:** Which metric first? p95 ask latency.

---

## 22. Forward Deployed Engineering

### Q105. How would you present this to a customer?

- **Spoken answer:** “As a working prototype that turns their documents and public pages into a searchable, source-cited assistant.”
- **Detailed explanation:** Emphasize capabilities, not production claims.
- **Project example:** PDF + website ingestion and chat.
- **Source reference:** project overview.
- **Likely follow-up:** Is it enterprise-ready? Not yet.

### Q106. How translate business needs to technical work?

- **Spoken answer:** “Map sources, users, permissions, quality bar, latency, and deployment constraints into ingestion, retrieval, and UI choices.”
- **Detailed explanation:** Ask about data volume, formats,敏感 content, compliance.
- **Project example:** Current app already separates sources by user.
- **Source reference:** architecture.
- **Likely follow-up:** What if customer needs DOCX? New extractor.

### Q107. How build a PoC?

- **Spoken answer:** “Pick a small representative dataset, define 10–20 real questions, show answers with sources, and measure feedback.”
- **Detailed explanation:** PoC should prove value before hardening.
- **Project example:** Current app can be demoed locally.
- **Source reference:** demo link in README.
- **Likely follow-up:** How measure success? User acceptance + retrieval eval.

### Q108. How integrate with customer systems?

- **Spoken answer:** “Use APIs/webhooks for ingestion, SSO for identity, and embed the chat widget or call endpoints from their portal.”
- **Detailed explanation:** Current API is REST + JWT; SSO/RBAC are not implemented.
- **Project example:** Existing endpoints can be consumed by another UI.
- **Source reference:** `config/urls.py`.
- **Likely follow-up:** SSO? Proposed.

### Q109. How debug a customer environment?

- **Spoken answer:** “Reproduce with their data, check logs end to end, isolate ingestion vs retrieval vs generation, then fix the smallest layer.”
- **Detailed explanation:** Use request IDs and stage-by-stage diagnostics.
- **Project example:** Wrong answer could be bad chunking, FAISS results, or model prompt.
- **Source reference:** service boundaries.
- **Likely follow-up:** What logs add? Proposed observability.

### Q110. Explain architecture to a non-technical stakeholder.

- **Spoken answer:** “We turn documents into searchable index cards, fetch the most relevant ones for a question, and ask the AI to write an answer using only those cards.”
- **Detailed explanation:** Avoid jargon; use trust/source analogy.
- **Project example:** Source cards in chat UI.
- **Source reference:** `Chat.jsx`.
- **Likely follow-up:** How explain hallucination? Model may guess if evidence is missing.

### Q111. What would you promise in an FDE role?

- **Spoken answer:** “I would promise a scoped PoC and clear verification, not guaranteed production outcomes.”
- **Detailed explanation:** honesty about limitations builds trust.
- **Project example:** No customer deployments claimed.
- **Source reference:** README portfolio framing.
- **Likely follow-up:** What would you not promise? Accuracy guarantees without eval.

### Q112. What is your project's strongest FDE story?

- **Spoken answer:** “I built the entire loop myself and can move from customer requirement to working demo, then explain exactly what hardening is needed.”
- **Detailed explanation:** Shows ownership across frontend, backend, AI, and ops reasoning.
- **Project example:** End-to-end KnowHub AI.
- **Source reference:** all docs.
- **Likely follow-up:** Give an example customer scenario. See `16_FDE_INTERVIEW_GUIDE.md`.

---

## Final practice tip

Practice saying each **Spoken answer** aloud in under 25 seconds. If the interviewer asks “why”, move to the **Detailed explanation**, then quote one file path and one function name. That pattern sounds prepared and honest.
