# 20 — Scenario-Based Interview Questions

Fourteen realistic scenarios with step-by-step troubleshooting. The goal is to show how you think across browser, API, database, retrieval, model, and deployment boundaries.

> Every project-specific check below refers to code inspected in this repository. Fixes described as **PROPOSED** are not implemented here. No source code, database, migrations, tests, or deployments were changed or performed while preparing this guide.

---

## Scenario 1 — Upload succeeds but the document can never be asked about

### Prompt

> “A user uploads a PDF. The UI says uploaded successfully, but search and chat never find it. What do you check?”

### Step-by-step answer

1. **Separate upload from processing.**
   - `DocumentListCreateView.create()` saves the document first, then calls `process_document()`.
   - If processing raises, the endpoint still returns HTTP 201 with `"Document uploaded, but processing failed."`
   - Therefore “upload succeeded” does not prove embeddings exist.

2. **Check document status.**
   - `Document.status` can be `uploaded`, `processing`, `completed`, or `failed`.
   - `process_document()` sets `failed` in its exception handler.
   - Ask the user or check the list response for `status`.

3. **Check the response body.**
   - Success returns `processing` with `status`, `pages`, `chunks`, `embeddings`, and `dimensions`.
   - Failure returns a generic error string, not the original exception.

4. **Trace the processing stages.**
   - `extract_pdf_text(document.file.path)`
   - `chunk_pages(...)`
   - `generate_embeddings(texts)`
   - `DocumentChunk.objects.bulk_create(...)`

5. **Check the likely failure causes.**
   - Encrypted PDF: `extract_pdf_text()` raises.
   - Zero pages: raises.
   - No readable text: raises.
   - No chunks: `process_document()` raises.
   - Embedding/model failure: propagates.
   - Database write failure: propagates.

6. **Verify search prerequisites.**
   - `search_knowledge()` only includes `DocumentChunk` rows where `embedding__isnull=False`.
   - Retrieval also requires `document__uploaded_by=user`.

7. **Explain the right fix.**
   - For a scanned PDF: add OCR (**PROPOSED**).
   - For model failure: check embedding model availability.
   - For unclear UX: expose the real status/error more clearly in the UI (**PROPOSED**).
   - For production: move processing to a worker with retries (**PROPOSED**).

### Strong closing answer

> “I would not debug this as a search problem first. The upload endpoint deliberately decouples save from processing, so I would confirm the document reached `completed` and has embedded chunks before touching retrieval.”

---

## Scenario 2 — The PDF has text visually but extraction fails

### Prompt

> “A support PDF opens fine in a viewer, but upload processing fails with ‘No readable text found.’ Why?”

### Step-by-step answer

1. Identify the source message: `backend/documents/services/pdf_extractor.py`.
2. `extract_pdf_text()` uses `page.get_text("text").strip()`.
3. If every page returns empty text, it raises `ValueError("No readable text found...")`.
4. Most likely cause: the PDF is image-based/scanned, not text-based.
5. Other possibilities: unusual fonts/encoding or text stored as vectors.
6. Current status: OCR is **NOT IMPLEMENTED**.
7. Proposed fix:
   - Add OCR stage before chunking.
   - Preserve page numbers from OCR output.
   - Mark documents with extraction method.
   - Add a test corpus containing scanned PDFs.

### Customer-friendly wording

> “The file is a picture of a page rather than machine-readable text. The current extractor reads embedded text only, so OCR would need to be added to the ingestion pipeline.”

---

## Scenario 3 — Search returns no results after a successful upload

### Prompt

> “The document status is completed, but semantic search returns nothing. What are the possible causes?”

### Step-by-step answer

1. **Check query validation.**
   - `DocumentSearchSerializer` requires non-blank `query` up to 1000 characters.
   - `search_knowledge()` trims and returns `[]` for blank queries.

