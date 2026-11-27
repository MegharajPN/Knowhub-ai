# 18 — Code File Reference

This chapter is a file-by-file index of the code that matters most in an interview. It records exact paths, classes/functions, inputs, outputs, side effects, and callers.

> All paths are relative to the repository root.
>
> **IMPLEMENTED** = read directly in source code. No application source, database, migration, test, or deployment action was performed while preparing this guide.

---

## 1. Repository map

### Backend entry points and configuration

| Path | Responsibility | Key symbols |
|---|---|---|
| `backend/manage.py` | Django command-line entry point. | `main()` |
| `backend/config/settings.py` | Django settings: apps, middleware, MySQL, DRF, JWT defaults, CORS, media, upload limits. | `INSTALLED_APPS`, `MIDDLEWARE`, `DATABASES`, `REST_FRAMEWORK`, `CORS_ALLOWED_ORIGINS`, `MEDIA_ROOT` |
| `backend/config/urls.py` | Root URL configuration. | `urlpatterns` |
| `backend/config/wsgi.py` | WSGI entry point. | `application` |
| `backend/config/asgi.py` | ASGI entry point. | `application` |

### Django apps

| Path | Responsibility |
|---|---|
| `backend/accounts/` | Installed authentication/account app. Uses Django's built-in `User`. |
| `backend/documents/` | PDF and web-source ingestion, search, RAG, and models. |
| `backend/conversations/` | Conversation and message persistence plus conversational ask endpoint. |
| `backend/apps/accounts/` | Separate account directory that exists but is **not installed** in `INSTALLED_APPS`. Do not present it as active. |

### Frontend

| Path | Responsibility |
|---|---|
| `frontend/package.json` | React 19, Vite, MUI, React Router, Axios dependencies and scripts. |
| `frontend/vite.config.js` | Vite React plugin configuration. |
| `frontend/src/main.jsx` | React root, StrictMode, ThemeProvider, CssBaseline, BrowserRouter. |
| `frontend/src/App.jsx` | Route definitions. |
| `frontend/src/theme.js` | MUI theme. |
| `frontend/src/components/DashboardLayout.jsx` | Authenticated layout, navigation, current-user check, logout. |
| `frontend/src/pages/` | Login, Register, Dashboard, Documents, WebSources, Search, Chat. |
| `frontend/src/services/` | Axios wrappers for backend endpoints. |

---

## 2. Endpoint index

Base frontend URL in `frontend/src/services/api.js`:

```text
http://127.0.0.1:8000/api/
```

### Auth endpoints

Defined in `backend/accounts/urls.py`.

| Method | Full path | View | Request | Success output |
|---|---|---|---|---|
| POST | `/api/auth/register/` | `RegisterView` | `username`, `email`, `password` | Created user data via `RegisterSerializer` |
| POST | `/api/auth/login/` | `TokenObtainPairView` | `username`, `password` | JWT `access` and `refresh` |
| POST | `/api/auth/token/refresh/` | `TokenRefreshView` | `refresh` | New `access` |
| GET | `/api/auth/me/` | `CurrentUserView` | Bearer token | `{ id, username, email }` |

Frontend caller: `frontend/src/services/authService.js`.

### Document endpoints

Defined in `backend/documents/urls.py`.

| Method | Full path | View | Request | Success output |
|---|---|---|---|---|
| GET | `/api/documents/` | `DocumentListCreateView` | Bearer token | List of documents owned by user |
| POST | `/api/documents/` | `DocumentListCreateView` | multipart `file` | `{ message, document, processing }` or processing-failure response |
| GET | `/api/documents/<pk>/` | `DocumentDetailView` | Bearer token | One owned document |
| DELETE | `/api/documents/<pk>/` | `DocumentDetailView` | Bearer token | 204 |
| POST | `/api/documents/search/` | `DocumentSearchView` | `query`, optional `top_k` | `{ success, query, count, results }` |
| POST | `/api/documents/ask/` | `DocumentAskView` | `question`, optional `top_k` | `{ success, question, answer, sources }` |

Frontend callers:

- `documentService.js` → list/upload/delete.
- `searchService.js` → search.
- `chatService.js` → ask, but `frontend/src/pages/Chat.jsx` does **not** import this service.

### Web-source endpoints

Defined in `backend/documents/urls.py`.

