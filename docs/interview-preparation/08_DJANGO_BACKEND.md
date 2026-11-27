# 08 — Django REST Framework Backend

---

## 1. Project structure

```text
backend/
├── config/
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── accounts/
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   ├── models.py
│   ├── apps.py
│   └── admin.py
├── documents/
│   ├── models.py
│   ├── serializers.py
│   ├── web_serializers.py
│   ├── views.py
│   ├── web_views.py
│   ├── urls.py
│   ├── services/
│   │   ├── pdf_extractor.py
│   │   ├── text_chunker.py
│   │   ├── embedding_service.py
│   │   ├── document_processor.py
│   │   ├── vector_search.py
│   │   ├── rag_service.py
│   │   ├── llm_service.py
│   │   ├── web_crawler.py
│   │   └── web_embedding_service.py
│   └── migrations/
├── conversations/
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   └── migrations/
├── manage.py
└── media/
```

Note: a second `backend/apps/accounts/` directory exists, but `INSTALLED_APPS` contains `"accounts"`, so `backend/accounts/` is the active app.

---

## 2. Installed apps and middleware

`config/settings.py`:

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    "rest_framework",
    "corsheaders",
    "documents",
    "accounts",
    "conversations",
]
```

Middleware order begins with CORS, then Django security/session/common/CSRF/auth/messages/clickjacking middleware.

Important settings:

| Setting | Actual value/behavior |
|---|---|
| `DEBUG` | `True` — development only |
| `SECRET_KEY` | Hardcoded development key — value intentionally not reproduced |
| `ALLOWED_HOSTS` | `[]` |
| Database engine | `django.db.backends.mysql` |
| DB env names | `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` |
| `CORS_ALLOWED_ORIGINS` | localhost/127.0.0.1 on port 5173 |
| Default permission | `IsAuthenticated` |
| Default auth | `JWTAuthentication` |
| `MEDIA_ROOT` | `BASE_DIR / "media"` |
| Upload limits | 20 MB |
| Time zone | UTC, `USE_TZ=True` |

README shows DB variable names `DB_NAME`/`DB_USER`, but the code reads `DB_DATABASE`/`DB_USERNAME`. This is a verified documentation mismatch.

---

## 3. Why business logic lives in services

Views are thin: they parse input, check permissions, call a service, and shape the response. Business logic lives in `documents/services/`.

Benefits:

- views remain short and readable;
- extraction, chunking, embedding, search, and LLM logic are reusable;
- services can be called from both documents and conversations;
- individual functions have clear inputs/outputs;
- in production, services could become Celery tasks.

Examples:

- `DocumentListCreateView` calls `process_document()`.
- `DocumentSearchView` calls `search_knowledge()`.
- `DocumentAskView` and `ConversationAskView` both call `ask_documents()`.

---

## 4. DRF request flow

```text
URL match (config/urls.py)
  -> app URLconf (accounts/documents/conversations urls.py)
  -> APIView/generic view .as_view()
  -> authentication (JWTAuthentication)
  -> permission check (IsAuthenticated)
  -> parser (JSONParser or MultiPartParser)
  -> serializer validation
  -> service call
  -> ORM query / AI operation
  -> Response serialization
  -> JSON to client