2. **Check user ownership.**
   - PDF chunks are filtered by `document__uploaded_by=user`.
   - A document uploaded by another account must not appear.

3. **Check embeddings.**
   - Only chunks with `embedding__isnull=False` are loaded.
   - Vectors must be 384-dimensional and finite.

4. **Check chunk creation.**
   - `process_document()` bulk-creates chunks inside `transaction.atomic()`.
   - If it failed, status would usually be failed, not completed.

5. **Check the request path.**
   - Frontend `searchService.js` posts `{ query, top_k }` to `documents/search/`.
   - Backend `DocumentSearchView.post()` calls `search_knowledge()`.

6. **Check semantic mismatch.**
   - Query may be conceptually related but use vocabulary far from document text.
   - MiniLM is semantic but not magic; hybrid keyword search is **PROPOSED**.

7. **Check UI state.**
   - `Search.jsx` shows “No matching document content found” when `results.length === 0`.

8. **Resolution.**
   - Try a phrase copied from the document.
   - Verify `count` from the API.
   - Add hybrid search/reranking if recall is consistently poor (**PROPOSED**).

### Strong closing answer

> “A completed document plus empty search means I would inspect ownership, embedding presence, vector validity, and query phrasing in that order.”

---

## Scenario 4 — The answer is confidently wrong

### Prompt

> “The assistant answered a policy question incorrectly, and the source does not support the answer. How do you debug it?”

### Step-by-step answer

1. **Classify the failure.**
   - Retrieval failure: the supporting chunk was not retrieved.
   - Grounding failure: the chunk was retrieved but ignored.
   - Presentation failure: the answer is partly right but the citation is misleading.

2. **Inspect retrieval.**
   - Call the search path mentally: `ask_documents()` → `search_knowledge()`.
   - Review returned chunks and similarity scores.
   - Verify the correct chunk belongs to the user and has an embedding.

3. **Inspect context construction.**
   - `ask_documents()` builds `SOURCE n` blocks with document/page or website/url metadata.
   - If the wrong chunk is in context, no prompt can fix missing evidence.

4. **Inspect generation.**
   - `generate_answer()` sends strict rules: only context, no invented facts, treat context as data.
   - The model is small (`qwen2.5:0.5b`) and can still drift.

5. **Explain current limit.**
   - There is no groundedness checker, reranker, or sentence-level citation.
   - Prompt instructions are partial mitigation, not a guarantee.

6. **Propose improvements.**
   - Add reranking and a similarity threshold.
   - Add a verification step that checks claims against context.
   - Add sentence-level source mapping.
   - Build a golden evaluation set.
   - Add prompt-injection tests.
   - Consider a larger or better instruction-tuned model, with latency/cost trade-off.

### Interview phrasing

> “I would first decide whether retrieval or generation failed. If the evidence was never retrieved, I fix retrieval. If it was retrieved and ignored, I fix prompting, verification, or model choice.”

---

## Scenario 5 — Search becomes slow as the knowledge base grows

### Prompt

> “With 50,000 chunks, search takes 12 seconds. What is happening and what would you change?”

### Step-by-step answer

1. **Name the current implementation.**
   - `search_knowledge()` queries all eligible chunks for the user.
   - `_search_faiss()` converts all stored embeddings to a NumPy array.
   - It creates a fresh `faiss.IndexFlatIP` and adds every vector.
   - It then embeds the query and searches.

2. **Identify cost centers.**
   - MySQL read of many JSON embeddings.
   - Python/NumPy conversion.
   - Index construction on every request.
   - Query embedding.
   - Ollama generation, if this is an ask rather than plain search.

3. **Measure before changing.**
   - Add timing around DB fetch, vector conversion, index build, embedding, FAISS search, and generation (**PROPOSED**).
   - Test with realistic user and chunk counts.