| Method | Full path | View | Request | Success output |
|---|---|---|---|---|
| GET | `/api/documents/web-sources/` | `WebSourceListCreateView` | Bearer token | List of owned web sources with pages |
| POST | `/api/documents/web-sources/` | `WebSourceListCreateView` | `url`, optional `max_pages` | Serialized source plus `embedding_result` |
| GET | `/api/documents/web-sources/<pk>/` | `WebSourceDetailView` | Bearer token | One owned source |
| DELETE | `/api/documents/web-sources/<pk>/` | `WebSourceDetailView` | Bearer token | `{ message }` |

Frontend caller: `webSourceService.js`.

**Verified mismatch:** `webSourceService.js` sends `root_url`, but `WebSourceCreateSerializer` expects `url`.

### Conversation endpoints

Defined in `backend/conversations/urls.py`.

| Method | Full path | View | Request | Success output |
|---|---|---|---|---|
| GET | `/api/conversations/` | `ConversationListCreateView` | Bearer token | List of owned conversations |
| POST | `/api/conversations/` | `ConversationListCreateView` | optional `title` | Created conversation |
| GET | `/api/conversations/<pk>/` | `ConversationDetailView` | Bearer token | Conversation with messages |
| DELETE | `/api/conversations/<pk>/` | `ConversationDetailView` | Bearer token | 204 |
| POST | `/api/conversations/<pk>/ask/` | `ConversationAskView` | `question`, optional `top_k` | `{ success, conversation_id, answer, sources, message }` |

Frontend caller: `conversationService.js`, used by `Chat.jsx`.

---

## 3. Backend configuration files

### `backend/config/settings.py`

**Inputs:** environment variables loaded from `backend/.env` via `load_dotenv()`.

**Important settings:**

- MySQL engine with `utf8mb4`.
- DB names read from `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`.
- `CORS_ALLOWED_ORIGINS` limited to local Vite origins.
- DRF default permission: `IsAuthenticated`.
- DRF default authentication: `JWTAuthentication`.
- Media root: `BASE_DIR / "media"`, `MEDIA_URL = "/media/"`.
- Upload limits: 20 MB for both data and file upload memory.
- Installed apps include `documents`, `accounts`, `conversations`.

**Security note:** The file contains a hardcoded development secret key, `DEBUG = True`, and empty `ALLOWED_HOSTS`. Values are intentionally not reproduced.

**Caller:** Django startup through `manage.py`, WSGI, or ASGI.

### `backend/config/urls.py`

**Input:** incoming request path.

**Output:** dispatch to admin or included app URL configs.

**Prefixes:**

- `/admin/`
- `/api/auth/`
- `/api/documents/`
- `/api/conversations/`

### `backend/config/wsgi.py` and `backend/config/asgi.py`

**Output:** module-level `application` callable.

**Caller:** a WSGI/ASGI server. No production server config was found in the repository.

---

## 4. Accounts app

### `backend/accounts/models.py`

No custom model is defined. The app uses Django's built-in `User`.

### `backend/accounts/serializers.py`

#### `RegisterSerializer(serializers.ModelSerializer)`

**Fields:** `id`, `username`, `email`, `password`.

**Inputs:** registration payload.

**Validation:**

- `password` is write-only, minimum length 8.
- `validate_email()` strips/lowercases email and rejects duplicates case-insensitively.
- `validate_username()` strips username and rejects duplicates case-insensitively.

**Output:** `User.objects.create_user(**validated_data)`.

**Caller:** `RegisterView`.

### `backend/accounts/views.py`

#### `RegisterView(generics.CreateAPIView)`

- Permission: `AllowAny`.
- Serializer: `RegisterSerializer`.

#### `CurrentUserView(APIView)`

- Permission: `IsAuthenticated`.
- `get()` returns `{ id, username, email }` from `request.user`.

### `backend/accounts/urls.py`

Maps register, login, refresh, and me endpoints. Login and refresh are provided by Simple JWT views.

---

## 5. Documents models — `backend/documents/models.py`

### `document_upload_path(instance, filename)`

**Input:** document instance and uploaded filename.

**Output:** path shaped like:

```text
documents/user_<user_id>/<document_id><extension>
```

**Caller:** `Document.file` upload_to.

### `Document`

**Fields:**

- `uploaded_by` FK to user, related name `documents`.
- `title`
- `file`
- `file_size`
- `status`: uploaded, processing, completed, failed.
- `created_at`, `updated_at`.