```

---

## 5. Complete endpoint reference

All endpoints require JWT except `register` and `login`. Token refresh itself does not require an access token.

### 5.1 Authentication

| Method | Endpoint | View | Auth |
|---|---|---|---|
| POST | `/api/auth/register/` | `RegisterView` | `AllowAny` |
| POST | `/api/auth/login/` | `TokenObtainPairView` | No access token required |
| POST | `/api/auth/token/refresh/` | `TokenRefreshView` | Refresh token in body |
| GET | `/api/auth/me/` | `CurrentUserView` | `IsAuthenticated` |

#### `POST /api/auth/register/`

Request:

```json
{
  "username": "user@example.com",
  "email": "user@example.com",
  "password": "at least 8 chars"
}
```

Validation in `RegisterSerializer`:

- password write-only, `min_length=8`;
- email trimmed/lowercased and checked with `email__iexact`;
- username trimmed and checked with `username__iexact`;
- `create_user()` hashes the password.

Response: `id`, `username`, `email`.

Errors: duplicate email/username → 400 with field errors.

Frontend note: `Register.jsx` sends `username: form.email`; the typed username input is not used in the payload.

#### `POST /api/auth/login/`

Standard Simple JWT obtain-pair view. Request:

```json
{"username": "user@example.com", "password": "..."}
```

Response includes `access` and `refresh`. The frontend uses the email as `username`.

#### `POST /api/auth/token/refresh/`

Request:

```json
{"refresh": "<refresh token>"}
```

Response:

```json
{"access": "<new access token>"}
```

#### `GET /api/auth/me/`

Response from `CurrentUserView`:

```json
{"id": 1, "username": "...", "email": "..."}
```

---

### 5.2 Documents

| Method | Endpoint | View |
|---|---|---|
| GET | `/api/documents/` | `DocumentListCreateView` |
| POST | `/api/documents/` | `DocumentListCreateView` |
| DELETE | `/api/documents/{id}/` | `DocumentDetailView` |
| POST | `/api/documents/search/` | `DocumentSearchView` |
| POST | `/api/documents/ask/` | `DocumentAskView` |

#### `POST /api/documents/`

- Parser: `MultiPartParser`, `FormParser`.
- Serializer: `DocumentSerializer`.
- Validation: `.pdf`, ≤20 MB, `%PDF-` signature.
- DB: creates `Document` with `uploaded_by=request.user`.
- Service: `process_document(document)`.
- Success: HTTP 201 with message, document, and processing summary.
- Processing failure: HTTP 201 with generic failure message.
- Validation failure: HTTP 400 from DRF.

#### `GET /api/documents/`

- `get_queryset()` filters `uploaded_by=self.request.user`.
- Serializer output fields: `id`, `title`, `file_size`, `status`, `created_at`.
- `file` is write-only.
- No pagination is configured.

#### `DELETE /api/documents/{id}/`

- Queryset restricted to owner.
- `perform_destroy()` deletes the file from storage, then the DB row.
- Cascades to `DocumentChunk`.
- Success: HTTP 204.
- Other user's ID: 404.

#### `POST /api/documents/search/`

Request:

```json
{"query": "leave policy", "top_k": 5}
```

Validation in `DocumentSearchSerializer`:

- `query`: required, nonblank, max 1000.
- `top_k`: optional, default 5, min 1, max 10.

Service: `search_knowledge(user, query, top_k)`.

Success response:

```json
{
  "success": true,
  "query": "leave policy",
  "count": 3,
  "results": [
    {
      "source_type": "pdf",
      "chunk_id": 10,
      "document_id": 2,
      "document_title": "handbook",
      "page_number": 4,
      "page_url": null,
      "content": "...",
      "similarity": 0.7123
    }
  ]
}
```

Errors: validation 400; service exception 500 with generic message.

#### `POST /api/documents/ask/`

Request:

```json
{"question": "What is the leave policy?", "top_k": 5}
```

Validation in `DocumentAskSerializer` mirrors search but uses `question`.

Service: `ask_documents()`.

Success:

```json
{
  "success": true,
  "question": "What is the leave policy?",
  "answer": "...",
  "sources": [{"source_type": "pdf", "...": "..."}]
}
```

Errors: validation 400; service exception 500.

---

### 5.3 Website sources

| Method | Endpoint | View |
|---|---|---|
| GET | `/api/documents/web-sources/` | `WebSourceListCreateView` |
| POST | `/api/documents/web-sources/` | `WebSourceListCreateView` |
| GET | `/api/documents/web-sources/{id}/` | `WebSourceDetailView` |
| DELETE | `/api/documents/web-sources/{id}/` | `WebSourceDetailView` |

#### `POST /api/documents/web-sources/`

Expected request:

```json
{"url": "https://example.com", "max_pages": 5}
```

Verified frontend bug: `webSourceService.js` sends `root_url`, so it does not match `WebSourceCreateSerializer.url`.

Validation:

- `url`: `URLField(max_length=2048)`;
- `max_pages`: 1–20, default 5.

DB operations:

- create `WebSource(status=processing)`;
- `WebPage.objects.update_or_create(source=source, url=..., defaults={title, content})`;
- update title, pages_count, status, last_crawled_at, error_message.

Services:

- `crawl_website(start_url=url, max_pages=max_pages)`;
- `process_web_source(source)`.

Success: 201 with serialized source and `embedding_result`.

Failure: 400 with `message`, `error`, `source_id`.

#### `GET /api/documents/web-sources/`

User-filtered and `prefetch_related("pages")`. Nested pages include full content.

#### `GET /api/documents/web-sources/{id}/`

`get_object_or_404(WebSource, pk=pk, user=request.user)`.

#### `DELETE /api/documents/web-sources/{id}/`

Owner-only delete, cascades to pages/chunks, returns 200 with message.

---

### 5.4 Conversations

| Method | Endpoint | View |
|---|---|---|
| GET | `/api/conversations/` | `ConversationListCreateView` |
| POST | `/api/conversations/` | `ConversationListCreateView` |
| GET | `/api/conversations/{id}/` | `ConversationDetailView` |
| DELETE | `/api/conversations/{id}/` | `ConversationDetailView` |
| POST | `/api/conversations/{id}/ask/` | `ConversationAskView` |

#### `POST /api/conversations/`

Request:

```json
{"title": "My chat"}
```

Manual validation: title must be string; stripped; defaults to `"New Chat"`; truncated to 255 chars.

Response: `id`, `title`, `created_at`, `updated_at`.

#### `GET /api/conversations/`

User-filtered. Model orders by `-updated_at`.

#### `GET /api/conversations/{id}/`

Owner-only via `get_object_or_404(..., user=request.user)`. Uses `ConversationDetailSerializer`, which includes nested `messages`.

Message fields: `id`, `role`, `content`, `sources`, `created_at`.

#### `DELETE /api/conversations/{id}/`

Owner-only delete, cascades messages, returns 204.

#### `POST /api/conversations/{id}/ask/`

Request:

```json
{"question": "Summarize my policy", "top_k": 5}
```

Manual validation:

- question string, nonblank, ≤1000;
- `top_k` integer (booleans rejected), 1–10.

Flow:

1. Owner check on conversation.
2. Call `ask_documents()` before saving anything.
3. On failure, return HTTP 500 and save no messages.
4. In `transaction.atomic()`:
   - create user `Message`;
   - create assistant `Message` with `sources=sources`;
   - if this is the second message and title is `New Chat`, set title to first 60 chars of question;
   - save conversation.
5. Return success with `answer`, `sources`, and serialized assistant `message`.

---

## 6. Serializers summary

| Serializer | Purpose | Key validation |
|---|---|---|
| `RegisterSerializer` | User registration | password ≥8, unique email/username case-insensitive |
| `DocumentSerializer` | Upload/list documents | `.pdf`, 20 MB, `%PDF-` signature |
| `DocumentSearchSerializer` | Search body | query ≤1000, top_k 1–10 |
| `DocumentAskSerializer` | Ask body | question ≤1000, top_k 1–10 |
| `WebSourceCreateSerializer` | Crawl request | `url`, max_pages 1–20 |
| `WebPageSerializer` | Nested page output | read only |
| `WebSourceSerializer` | Source + nested pages | read only |
| `MessageSerializer` | Message output | read only |
| `ConversationSerializer` | Conversation summary | read only |
| `ConversationDetailSerializer` | Conversation + messages | read only |

---

## 7. Error handling patterns

| Situation | Response |
|---|---|
| Serializer invalid | DRF 400 with field errors |
| Unauthorized | 401 via JWT auth |
| Other user's object | 404 via filtered queryset / `get_object_or_404` |
| Processing exception | 201 with generic failure body |
| Search exception | 500 generic message |
| Ask exception | 500 generic message |
| Web crawl exception | 400 with truncated error text |
| Ollama failure | 500 generic message |

Logging is not configured in settings; exceptions are caught without `logger.exception()`. This is a production gap.

---

## 8. Database transactions

Used in:

- `document_processor.py` — replace chunks atomically.
- `web_embedding_service.py` — replace page chunks atomically.
- `conversations/views.py` — persist both messages and title update atomically.

Not wrapped in transactions:

- initial `Document` creation followed by processing;
- website crawl and page saves;
- LLM call (should not be inside a DB transaction).

---

## 9. REST API design observations

Good:

- resource-style URLs;
- appropriate HTTP methods;
- user-scoped querysets;
- serializers for validation;
- service-layer separation.

Limitations:

- no pagination;
- no API versioning;
- no throttling/rate limits;
- no consistent error envelope;
- no filtering/search parameters on list endpoints;
- web-source frontend/backend field mismatch;
- processing status must be refreshed manually;
- no status/retry endpoints.

---

## 10. Interview Q&A

### Q1. How does DRF know the request user?

**Spoken:** “`JWTAuthentication` reads the Bearer token and sets `request.user`.”

**Detail:** Configured in `REST_FRAMEWORK.DEFAULT_AUTHENTICATION_CLASSES`.

**Source:** `settings.py`.

**Follow-up:** What if token expired? Interceptor refreshes and retries.

---

### Q2. Why use generic views for documents?

**Spoken:** “List/create and retrieve/delete are standard REST operations, so `ListCreateAPIView` and `RetrieveDestroyAPIView` reduce boilerplate.”

**Detail:** Custom `get_queryset()` enforces ownership.

**Source:** `documents/views.py`.

**Follow-up:** Why APIView for search/ask? They are custom actions, not CRUD.

---

### Q3. Where is validation performed?

**Spoken:** “Mostly in serializers; conversation ask uses manual checks.”

**Detail:** PDF, search, ask, register, and web-source serializers.

**Source:** `serializers.py`, `web_serializers.py`, `conversations/views.py`.

**Follow-up:** Why not all serializers? It is an inconsistency that could be refactored.

---

### Q4. How do you avoid another user's data?

**Spoken:** “Every queryset is filtered by the authenticated user, and detail views use `get_object_or_404` with that filter.”

**Detail:** Applies to documents, web sources, conversation, and both search queries.

**Source:** views and `vector_search.py`.

**Follow-up:** Are tests present? No meaningful authorization tests are implemented.

---

### Q5. What is `select_related` doing in search?

**Spoken:** “It joins related document/page/source rows in the same SQL query to avoid N+1 lookups.”

**Detail:** `select_related("document")`, `select_related("page", "page__source")`.

**Source:** `vector_search.py`.

**Follow-up:** Why not `prefetch_related`? The relation is forward FK one-to-one per row, so `select_related` is appropriate.

---

### Q6. Why are settings not production-ready?

**Spoken:** “Debug is on, the key is hardcoded, hosts are empty, CORS is localhost-only, and there is no TLS or production database hardening.”

**Detail:** Values intentionally not shown here.

**Source:** `config/settings.py`.

**Follow-up:** What would you change? See `12_PRODUCTION_DEPLOYMENT.md`.