4. **Staged improvements.**
   - Persist the FAISS index.
   - Store a stable chunk-id mapping.
   - Use metadata filters/partitions per user or source.
   - Switch to `IndexIVFFlat` or HNSW if exact scan is too slow.
   - Cache frequent query embeddings.
   - Add pagination or source filters in the UI.
   - Move ingestion off request path.

5. **Trade-off explanation.**
   - Flat exact search is simple and accurate but O(n).
   - Approximate search is faster but requires recall tuning.
   - Persistent index adds consistency work on document deletion.

### Strong closing answer

> “I would not rewrite the whole retrieval layer on day one. I would prove where the 12 seconds go. Given this code, index rebuild and JSON embedding reads are the first suspects.”

---

## Scenario 6 — Adding a website fails with a validation error

### Prompt

> “The website page shows crawling failed. The URL works in the browser. What is the first bug you suspect?”

### Step-by-step answer

1. **Check the payload contract.**
   - `frontend/src/services/webSourceService.js` sends `root_url`.
   - `backend/documents/web_serializers.py` expects `url`.
   - This is a verified mismatch.

2. **Predict backend behavior.**
   - `WebSourceCreateSerializer` sees `url` missing and returns 400.
   - The frontend error handling checks `detail`, `root_url[0]`, then `error`.
   - Depending on response shape, the user may see a generic message.

3. **Other validation checks.**
   - `url` must be a valid URL up to 2048 characters.
   - `max_pages` must be 1–20.

4. **If validation passes, check crawler errors.**
   - HTTP/HTTPS only.
   - Public host.
   - No localhost/private IP.
   - Ports 80/443.
   - Robots.txt check.
   - Same-host links.
   - HTML content type.
   - Non-empty extracted content.

5. **Check persisted failure state.**
   - `WebSourceListCreateView.post()` sets `status=failed` and stores trimmed `error_message`.

6. **Resolution.**
   - Align request field names and add an endpoint contract test (**PROPOSED**).
   - Do not claim this mismatch was fixed; it exists in the repository.

---

## Scenario 7 — Crawler returns zero pages

### Prompt

> “A public site is reachable, but the crawler saves zero pages and no obvious error appears. Why?”

### Step-by-step answer

1. `crawl_website()` returns both `pages` and `errors`.
2. Inspect `errors` first; `WebSourceListCreateView.post()` currently ignores them.
3. Common causes:
   - `robots.txt` disallows the user agent.
   - robots.txt could not be safely verified; code fails closed.
   - Redirect target is invalid or private.
   - Response is not `text/html`.
   - Page exceeds 2 MB.
   - Extracted content is empty because only scripts/nav are present.
   - Content is JavaScript-rendered; BeautifulSoup reads static HTML only.
   - Links are on a different host and are skipped.
   - `max_depth` prevents discovery.

4. Check code details:
   - `get_robots_parser()` uses `USER_AGENT = "KnowHubBot/1.0"`.
   - `extract_page_content()` removes `script`, `style`, `noscript`, `header`, `footer`, `nav`, `svg`, `iframe`.
   - BFS is same-host only.
   - API `max_pages` is 1–20.

5. Proposed improvements:
   - Surface crawl errors in the API response/UI.
   - Add JavaScript rendering only with clear security and cost review.
   - Allow explicit approved domains.
   - Add recrawl policy and change detection.

### Strong closing answer

> “Zero pages does not mean zero errors. This crawler returns an errors list, and the view currently discards it, so I would inspect that list before blaming embeddings.”

---

## Scenario 8 — Frontend receives 401 repeatedly after login

### Prompt

> “After login, API calls still return 401. Sometimes one request works after refresh. What do you inspect?”

### Step-by-step answer

1. **Check token storage.**
   - `authService.login()` stores `access_token` and `refresh_token` in `localStorage`.

2. **Check request header.**
   - `api.js` request interceptor adds `Authorization: Bearer <access_token>`.

3. **Check token validity.**
   - Simple JWT access token may be expired.
   - Refresh token may be expired, revoked, or missing.