**Meta:** ordering by `-created_at`.

**Caller:** document serializer/views and `process_document()`.

### `DocumentChunk`

**Fields:**

- `document` FK, related name `chunks`.
- `chunk_number`, `page_number`, `content`, `embedding` JSON nullable.
- `created_at`.

**Constraints:** unique `(document, chunk_number)`.

**Index:** `(document, page_number)`.

**Callers:** `process_document()`, `search_knowledge()`, `search_documents()`.

### `WebSource`

**Status enum:** queued, processing, completed, failed.

**Fields:**

- `user` FK, related name `web_sources`.
- `root_url`, `title`, `status`, `max_pages`, `pages_count`, `error_message`.
- timestamps and `last_crawled_at`.

**Caller:** web views and web-source serializer.

### `WebPage`

**Fields:** `source` FK, `url`, `title`, `content`, `created_at`.

**Constraint:** unique `(source, url)`.

**Callers:** `WebSourceListCreateView.post()`, `process_web_source()`, search by relation.

### `WebPageChunk`

**Fields:** `page` FK, `chunk_number`, `content`, `embedding`, `created_at`.

**Constraint:** unique `(page, chunk_number)`.

**Index:** `(page, chunk_number)`.

**Callers:** `process_web_page()`, `search_knowledge()`.

---

## 6. Documents serializers

### `backend/documents/serializers.py`

#### `DocumentAskSerializer`

- `question`: required, non-blank, max 1000.
- `top_k`: optional, default 5, 1–10.

Caller: `DocumentAskView.post()`.

#### `DocumentSearchSerializer`

- `query`: required, non-blank, max 1000.
- `top_k`: optional, default 5, 1–10.

Caller: `DocumentSearchView.post()`.

#### `DocumentSerializer`

**Fields:** `id`, `title`, `file`, `file_size`, `status`, `created_at`.

`file` is write-only. Other listed fields are read-only.

`validate_file(uploaded_file)`:

1. Extension must be `.pdf`.
2. Size must not exceed `20 * 1024 * 1024`.
3. First five bytes must equal `b"%PDF-"`.
4. Pointer is reset with `seek(0)`.

`create(validated_data)`:

- Derives `title` from filename without extension.
- Sets `file_size`.
- Calls `super().create()`.

Caller: `DocumentListCreateView`.

### `backend/documents/web_serializers.py`

#### `WebPageSerializer`

Fields: `id`, `url`, `title`, `content`, `created_at`.

#### `WebSourceSerializer`

Includes nested `pages` and fields such as `root_url`, `title`, `status`, `max_pages`, `pages_count`, `error_message`, timestamps.

#### `WebSourceCreateSerializer`

- `url`: `URLField(max_length=2048)`.
- `max_pages`: default 5, min 1, max 20.

Caller: `WebSourceListCreateView.post()`.

**Verified mismatch:** frontend sends `root_url`.

---

## 7. Documents views

### `backend/documents/views.py`

#### `DocumentListCreateView(generics.ListCreateAPIView)`

- Permission: `IsAuthenticated`.
- Parsers: `MultiPartParser`, `FormParser`.
- `get_queryset()` filters `uploaded_by=request.user`.
- `create()`:
  1. Validates `DocumentSerializer`.
  2. Saves with `uploaded_by=request.user`.
  3. Calls `process_document(document)`.
  4. Returns 201 with processing result.
  5. On exception returns 201 with a generic processing-failure response.

**Caller:** `POST/GET /api/documents/`.

#### `DocumentAskView(APIView)`

- Permission: `IsAuthenticated`.
- `post()` validates `DocumentAskSerializer`.
- Calls `ask_documents(user, question, top_k)`.
- Returns answer/sources or generic 500.

**Caller:** `POST /api/documents/ask/`.

#### `DocumentDetailView(generics.RetrieveDestroyAPIView)`

- Filters by owner.
- `perform_destroy()` deletes the stored file then the DB row.

#### `DocumentSearchView(APIView)`

- Validates `query` and `top_k`.
- Calls `search_knowledge()`.
- Returns `count` and result metadata.

### `backend/documents/web_views.py`

#### `WebSourceListCreateView(APIView)`

`get()`:

- Lists sources for `request.user`.
- Uses `prefetch_related("pages")`.

`post()`:

1. Validates `WebSourceCreateSerializer`.
2. Creates `WebSource` with `root_url=url` and status processing.
3. Calls `crawl_website(start_url=url, max_pages=max_pages)`.
4. Saves pages with `update_or_create`.
5. Sets title from first page and `pages_count`.
6. Calls `process_web_source(source)`.
7. Marks completed and sets `last_crawled_at`.
8. Returns serialized source plus `embedding_result`.
9. On exception marks failed, stores trimmed `error_message`, returns 400.

#### `WebSourceDetailView(APIView)`

- `get_source()` uses `get_object_or_404(WebSource, pk=pk, user=request.user)`.
- `get()` serializes one source.
- `delete()` deletes source and cascaded related rows.

---

## 8. Documents service layer

### `backend/documents/services/pdf_extractor.py`

#### `extract_pdf_text(file_path)`

**Input:** filesystem path to uploaded PDF.

**Output:** list of `{ page_number, text }` for pages with non-empty text.

**Side effects:** none.

**Raises:**

- `ValueError` for encrypted PDFs.
- `ValueError` for zero pages.
- `ValueError` when no readable text is found, for example scanned images.

**Caller:** `process_document()`.

### `backend/documents/services/text_chunker.py`

#### `chunk_text(text, chunk_size=1000, overlap=200)`

**Input:** string.

**Output:** list of chunk strings.

**Behavior:**

- Validates `chunk_size > 0`.
- Validates `0 <= overlap < chunk_size`.
- Prefers the last space before `end` as a boundary.
- Starts the next chunk at `end - overlap`.

**Caller:** `chunk_pages()` and `process_web_page()`.

#### `chunk_pages(extracted_pages, chunk_size=1000, overlap=200)`

**Input:** output of `extract_pdf_text()`.

**Output:** list of `{ chunk_number, page_number, content }`.

**Caller:** `process_document()`.

### `backend/documents/services/embedding_service.py`

#### `get_embedding_model()`

**Output:** cached `SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")`.

**Side effect:** stores model in module-level `_model`.

**Caller:** `generate_embeddings()`.

#### `generate_embeddings(texts)`

**Input:** list of strings.

**Output:**

- `[]` for empty input.
- NumPy array with `convert_to_numpy=True` and `normalize_embeddings=True`.

**Expected shape:** `(N, 384)`.

**Callers:** `process_document()`, `process_web_page()`, `_search_faiss()`.

### `backend/documents/services/document_processor.py`

#### `process_document(document)`

**Input:** saved `Document` instance.

**Steps:**

1. Sets status to `processing`.
2. Calls `extract_pdf_text(document.file.path)`.
3. Calls `chunk_pages(..., chunk_size=1000, overlap=200)`.
4. Raises if no chunks.
5. Calls `generate_embeddings(texts)`.
6. Inside `transaction.atomic()`, deletes existing chunks and bulk-creates new `DocumentChunk` rows with `embedding.tolist()`.
7. Sets status to `completed`.

**Output:**

```python
{
    "status": "completed",
    "pages": len(pages),
    "chunks": len(chunks),
    "embeddings": len(embeddings),
    "dimensions": int(embeddings.shape[1]),
}
```

**Failure:** sets status `failed` and re-raises.

**Caller:** `DocumentListCreateView.create()`.

### `backend/documents/services/web_crawler.py`

Constants:

- `USER_AGENT = "KnowHubBot/1.0"`
- `REQUEST_TIMEOUT = 15`
- `MAX_PAGE_SIZE = 2 * 1024 * 1024`
- `MAX_REDIRECTS = 5`

#### `CrawlerError(Exception)`

Raised for unsafe or invalid crawl operations.

#### `validate_public_url(url)`

**Output:** parsed URL.

**Checks:** HTTP/HTTPS, hostname, no URL credentials, ports 80/443 only, no localhost, DNS resolution, all resolved IPs must be global.

#### `safe_fetch(url)`

**Output:** `{ url, status_code, content_type, content }`.

**Checks:** validates each redirect target, manual redirect handling, max five redirects, HTTP errors, `Content-Length`, streamed 2 MB cap.

#### `get_robots_parser(base_url)`

**Output:** `RobotFileParser`.

**Behavior:** fetches `/robots.txt` through `safe_fetch()`, parses lines on 200, otherwise allows all; fails closed on `CrawlerError`.