4. **Check refresh interceptor.**
   - Skips refresh for `auth/login/` and `auth/token/refresh/`.
   - Uses a one-time `_retry` flag.
   - Calls refresh with raw Axios.
   - Saves new access token and retries.
   - Clears tokens if refresh fails.

5. **Check race conditions.**
   - Multiple simultaneous 401 requests may each trigger refresh.
   - One refresh may invalidate or rotate tokens while others use stale tokens.
   - Current code has no shared single-flight refresh queue (**PROPOSED** improvement).

6. **Check backend settings.**
   - `JWTAuthentication` is configured.
   - `RegisterView` is `AllowAny`; other endpoints default to `IsAuthenticated`.

7. **Resolution.**
   - Verify the browser actually has tokens.
   - Confirm the refresh endpoint response.
   - Add a single-flight refresh mechanism (**PROPOSED**).
   - Consider HttpOnly/Secure cookie storage for production (**PROPOSED**).

---

## Scenario 9 — CORS error in the browser

### Prompt

> “The backend works in curl but the browser says CORS blocked. How do you debug it?”

### Step-by-step answer

1. Check frontend origin: Vite usually runs at `http://localhost:5173` or `http://127.0.0.1:5173`.
2. Check `CORS_ALLOWED_ORIGINS` in `backend/config/settings.py`; those two origins are configured.
3. Check exact scheme, hostname, and port. `localhost` and `127.0.0.1` are different origins.
4. Check `corsheaders.middleware.CorsMiddleware` is first in middleware; it is.
5. Check whether the request includes Authorization headers; preflight must allow them.
6. Check multipart requests: `api.js` deletes `Content-Type` for `FormData` so the browser can set the boundary.
7. Proposed production fix: use same-origin deployment or explicitly configured production origins and TLS.

### Strong closing answer

> “CORS is an origin contract, not a backend connectivity issue. I would compare the exact browser origin with the allowlist and inspect the preflight response.”

---

## Scenario 10 — User suspects they can see another user's data

### Prompt

> “User A says a document from User B appeared in their search. How do you investigate?”

### Step-by-step answer

1. Treat as high severity until disproven.
2. Check list endpoints:
   - `DocumentListCreateView.get_queryset()` filters `uploaded_by=request.user`.
   - `WebSourceListCreateView.get()` filters `user=request.user`.
   - `ConversationListCreateView.get()` filters `user=request.user`.
3. Check detail endpoints:
   - `get_object_or_404(..., user=request.user)` is used for document detail via queryset, web source, and conversations.
4. Check retrieval:
   - `search_knowledge()` filters PDF chunks by `document__uploaded_by=user`.
   - Web chunks filter by `page__source__user=user`.
5. Check ask path:
   - `ask_documents()` passes `request.user` from views into retrieval.
6. Check for bypasses:
   - Any service called without user filter.
   - `search_documents()` also filters by owner.
   - Raw IDs in frontend cannot override ownership because views use authenticated user.
7. Check automated coverage:
   - None exists; `conversations/tests.py` is not a real test module.
8. Resolution:
   - Add two-user isolation tests for list/detail/search/ask/delete (**PROPOSED**).
   - Add audit logs if a real leak is confirmed (**PROPOSED**).

### Strong closing answer

> “The code path appears user-scoped at every read, but without automated two-user tests I would not call it proven. I would reproduce with two accounts and add regression tests.”

---

## Scenario 11 — Follow-up questions do not use chat history

### Prompt

> “The user asks ‘What about page 4?’ after a previous answer, and the assistant does not understand. Is this a bug?”

### Step-by-step answer

1. Check persistence:
   - `ConversationAskView.post()` saves user and assistant messages.
   - `Message` has `role`, `content`, `sources`.
   - `Chat.jsx` refetches the persisted conversation after each ask.

2. Check generation input:
   - `ConversationAskView` calls `ask_documents(user, question, top_k)` with only the current question.
   - `ask_documents()` calls `search_knowledge()` with that question.
   - `generate_answer()` receives current question plus retrieved context.

3. Conclusion:
   - History is stored but not used as context.
   - This is a known limitation, **PARTIALLY IMPLEMENTED** at the product level.

4. Proposed improvements:
   - Load last N messages.
   - Resolve pronouns/context with a query-rewriting step.
   - Pass a compressed chat summary into generation.
   - Keep retrieved sources separate from conversation messages.
   - Guard against using incorrect old context.

5. Customer explanation:
   > “The chat is persisted, but each answer currently searches using the latest question alone. We would add conversational query rewriting to make follow-ups work reliably.”

---

## Scenario 12 — Citations look wrong in the UI

### Prompt

> “A website answer shows ‘Page null’ in search results, and another answer shows a PDF page that does not match the quoted text. What do you check?”

### Step-by-step answer

1. **Website `Page null`:**
   - `search_knowledge()` sets `page_number=None` for website chunks.
   - `frontend/src/pages/Search.jsx` always renders `Page ${result.page_number}`.
   - Therefore it will show `Page null`; this is a verified UI mismatch.
   - `Chat.jsx` handles this better: it checks `page_number != null` and shows URL links for websites.

2. **Wrong PDF page:**
   - Page number comes from `chunk_pages()`, preserving the page where chunk text was extracted.
   - Overlap means a chunk may contain text near a boundary, but it is still tagged with its source page.
   - If quote and page look mismatched, inspect the stored `DocumentChunk.content` and `page_number`.

3. **Answer-to-citation mismatch:**
   - Sources are retrieved chunks, not verified sentence-level evidence.
   - The model may synthesize across chunks.
   - Citation presence does not prove each sentence is supported.

4. **Proposed UI fixes:**
   - In `Search.jsx`, render a Website chip/link when `source_type === "website"`.
   - Add sentence-level citation mapping.
   - Add a groundedness check.

---

## Scenario 13 — Ollama is down or the ask request times out

### Prompt

> “PDF search works, but asking a question takes a long time and then returns 500. Where is the failure?”

### Step-by-step answer

1. Separate retrieval from generation.
   - Search uses FAISS and does not call Ollama.
   - Ask calls `ask_documents()` → `generate_answer()`.

2. Check no-result shortcut.
   - If retrieval found no chunks, `ask_documents()` returns a fixed answer and skips Ollama.
   - Since this request timed out, retrieval probably found results.

3. Check Ollama configuration.
   - URL is `http://127.0.0.1:11434/api/generate`.
   - Model is `qwen2.5:0.5b`.
   - Timeout is 180 seconds.

4. Check possible causes:
   - Ollama service not running.
   - Model not pulled locally.
   - Server overloaded.
   - Prompt/context too large for the runtime.
   - Empty response from Ollama.

5. Check view behavior.
   - `DocumentAskView` and `ConversationAskView` catch broad exceptions and return generic 500.
   - In conversation ask, generation happens before message persistence, so failed generation does not leave an unanswered user message.

6. Proposed production improvements:
   - Health check for Ollama.
   - Retry with backoff for transient failures.
   - Fallback model or provider.
   - Streaming responses.
   - Circuit breaker and shorter user-facing timeout.
   - Structured logging without leaking document text unnecessarily.

### Strong closing answer

> “Because search works, I would focus on the Ollama call and its 180-second timeout. The current code has no retry or fallback, so one model failure becomes a 500.”

---

## Scenario 14 — A customer asks for an enterprise-ready version next month

### Prompt

> “A customer liked the demo and wants SSO, document-level permissions, 10,000 users, hourly web recrawls, audit logs, and on-prem deployment. How do you respond as an FDE?”

### Step-by-step answer

1. **Do not overclaim.**
   - None of SSO, RBAC/ACLs, audit logs, hourly recrawl scheduling, or production deployment is implemented.