#### `extract_page_content(html)`

**Output:** `{ title, content, links }`.

**Behavior:** removes script/style/nav/footer/etc., prefers `main`, then `article`, then `body`, normalizes whitespace, collects anchor hrefs.

#### `crawl_website(start_url, max_pages=5, max_depth=2)`

**Output:**

```python
{
    "start_url": start_url,
    "total_pages": len(pages),
    "pages": pages,
    "errors": errors,
}
```

**Behavior:** validates input bounds, validates start URL, reads robots.txt, BFS queue, same-host filtering, robots check, HTML-only extraction, 0.5s sleep, collects errors per page.

**Caller:** `WebSourceListCreateView.post()`.

### `backend/documents/services/web_embedding_service.py`

#### `process_web_page(page)`

**Output:** integer chunk count.

**Behavior:**

- Deletes existing chunks if page content is empty.
- Chunks with `chunk_size=1000`, `overlap=200`.
- Generates embeddings.
- Raises if embedding count mismatches chunk count.
- Replaces chunks inside `transaction.atomic()`.

#### `process_web_source(source)`

**Input:** `WebSource`.

**Output:** `{ processed_pages, total_chunks }`.

**Caller:** `WebSourceListCreateView.post()`.

### `backend/documents/services/vector_search.py`

Constant: `DIMENSIONS = 384`.

#### `_search_faiss(query, records, top_k)`

**Input records:** list of `{ embedding, metadata }`.

**Steps:**

1. Returns `[]` for no records.
2. Converts embeddings to `np.float32`.
3. Validates 2D shape and 384 dimensions.
4. Rejects NaN/Inf with `np.isfinite`.
5. Builds fresh `faiss.IndexFlatIP(DIMENSIONS)`.
6. Adds vectors.
7. Embeds the query.
8. Searches `min(top_k, len(records))`.
9. Maps positions back to metadata and adds rounded `similarity`.

**Output:** list of metadata dictionaries with `similarity`.

**Callers:** `search_knowledge()`, `search_documents()`.

#### `search_knowledge(user, query, top_k=5)`

**Input:** user, query string, top_k.

**Steps:**

1. Trims query; returns `[]` if blank.
2. Collects owned `DocumentChunk` rows with embeddings.
3. Collects owned `WebPageChunk` rows with embeddings.
4. Builds unified metadata:
   - PDF: `source_type="pdf"`, `page_number`, `page_url=None`.
   - Website: `source_type="website"`, `page_number=None`, `page_url`, `web_source_id`.
5. Calls `_search_faiss()`.

**Callers:** `DocumentSearchView`, `ask_documents()`.

#### `search_documents(user, query, top_k=5)`

PDF-only compatibility function. It builds records only from `DocumentChunk` and calls `_search_faiss()`.

**Caller:** `backend/documents/tests/test_vector_search.py`.

### `backend/documents/services/rag_service.py`

#### `ask_documents(user, question, top_k=5)`

**Steps:**

1. Trims question; raises `ValueError` if blank.
2. Calls `search_knowledge()`.
3. If no results, returns fixed no-information answer and empty sources **without calling Ollama**.
4. Builds `SOURCE n` context blocks.
   - PDF: document title and page number.
   - Website: title and URL.
5. Calls `generate_answer(question, context)`.
6. Builds sources with source type, ids/titles, page/url, similarity.
7. Returns `{ answer, sources }`.

**Callers:** `DocumentAskView.post()`, `ConversationAskView.post()`.

### `backend/documents/services/llm_service.py`

Constants:

- `OLLAMA_URL = "http://127.0.0.1:11434/api/generate"`
- `OLLAMA_MODEL = "qwen2.5:0.5b"`

#### `generate_answer(question, context)`

**Input:** question string and context string.

**Behavior:**

- Raises for blank question.
- Returns fixed no-information message for blank context.
- Builds a prompt requiring only-context answers, no invented facts, and treating document content as reference data rather than instructions.
- POSTs JSON with `model`, `prompt`, `stream=False`, `temperature=0.2`, `num_predict=400`, `timeout=180`.
- Calls `raise_for_status()`.
- Reads `response` field and strips it.
- Raises if the answer is empty.

**Output:** answer string.

**Caller:** `ask_documents()`.

---

## 9. Conversations app

### `backend/conversations/models.py`

#### `Conversation`

Fields: `user`, `title` default `"New Chat"`, timestamps. Ordering by `-updated_at`.

#### `Message`

Fields: `conversation`, `role` (`user`/`assistant`), `content`, `sources` JSON list default empty, `created_at`. Ordering by `created_at`.

### `backend/conversations/serializers.py`

- `MessageSerializer`: `id`, `role`, `content`, `sources`, `created_at`.
- `ConversationSerializer`: `id`, `title`, timestamps.
- `ConversationDetailSerializer`: conversation fields plus nested `messages`.

### `backend/conversations/views.py`

#### `ConversationListCreateView(APIView)`

- `get()` filters by `request.user`.
- `post()` validates title is text, trims/defaults/truncates to 255, creates conversation.

#### `ConversationDetailView(APIView)`

- `get_conversation()` uses `get_object_or_404(..., user=request.user)`.
- `get()` returns detail serializer.
- `delete()` deletes the conversation and returns 204.

#### `ConversationAskView(APIView)`

**Input:** `question`, optional `top_k`.

**Validation:**

- Question must be non-blank string, max 1000.
- `top_k` must be integer, not bool, between 1 and 10.

**Flow:**

1. Resolves owned conversation.
2. Calls `ask_documents()` before saving anything.
3. Returns 500 with generic message on generation failure.
4. Inside `transaction.atomic()`:
   - Creates user `Message`.
   - Creates assistant `Message` with `sources`.
   - If message count is 2 and title is `"New Chat"`, sets title to first 60 characters of the question.
5. Returns answer, sources, and serialized assistant message.

**Important limitation:** previous messages are not passed to retrieval or generation.

---

## 10. Frontend services

### `frontend/src/services/api.js`

**Output:** configured Axios instance.

**Request interceptor:**

- Reads `access_token` from `localStorage`.
- Adds Bearer authorization.
- Deletes `Content-Type` for `FormData`.

**Response interceptor:**

- On 401, if not already retried and not auth login/refresh:
  - Reads `refresh_token`.
  - Calls refresh endpoint with raw Axios.
  - Stores new access token.
  - Retries original request once.
  - Clears both tokens if refresh fails.

**Caller:** all other frontend services.

### `frontend/src/services/authService.js`

- `register(userData)` → `POST auth/register/`.
- `login(email, password)` → `POST auth/login/` with `{ username: email, password }`; stores tokens.
- `getCurrentUser()` → `GET auth/me/`.
- `logout()` → removes tokens.

### `frontend/src/services/documentService.js`

- `getDocuments()` → `GET documents/`.
- `uploadDocument(file)` → builds `FormData` with field `file` → `POST documents/`.
- `deleteDocument(id)` → `DELETE documents/<id>/`.

### `frontend/src/services/searchService.js`

- `searchDocuments(query, topK=5)` → `POST documents/search/` with `{ query, top_k }`.

### `frontend/src/services/webSourceService.js`

- `getWebSources()` → `GET documents/web-sources/`.
- `createWebSource(rootUrl, maxPages=5)` → `POST documents/web-sources/` with `{ root_url, max_pages }` — **verified mismatch**.
- `getWebSource(id)`, `deleteWebSource(id)`.

### `frontend/src/services/conversationService.js`

Exports:

- `getConversations()`
- `createConversation(title="New Chat")`
- `getConversation(conversationId)`
- `askConversation(conversationId, question, topK=5)`
- `deleteConversation(conversationId)`

Used by `Chat.jsx`.

### `frontend/src/services/chatService.js`

- `askQuestion(question, topK=5)` → `POST documents/ask/`.

Exists but is not used by `Chat.jsx`.

---

## 11. Frontend pages and components

### `frontend/src/main.jsx`

Mounts React in StrictMode with MUI ThemeProvider, CssBaseline, and BrowserRouter.

### `frontend/src/App.jsx`

Public routes: `/login`, `/register`.

Protected layout routes: `/dashboard`, `/documents`, `/web-sources`, `/search`, `/chat`.

Default and wildcard routes redirect to `/dashboard`.

### `frontend/src/components/DashboardLayout.jsx`

- Navigation items: Dashboard, Documents, Web Sources, Search, AI Chat.
- On mount calls `authService.getCurrentUser()`.
- On failure logs out and navigates to `/login`.
- Provides logout button.