2. **Clarify requirements.**
   - Identity provider: OIDC, SAML, or local accounts?
   - Permission model: per user, team, department, or tenant?
   - On-prem network rules: internet access allowed?
   - Model location: same host, GPU server, or air-gapped?
   - Audit events and retention period?
   - Actual first-month user and document counts?

3. **Map current strengths.**
   - Full RAG loop implemented.
   - Per-user filtering exists.
   - Local Ollama call can fit privacy-sensitive designs.
   - Services are separated and easy to extend.
   - Status fields exist for documents and web sources.

4. **Present the gap list honestly.**
   - Synchronous ingestion/crawling.
   - FAISS rebuilt per search.
   - No persistent index.
   - No worker/scheduler.
   - No SSO/RBAC/tenant model.
   - No audit logs.
   - No production deployment config.
   - No evaluation suite.

5. **Propose a phased plan.**
   - **Phase 1 — Pilot hardening (weeks 1–2):** secure settings, secrets, TLS, deployment config, contract tests, two-user isolation tests, explicit error reporting.
   - **Phase 2 — Reliability (weeks 3–4):** Celery workers for ingestion/crawl, retry/backoff, persistent FAISS index, recrawl jobs.
   - **Phase 3 — Enterprise identity (next):** OIDC/SAML, role model, document-level ACLs applied in views and retrieval.
   - **Phase 4 — Trust and scale:** hybrid retrieval, reranking, groundedness checks, monitoring, evaluation set, load testing.

6. **Define PoC success metrics.**
   - Answer correctness on 25–50 real questions.
   - Citation correctness.
   - Ingestion success rate.
   - p95 search and answer latency.
   - Authorization test pass rate.
   - Time to recrawl and reflect changes.

7. **FDE closing statement.**
   > “I would not promise all of that next month without scope control. I would propose a pilot with measurable success criteria, deliver the hardening needed for that pilot, and sequence enterprise identity and scale work based on the customer's actual deployment constraints.”

---

## 15. Quick triage table

| Symptom | First place to look | Most likely cause |
|---|---|---|
| Upload 201 but no content | `Document.status`, `processing` response | Processing failed after save. |
| “No readable text” | `pdf_extractor.py` | Scanned/encrypted/encoded PDF. |
| Empty search | `search_knowledge()` filters | Ownership, missing embedding, blank query. |
| Wrong answer | Retrieved chunks and prompt | Retrieval failure or grounding failure. |
| Slow ask/search | `_search_faiss()` and Ollama | Index rebuild, DB fetch, model latency. |
| Website 400 | `webSourceService.js` vs `web_serializers.py` | `root_url` vs `url`. |
| Zero crawled pages | `result["errors"]` | robots, HTML type, JS-only content, private URL. |
| 401 loop | `api.js` interceptors | Expired/invalid tokens or refresh race. |
| CORS failure | `CORS_ALLOWED_ORIGINS` | Origin mismatch. |
| Cross-user suspicion | Queryset filters | Usually misread UI; prove with two-user tests. |
| Follow-up failure | `ConversationAskView` | History not passed to RAG. |
| `Page null` | `Search.jsx` | UI ignores source type. |
| 500 after long wait | `llm_service.py` | Ollama unavailable/timeout. |
| Enterprise ask | deployment/security docs | Features are proposed, not implemented. |

---

## 16. Final answer framework

For any scenario, use this five-part structure:

1. **Reproduce and scope.** Which user, which request, which response?
2. **Follow the code path.** Browser → view → serializer → service → model/model endpoint.
3. **Identify the stage.** Validation, persistence, retrieval, generation, or rendering.
4. **State the evidence.** Exact path and field/function.
5. **Separate fix from improvement.** Current workaround vs **PROPOSED** production change.

This is the same structure a strong FDE uses with a customer: calm, specific, and honest.