### `frontend/src/pages/Register.jsx`

- Form state includes `username`, `email`, `password`, `confirmPassword`.
- Checks password confirmation locally.
- Sends `username: form.email` and `email: form.email`.
- Typed username is unused — **verified mismatch**.

### `frontend/src/pages/Login.jsx`

Uses `authService.login(email, password)` and navigates after success.

### `frontend/src/pages/Documents.jsx`

- Lists documents.
- Client validation: `.pdf` extension, optional MIME check, max 20 MB.
- Upload via `documentService.uploadDocument`.
- Delete via `documentService.deleteDocument`.
- Local filtering by title and status.
- Displays counts for completed, processing, failed.

### `frontend/src/pages/WebSources.jsx`

- Lists sources.
- Adds source through `webSourceService.createWebSource(rootUrl, Number(maxPages))`.
- Displays crawling/delete status.
- Error extraction looks at `detail`, `root_url[0]`, then `error`.
- No page-refresh endpoint is wired; a `Refresh` icon reloads the list from the backend.

### `frontend/src/pages/Search.jsx`

- Calls `searchDocuments(query.trim(), 5)`.
- Displays document title, a `Page` chip, content, and similarity.
- Always renders `Page ${result.page_number}` — **verified mismatch** for website results where `page_number` is `null`.

### `frontend/src/pages/Chat.jsx`

State: conversations, active conversation, messages, question, loading flags, error, history visibility.

Key functions:

- `loadConversations()` — fetches conversation list.
- `openConversation(id)` — fetches detail and messages.
- `handleNewChat()` — clears local active state.
- `handleDeleteConversation(event, id)` — confirms and deletes.
- `handleSend(event)` — creates a conversation if needed, calls `askConversation()`, refetches persisted conversation, refreshes list.

Citation rendering:

- Detects website sources using `source_type === "website"` or `page_url`.
- Shows Website/PDF chip.
- Renders URL link for website sources.
- Shows `Page n` only when `page_number != null`.
- Shows similarity with three decimals.

---

## 12. Data flow call graphs

### PDF upload

```text
Documents.jsx handleUpload()
  -> documentService.uploadDocument(file)
  -> POST /api/documents/
  -> DocumentListCreateView.create()
  -> DocumentSerializer.validate_file()
  -> serializer.save(uploaded_by=request.user)
  -> process_document(document)
     -> extract_pdf_text()
     -> chunk_pages() -> chunk_text()
     -> generate_embeddings() -> get_embedding_model()
     -> DocumentChunk.objects.bulk_create()
  -> JSON response
```

### Website ingest

```text
WebSources.jsx handleAddWebsite()
  -> webSourceService.createWebSource(rootUrl, maxPages)
  -> POST /api/documents/web-sources/
  -> WebSourceCreateSerializer
  -> WebSource.objects.create(...)
  -> crawl_website()
     -> validate_public_url()
     -> get_robots_parser() -> safe_fetch()
     -> safe_fetch()
     -> extract_page_content()
  -> WebPage.objects.update_or_create()
  -> process_web_source()
     -> process_web_page()
        -> chunk_text()
        -> generate_embeddings()
        -> WebPageChunk.objects.bulk_create()
  -> serialized response
```

### Search

```text
Search.jsx handleSearch()
  -> searchService.searchDocuments()
  -> POST /api/documents/search/
  -> DocumentSearchView.post()
  -> search_knowledge()
     -> DocumentChunk query (owned)
     -> WebPageChunk query (owned)
     -> _search_faiss()
        -> np.asarray()
        -> IndexFlatIP
        -> generate_embeddings([query])
        -> index.search()
  -> response with results and similarity
```

### RAG answer

```text
Chat.jsx handleSend()
  -> createConversation() if needed
  -> askConversation()
  -> POST /api/conversations/<pk>/ask/
  -> ConversationAskView.post()
  -> ask_documents()
     -> search_knowledge()
     -> build SOURCE blocks
     -> generate_answer()
        -> requests.post(OLLAMA_URL, ...)
  -> persist user and assistant Messages transactionally
  -> response
  -> Chat.jsx refetches conversation and messages
```

### Authentication and retry

```text
Login.jsx
  -> authService.login()
  -> store access/refresh tokens
  -> api.js request interceptor adds Bearer token
  -> protected API call returns 401
  -> api.js response interceptor refreshes token
  -> retries original request once
```

---

## 13. Test and exploratory files

| Path | What it actually is |
|---|---|
| `backend/accounts/tests.py` | Empty Django test template. |
| `backend/documents/tests.py` | Empty Django test template. |
| `backend/conversations/tests.py` | URL patterns copied from `conversations/urls.py`; not a real test module. |
| `backend/documents/tests/test_vector_search.py` | Script that queries the first `User`, calls `search_documents()`, and prints results. No assertions. |
| `backend/test_text_chunker.py` | Script using a hard-coded local PDF path and printing chunk previews. |
| `backend/test_pdf_extractor.py` | Script using a hard-coded local PDF path and printing page previews. |
| `backend/test_embeddings.py` | Script extracting, chunking, embedding a local PDF, and printing vector shape/samples. |
| `backend/test_mistral.py` | Exploratory third-party API script containing a hardcoded key. Not part of application runtime. Key value intentionally not reproduced. |

No automated test suite was run while preparing this guide.

---

## 14. Known code gaps to mention in an interview

1. `webSourceService.js` sends `root_url`; backend expects `url`.
2. `Register.jsx` ignores typed username and uses email as username.
3. `Search.jsx` always shows a `Page` chip.
4. `chatService.js` exists but `Chat.jsx` uses `conversationService.js`.
5. FAISS index is rebuilt per search and is not persisted.
6. Processing and crawling are synchronous inside HTTP requests.
7. Conversation history is stored but not used in retrieval/generation.
8. No automated tests prove authorization or endpoint contracts.
9. No production deployment configuration found.
10. Development settings are not production-safe.

These are implementation gaps, not reasons to dismiss the project. They are strong evidence that you can inspect code honestly and propose realistic improvements.

---

## 15. Interview questions from this code index

### Q1. Which function converts PDF text into vectors?

`generate_embeddings()` in `backend/documents/services/embedding_service.py`, using `SentenceTransformer` and `normalize_embeddings=True`.

### Q2. Which function is the single entry point for mixed PDF/web retrieval?

`search_knowledge(user, query, top_k=5)` in `backend/documents/services/vector_search.py`.

### Q3. Where are source citations created?

`ask_documents()` builds the `sources` list from retrieval results; `ConversationAskView.post()` stores it in `Message.sources`.

### Q4. Where does the Ollama call happen?

`generate_answer()` in `backend/documents/services/llm_service.py`.

### Q5. What deletes a physical PDF file?

`DocumentDetailView.perform_destroy()` calls `instance.file.delete(save=False)` before deleting the row.

### Q6. Which service validates public URLs before crawling?

`validate_public_url()` in `backend/documents/services/web_crawler.py`.

### Q7. How is user isolation implemented?

List views filter by `request.user`; detail views use `get_object_or_404(..., user=request.user)`; retrieval filters chunks by ownership relations.

### Q8. Which endpoint does `Chat.jsx` actually use?

`conversationService.js`, which calls `/api/conversations/...`. It does not use `chatService.js`.

### Q9. Where is frontend token refresh implemented?

`frontend/src/services/api.js` response interceptor.

### Q10. Why is FAISS search exact here?

`_search_faiss()` uses `faiss.IndexFlatIP`, a flat inner-product index over normalized vectors.

### Q11. Which code marks a document as failed?

`process_document()` catches exceptions, sets `document.status = "failed"`, saves, and re-raises.

### Q12. Which code marks a web source as failed?

`WebSourceListCreateView.post()` catches exceptions, sets status failed, stores a trimmed error message, and returns 400.

### Q13. Where is the chat title first changed from “New Chat”?

`ConversationAskView.post()`, after the first user and assistant messages are saved.

### Q14. Does the model see previous chat messages?

No. `ask_documents()` receives only the current question and retrieved chunks.

### Q15. What is the fastest way to prove the web-source contract mismatch?

Compare `frontend/src/services/webSourceService.js` payload `root_url` with `backend/documents/web_serializers.py` field `url`.

---

## 16. Final advice

When asked to walk through code, use this order:

1. Start at `backend/config/urls.py`.
2. Open the relevant view.
3. Open the serializer or validation.
4. Open the service function.
5. Follow model writes or retrieval.
6. Return to the frontend service and page.
7. State one verified limitation.

That pattern proves you understand the system without guessing.
