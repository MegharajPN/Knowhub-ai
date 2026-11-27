# 17 — Laravel to Django/DRF Comparison

This chapter helps a PHP/Laravel developer explain KnowHub AI in familiar terms. It compares architecture patterns, not feature claims.

> Laravel examples below describe common Laravel idioms. They are **conceptual comparisons**, not files that exist in this repository. KnowHub AI facts come from the source paths shown beside them.

Status labels:

- **IMPLEMENTED** = present in KnowHub AI source.
- **PARTIALLY IMPLEMENTED** = present but limited or inconsistent.
- **NOT IMPLEMENTED** = not found in the repository.
- **PROPOSED** = a production improvement, not current code.

No application source, database, migrations, tests, or deployments were changed or performed while preparing this guide.

---

## 1. One-minute comparison

> “KnowHub AI is a React single-page app talking to a Django REST Framework API. In Laravel terms, the DRF views are similar to API controllers, DRF serializers combine FormRequest validation and API resources, Django models/querysets correspond to Eloquent models and builders, and the `documents/services/` package is like a Laravel service layer. Authentication uses Simple JWT instead of Sanctum or Passport. The biggest difference is the AI domain: PDF extraction, embeddings, FAISS retrieval, and Ollama generation. The project currently processes uploads and crawls synchronously; Laravel queues or Celery would be the natural production evolution, but no queue worker is implemented here.”

---

## 2. High-level mapping table

| Laravel concept | Django/DRF equivalent in KnowHub AI | Project evidence | Status |
|---|---|---|---|
| `routes/api.php` | Root URL config plus app URL configs. | `backend/config/urls.py`, `backend/documents/urls.py`, `backend/conversations/urls.py`, `backend/accounts/urls.py` | **IMPLEMENTED** |
| API controller | `APIView` or DRF generic view. | `DocumentListCreateView`, `WebSourceListCreateView`, `ConversationAskView` | **IMPLEMENTED** |
| FormRequest validation | DRF serializer validation. | `DocumentAskSerializer`, `DocumentSerializer`, `WebSourceCreateSerializer` | **IMPLEMENTED** |
| API Resource / Resource Collection | DRF ModelSerializer output. | `DocumentSerializer`, `WebSourceSerializer`, `MessageSerializer` | **IMPLEMENTED** |
| Eloquent model | Django model. | `Document`, `DocumentChunk`, `WebSource`, `WebPage`, `WebPageChunk`, `Conversation`, `Message` | **IMPLEMENTED** |
| Eloquent relationships | `ForeignKey`, `related_name`, `select_related`, `prefetch_related`. | `search_knowledge()`, `WebSourceListCreateView.get()` | **IMPLEMENTED** |
| Laravel migrations | Django migrations. | `backend/documents/migrations/`, `backend/conversations/migrations/` | **IMPLEMENTED** |
| Middleware | Django middleware plus DRF permission/authentication classes. | `backend/config/settings.py` | **IMPLEMENTED** |
| Sanctum/Passport | Simple JWT. | `TokenObtainPairView`, `TokenRefreshView`, `JWTAuthentication` | **IMPLEMENTED** |
| Policies/Gates | User-filtered querysets and object lookup with `user=request.user`. | Views in documents, web, conversations | **PARTIALLY IMPLEMENTED** |
| Service classes | Plain Python service functions. | `backend/documents/services/` | **IMPLEMENTED** |
| Queued jobs | Synchronous processing in request. | `DocumentListCreateView.create()`, `WebSourceListCreateView.post()` | **PARTIALLY IMPLEMENTED** |
| Laravel scheduler | No scheduler found. | No Celery beat/cron config found | **NOT IMPLEMENTED** |
| Artisan | `manage.py` and Django management commands. | `backend/manage.py` | **IMPLEMENTED** |
| PHP-FPM + Nginx | WSGI/ASGI entry points exist; no production server config found. | `backend/config/wsgi.py`, `backend/config/asgi.py` | **PARTIALLY IMPLEMENTED** |
| Blade views | React components with MUI. | `frontend/src/pages/`, `frontend/src/components/` | **IMPLEMENTED** |
| `.env` config | `python-dotenv` loads `backend/.env`; specific DB variable names in code. | `backend/config/settings.py` | **IMPLEMENTED** |
| PHPUnit/Feature tests | Django test modules exist but are empty or copied patterns. | `backend/*/tests.py`, `backend/documents/tests/test_vector_search.py` | **PARTIALLY IMPLEMENTED** |

---

## 3. Request lifecycle comparison

### Laravel API request

Typical flow:

1. Web server sends request to public/index.php.
2. Laravel kernel runs middleware.
3. Router matches a route in `routes/api.php`.
4. Route middleware handles auth/throttling.
5. Controller receives `Request`.
6. FormRequest or controller validation runs.
7. Controller calls model/service logic.
8. API Resource shapes the JSON response.

### KnowHub AI request

Verified flow:

1. React calls Axios instance in `frontend/src/services/api.js`.
2. Request interceptor attaches `Authorization: Bearer <access_token>` from `localStorage`.
3. Django middleware runs, including CORS, security, session, auth, and CSRF middleware.
4. `backend/config/urls.py` routes `/api/...` to an app URL config.
5. DRF authenticates with `JWTAuthentication` and applies default `IsAuthenticated`.
6. A view validates input with a serializer or manual checks.
7. The view calls a service such as `process_document()`, `search_knowledge()`, or `ask_documents()`.
8. A serializer or explicit dictionary becomes the JSON response.
9. The response interceptor may refresh an expired access token and retry once.

### Interview answer

> “The flow is familiar: middleware, routing, auth, controller-like view, validation, service, model, response. The main differences are DRF serializers doing much of what FormRequests and API Resources do in Laravel, and the AI services being plain Python functions rather than Laravel service classes or queued jobs.”

---

## 4. Routing comparison

### Laravel

Commonly:

- `routes/web.php` for browser pages and session auth.
- `routes/api.php` for stateless API routes.
- Route parameters such as `{id}`.
- Route names and middleware groups.

### KnowHub AI

`backend/config/urls.py` defines:

```python
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/documents/", include("documents.urls")),
    path("api/conversations/", include("conversations.urls")),
]
```

`backend/accounts/urls.py` defines:

- `register/` → `RegisterView`
- `login/` → `TokenObtainPairView`
- `token/refresh/` → `TokenRefreshView`
- `me/` → `CurrentUserView`

`backend/documents/urls.py` defines:

- `""` → `DocumentListCreateView`
- `<int:pk>/` → `DocumentDetailView`
- `search/` → `DocumentSearchView`
- `ask/` → `DocumentAskView`
- `web-sources/` → `WebSourceListCreateView`
- `web-sources/<int:pk>/` → `WebSourceDetailView`

`backend/conversations/urls.py` defines:

- `""` → `ConversationListCreateView`
- `<int:pk>/` → `ConversationDetailView`
- `<int:pk>/ask/` → `ConversationAskView`

### Important ordering note

In `backend/documents/urls.py`, the `<int:pk>/` route appears before `search/` and `ask/`. Because the converter is `int`, `/api/documents/search/` does not match the integer detail route. This is safe here. A non-integer slug converter at that position could shadow later routes.

### Laravel-to-Django phrase

> “Django URL configs are like route files. `include()` is similar to grouping Laravel routes under a prefix, and `<int:pk>` is a typed route parameter.”

---

## 5. Controllers versus DRF views

### Laravel controller pattern

Typical Laravel API controller methods:

- `index()`
- `store()`
- `show()`
- `destroy()`
- custom methods such as `ask()`

### KnowHub AI view equivalents

| Intent | Laravel-style name | Project class and method |
|---|---|---|
| List/create documents | `index` / `store` | `DocumentListCreateView`, inherited `get()`/`post()` behavior plus custom `create()` |
| Retrieve/delete document | `show` / `destroy` | `DocumentDetailView`, inherited `retrieve()`/`destroy()` plus custom `perform_destroy()` |
| Ask documents | custom action | `DocumentAskView.post()` |
| Search knowledge | custom action | `DocumentSearchView.post()` |
| List/create web sources | `index` / `store` | `WebSourceListCreateView.get()` / `post()` |
| Retrieve/delete web source | `show` / `destroy` | `WebSourceDetailView.get()` / `delete()` |
| List/create conversations | `index` / `store` | `ConversationListCreateView.get()` / `post()` |
| Ask in conversation | custom action | `ConversationAskView.post()` |

### Generic views versus APIView

`DocumentListCreateView` uses `generics.ListCreateAPIView`:

```python
class DocumentListCreateView(generics.ListCreateAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return Document.objects.filter(uploaded_by=self.request.user)
```

This is similar to a resource controller with index/store methods, but Django provides the common behavior.

`DocumentAskView` uses `APIView` with only `post()`, similar to a single-purpose controller action:

```python
class DocumentAskView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ...
```

### Interview answer

> “DRF generic views reduce boilerplate for standard CRUD. When an endpoint has domain behavior, like asking a question or crawling a site, the project uses `APIView` with explicit methods, which feels close to a Laravel controller action.”

---

## 6. Blade versus React SPA

### Laravel Blade

- Server-rendered templates.
- Blade components and layouts.
- Session-based authentication is common.
- Each response can be HTML.

### KnowHub AI

- `frontend/src/main.jsx` mounts React with `BrowserRouter`.
- `frontend/src/App.jsx` defines client-side routes.
- MUI provides the component system.
- Django serves JSON APIs, not the main UI HTML.
- `TEMPLATES` exists in settings with `APP_DIRS: True`, but the application flow uses DRF JSON endpoints for the SPA.

### React routes

- `/login` → `Login`
- `/register` → `Register`
- `/dashboard` → `Dashboard`
- `/documents` → `Documents`
- `/web-sources` → `WebSources`
- `/search` → `Search`
- `/chat` → `Chat`
- `/` and unknown routes redirect to `/dashboard`.

### Auth guard pattern

`frontend/src/components/DashboardLayout.jsx` calls `authService.getCurrentUser()` in `useEffect`. On failure it calls `authService.logout()` and navigates to `/login`.

### Laravel-to-Django phrase

> “Instead of Blade, this project uses React components. Django is mostly an API backend. Instead of a Laravel route rendering a view, a React route renders a component that fetches JSON.”

---

## 7. Eloquent versus Django ORM

### Model mapping

| Laravel Eloquent | Django ORM in this project |
|---|---|
| `hasMany` | `ForeignKey` with `related_name` |
| `belongsTo` | `ForeignKey` on the child model |
| `where()` | `filter()` |
| `findOrFail()` | `get_object_or_404()` |
| `with()` | `select_related()` / `prefetch_related()` |
| `create()` | `objects.create()` |
| `updateOrCreate()` | `update_or_create()` |
| `chunk()` / `cursor()` | iterator or pagination; not currently used in ingest |
| Mass assignment `$fillable` | Serializer fields / explicit model construction |

### Verified models

`backend/documents/models.py`:

- `Document`
  - `uploaded_by` → user FK
  - `title`, `file`, `file_size`, `status`
  - `created_at`, `updated_at`
- `DocumentChunk`
  - `document` FK
  - `chunk_number`, `page_number`, `content`, `embedding`
  - unique constraint on `(document, chunk_number)`
  - index on `(document, page_number)`
- `WebSource`
  - `user` FK
  - `root_url`, `title`, `status`, `max_pages`, `pages_count`, `error_message`
- `WebPage`
  - `source` FK
  - `url`, `title`, `content`
  - unique constraint on `(source, url)`
- `WebPageChunk`
  - `page` FK
  - `chunk_number`, `content`, `embedding`
  - unique constraint on `(page, chunk_number)`
  - index on `(page, chunk_number)`

`backend/conversations/models.py`:

- `Conversation`
  - `user` FK, `title`, timestamps
- `Message`
  - `conversation` FK, `role`, `content`, `sources` JSON, timestamp

### User-scoped query example

`DocumentListCreateView.get_queryset()`:

```python
return Document.objects.filter(uploaded_by=self.request.user)
```

Laravel equivalent in spirit:

```php
Document::where('uploaded_by_id', auth()->id())->get();
```

### Object ownership example

```python
get_object_or_404(WebSource, pk=pk, user=request.user)
```

This is similar to combining `findOrFail($id)` with an authorization check. It returns 404 instead of exposing whether another user's object exists.

### Eager loading example

`WebSourceListCreateView.get()`:

```python
sources = WebSource.objects.filter(
    user=request.user
).prefetch_related("pages")
```

`search_knowledge()` uses:

```python
.select_related("document")
.select_related("page", "page__source")
```

Laravel equivalents in spirit are `with()` / nested eager loading.

### Transactions

`process_document()` uses:

```python
with transaction.atomic():
    ...
```

`process_web_page()` also uses `transaction.atomic()` for replacing chunks.

Laravel equivalent in spirit is `DB::transaction(function () { ... })`.

### Bulk insert

```python
DocumentChunk.objects.bulk_create(chunk_objects)
WebPageChunk.objects.bulk_create(chunk_objects)
```

Laravel equivalent in spirit is `insert()` or chunked inserts.

### Interview answer

> “The ORM concepts transfer directly. I map Eloquent relationships to Django ForeignKeys with related names, `with()` to `select_related`/`prefetch_related`, `findOrFail` to `get_object_or_404`, and `DB::transaction` to `transaction.atomic`. The domain-specific part is storing embeddings as JSON and rebuilding the FAISS index from those rows.”

---

## 8. Validation comparison

### Laravel FormRequest

A FormRequest typically holds `rules()`, `messages()`, and `authorize()`.

### DRF serializers in KnowHub AI

`DocumentAskSerializer` validates:

- `question`: required string, not blank, max 1000 characters.
- `top_k`: optional integer, default 5, min 1, max 10.

`DocumentSearchSerializer` has the same shape with `query`.

`DocumentSerializer.validate_file()` checks:

1. Extension must be `.pdf`.
2. Size must be `<= 20 MB`.
3. First five bytes must equal `b"%PDF-"`.
4. File pointer is reset with `seek(0)`.

`WebSourceCreateSerializer` checks:

- `url`: URL field, max 2048.
- `max_pages`: default 5, min 1, max 20.

`ConversationAskView.post()` validates manually:

- `question` must be a non-blank string, max 1000.
- `top_k` must be an integer, not a boolean, between 1 and 10.
- `title` on create must be text and is trimmed/defaulted/truncated.

### Interview answer

> “DRF serializers are the closest equivalent to FormRequests, but they also serialize output like API Resources. In this project most validation is in serializers, while the conversation ask endpoint uses explicit checks because it accepts a flexible request dictionary.”

---

## 9. Middleware, permissions, and CORS

### Laravel

- Middleware runs before/after requests.
- Common middleware: auth, throttling, CORS, verification.
- Policies and Gates handle authorization.
- Sanctum/Passport handle API tokens.

### Django middleware in this project

`backend/config/settings.py` includes:

- `corsheaders.middleware.CorsMiddleware`
- `django.middleware.security.SecurityMiddleware`
- session, common, CSRF, auth, messages, clickjacking middleware

CORS is limited to:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

DRF defaults:

- `IsAuthenticated`
- `JWTAuthentication`

### Where authorization happens

There are no DRF permission classes beyond `IsAuthenticated` and no policy files. Object-level checks are implemented as queryset filters and `get_object_or_404(..., user=request.user)`.

### Laravel-to-Django phrase

> “Django middleware is similar to Laravel middleware. DRF permission classes are closer to route middleware or Policies. This project uses broad authentication plus user-filtered queries rather than Laravel-style Policies.”

### Gap statement

> “For enterprise use, I would add document-level authorization. Right now the code protects per-user ownership, but it does not implement roles, teams, tenants, or sharing rules.”

---

## 10. Authentication comparison

### Laravel Sanctum/Passport

- Sanctum often uses cookies/tokens for SPAs.
- Passport provides OAuth2.
- Session auth is common for Blade apps.

### KnowHub AI Simple JWT

`backend/accounts/urls.py`:

- `login/` → `TokenObtainPairView`
- `token/refresh/` → `TokenRefreshView`

`frontend/src/services/authService.js`:

- `login(email, password)` posts `{ username: email, password }`.
- Stores `access_token` and `refresh_token` in `localStorage`.
- `logout()` removes both tokens.

`frontend/src/services/api.js`:

- Adds `Authorization: Bearer <token>`.
- Removes `Content-Type` for `FormData`.
- On 401, refreshes once and retries the original request.
- On refresh failure, clears tokens.

### Important differences

| Concern | Laravel SPA pattern | KnowHub AI |
|---|---|---|
| Token storage | Common Sanctum cookie approach or token storage. | `localStorage`. |
| CSRF | Cookie/session auth commonly needs CSRF token. | JWT bearer auth; CSRF middleware is present but bearer requests do not rely on cookies. |
| Refresh | Sanctum token expiration/session semantics. | Explicit refresh endpoint and Axios interceptor. |
| User model | Laravel `User` Eloquent model. | Django built-in `User` from `django.contrib.auth.models`; `backend/accounts/models.py` has no custom model. |

### Gap statement

> “Storing tokens in `localStorage` is simple for a demo but has XSS exposure. A production design would consider HttpOnly/Secure cookies, CSP, and stricter token handling.”

---

## 11. Validation of registration payload mismatch

This is a useful example when comparing contract discipline between Laravel and DRF.

- `frontend/src/pages/Register.jsx` collects `username`, `email`, `password`, and `confirmPassword`.
- It sends:

```js
{
  username: form.email,
  email: form.email,
  password: form.password,
}
```

- The typed `form.username` is not used in the API payload.

A Laravel team would catch this with feature tests against the route contract. In Django, the equivalent is a DRF endpoint test asserting the serializer output and created user fields. No such automated test exists in this repository.

---

## 12. Queues and background work

### Laravel queues

Typical pattern:

- Controller dispatches a `ShouldQueue` job.
- Worker process consumes from Redis/database/SQS.
- Job has retries, backoff, failed jobs table, and monitoring.

### KnowHub AI current behavior

PDF upload:

- `DocumentListCreateView.create()` saves the `Document`.
- Calls `process_document(document)` directly.
- `process_document()` extracts, chunks, embeds, and writes chunks.
- The HTTP request waits for all of it.

Website ingest:

- `WebSourceListCreateView.post()` creates `WebSource`.
- Calls `crawl_website()` directly.
- Saves pages.
- Calls `process_web_source()` directly.
- The HTTP request waits for crawling and embedding.

Status fields exist:

- `Document.status`: uploaded, processing, completed, failed.
- `WebSource.Status`: queued, processing, completed, failed.

But there is no worker consuming queued tasks.

### What is missing

- No Celery configuration.
- No Redis/RabbitMQ broker config.
- No task modules with retry/backoff.
- No Celery beat/scheduler.
- No progress endpoint or WebSocket/SSE updates.
- No task idempotency or dead-letter handling.

### Proposed migration to workers

```text
Current:
POST /api/documents/ -> save Document -> process_document() -> response

Proposed:
POST /api/documents/ -> save Document -> enqueue process_document(document_id) -> 202 response
Worker -> extract -> chunk -> embed -> write chunks -> set status
```

Laravel mapping:

- Laravel queued job ≈ Celery task.
- `php artisan queue:work` ≈ Celery worker.
- Laravel failed jobs table ≈ Celery failure tracking/monitoring (to be designed).
- Laravel scheduler ≈ Celery beat (to be designed).

### Interview answer

> “The current code is synchronous, which is fine for a local demo. For production I would move PDF processing and crawling into background jobs. Coming from Laravel, I would compare that to dispatching a queued job; in Django the natural equivalent here is Celery, but it is not implemented in this repository.”

---

## 13. PHP-FPM versus Gunicorn/uWSGI

### Laravel deployment

Commonly:

- Nginx → PHP-FPM.
- PHP worker processes handle requests.
- Supervisor keeps workers running.
- Redis/database queues use separate workers.

### KnowHub AI deployment state

`backend/config/wsgi.py` and `backend/config/asgi.py` exist as Django entry points. However:

- No Dockerfile found.
- No Gunicorn config found.
- No Nginx config found.
- No systemd unit found.
- No supervisor config found.
- No CI/CD config found.
- No TLS config found.

Therefore, any Gunicorn/Nginx/systemd design is **PROPOSED**, not implemented.

### Proposed shape

```text
Browser
  -> HTTPS / Nginx
     -> static React build (PROPOSED)
     -> /api/ -> Gunicorn/uWSGI (PROPOSED)
        -> Django/DRF
           -> MySQL
           -> Ollama
```

FDE-safe wording:

> “The Django project has WSGI/ASGI entry points, but I have not deployed it. A production design would put it behind Gunicorn or uWSGI and Nginx with TLS, similar in role to Nginx plus PHP-FPM in a Laravel stack.”

---

## 14. Artisan versus manage.py

### Laravel Artisan

Common commands:

- `php artisan migrate`
- `php artisan serve`
- `php artisan make:controller`
- `php artisan queue:work`
- `php artisan tinker`

### Django/KnowHub AI

- `backend/manage.py` is the command entry point.
- Standard Django commands would include `runserver`, `migrate`, `makemigrations`, and `createsuperuser`.
- No custom management commands were found in the repository.
- The guide preparation did not run migrations or management commands.

### Interview answer

> “`manage.py` is the Django equivalent of Artisan’s entry point. This project does not add custom commands; it relies on standard Django commands. I did not run any of them while preparing these docs.”

---

## 15. Service classes comparison

### Laravel service layer

A Laravel app may put business logic in `app/Services/`, then inject it into controllers.

### KnowHub AI service layer

`backend/documents/services/`:

| File | Responsibility |
|---|---|
| `pdf_extractor.py` | Extract text page by page using PyMuPDF. |
| `text_chunker.py` | Split text with overlap and preserve page numbers. |
| `embedding_service.py` | Load Sentence Transformers model and generate normalized embeddings. |
| `document_processor.py` | Orchestrate PDF processing and storage. |
| `web_crawler.py` | Validate/fetch/crawl public sites and extract readable content. |
| `web_embedding_service.py` | Chunk and embed crawled pages. |
| `vector_search.py` | Build FAISS index and search PDF/website chunks. |
| `rag_service.py` | Retrieve context, call generation, and build sources. |
| `llm_service.py` | Call Ollama and parse the response. |

These are plain functions rather than injected classes. They are called from views and from each other.

### Laravel-to-Django phrase

> “This folder plays the same role as a Laravel service layer. The difference is that the services are module-level Python functions, not constructor-injected classes.”

---

## 16. Database configuration comparison

### Laravel

Typically uses `.env` keys such as `DB_CONNECTION`, `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD`.

### KnowHub AI

`backend/config/settings.py` loads `backend/.env` with `python-dotenv` and reads:

- `DB_DATABASE`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_HOST` with default `127.0.0.1`
- `DB_PORT` with default `3306`

It configures MySQL with `utf8mb4`.

### Verified discrepancy

`README.md` uses different environment variable names. The code above is authoritative.

No `.env.example` or `requirements.txt` was found at the time of inspection.

Secret values are intentionally not reproduced in this guide.

---

## 17. Testing comparison

### Laravel

Common tools:

- PHPUnit
- Feature tests for HTTP routes
- Unit tests for services
- factories and seeders

### KnowHub AI current state

- `backend/accounts/tests.py` is an empty template.
- `backend/documents/tests.py` is an empty template.
- `backend/conversations/tests.py` contains URL patterns copied from `conversations/urls.py`; it is not a real test module.
- `backend/documents/tests/test_vector_search.py` executes a query against an existing database and prints results; it is an exploratory script, not an automated test with assertions.
- `backend/test_text_chunker.py`, `backend/test_pdf_extractor.py`, and `backend/test_embeddings.py` exist as exploratory scripts at the backend root.
- `backend/test_mistral.py` contains a hardcoded third-party API key and is not part of the application runtime. Its value is intentionally not reproduced.

No tests were run while preparing this guide.

### Interview answer

> “Compared with Laravel feature tests, this repository does not yet have a reliable automated test suite. I would add endpoint contract tests, user-isolation tests, chunking tests, embedding shape tests, and mocked Ollama tests before calling it production-ready.”

### Proposed test list

1. Register/login/refresh/me flow.
2. PDF extension, size, and `%PDF-` validation.
3. Encrypted and scanned PDF failures.
4. Chunk size and overlap boundaries.
5. Embedding shape `(N, 384)`.
6. `_search_faiss()` rejects wrong dimensions and NaN/Inf.
7. PDF and website results appear in unified search.
8. User A cannot retrieve or delete User B's objects.
9. Conversation ask persists two messages and source JSON.
10. Web-source payload contract catches `root_url` vs `url`.
11. Ollama timeout/empty response handling.
12. Crawler rejects localhost/private URLs and bad redirects.

---

## 18. Deployment comparison table

| Concern | Laravel typical | KnowHub AI current | Production recommendation |
|---|---|---|---|
| App server | PHP-FPM | WSGI/ASGI files only | Gunicorn or uWSGI (**PROPOSED**) |
| Reverse proxy | Nginx | Not found | Nginx with TLS (**PROPOSED**) |
| Static assets | Nginx serves `public/build` | Vite dev config exists; production hosting not configured | Serve built React assets via Nginx/CDN (**PROPOSED**) |
| Process manager | Supervisor/systemd | Not found | systemd or container orchestrator (**PROPOSED**) |
| Queue worker | `queue:work` | Not found | Celery worker (**PROPOSED**) |
| Scheduler | Laravel scheduler | Not found | Celery beat/cron (**PROPOSED**) |
| Secrets | `.env` | `.env` loading in settings; development secret hardcoded | Environment/secret manager, no hardcoded values (**PROPOSED**) |
| Debug | `APP_DEBUG=false` in production | `DEBUG = True` | Set false and configure `ALLOWED_HOSTS` (**PROPOSED**) |
| Logging | Laravel logging channels | No production logging config found | Structured logs and alerts (**PROPOSED**) |

---

## 19. Common interview questions

### Q1. You come from Laravel. Why Django for this project?

> “Django/DRF gave me a fast, structured API with serializers, authentication, and ORM migrations. The AI services are plain Python, so they sit naturally beside the Django app. The architecture is comparable to Laravel plus a Python service layer; the deciding factor was the Python AI ecosystem: Sentence Transformers, FAISS, PyMuPDF, and Ollama.”

### Q2. What is the closest Laravel equivalent to a DRF serializer?

> “It combines a FormRequest and an API Resource. It validates input, provides `validated_data`, and serializes model output. For example, `DocumentSerializer.validate_file()` is similar in purpose to a custom FormRequest rule.”

### Q3. How would you implement authorization like Laravel Policies?

> “Currently the project uses user-filtered querysets and `get_object_or_404` with the user. For richer rules I would add a policy layer or explicit permission service, then apply it consistently in views and retrieval so a user cannot query chunks from a document they cannot access.”

### Q4. How would Laravel queues map here?

> “A Laravel queued job maps to a Celery task. I would enqueue `process_document` and `process_web_source`, return 202, and let workers update status. Retry, backoff, and failure records would be required. Celery is proposed here, not implemented.”

### Q5. Where would you put a service in Laravel versus Django?

> “In Laravel I might create `app/Services/RagService.php`; here the project uses `backend/documents/services/rag_service.py`. Both keep orchestration out of the controller/view.”

### Q6. How is authentication different?

> “Laravel SPAs often use Sanctum cookies or tokens. KnowHub AI uses Simple JWT access/refresh tokens stored in `localStorage`, attached by an Axios interceptor. That is simpler for a local demo but less ideal for XSS-sensitive production use.”

### Q7. How would you compare migrations?

> “Laravel migrations and Django migrations serve the same role. KnowHub AI has migrations for document/chunk and web models in `documents`, and one initial migration in `conversations`. I did not run them during documentation work.”

### Q8. How do you prevent IDOR in this project?

> “List endpoints filter by `request.user`, and detail endpoints use `get_object_or_404` with the user. That is the current protection. I would add automated tests because none currently prove that behavior.”

### Q9. What would you change first coming from Laravel?

> “I would add contract tests and background jobs first. The field mismatch between `root_url` and `url` shows why endpoint tests matter, and synchronous crawling shows why queued jobs matter.”

### Q10. How would you explain FAISS to a Laravel team?

> “It is like an index dedicated to similarity lookup. MySQL stores the source text and vectors; FAISS is built from those vectors at search time and returns the closest chunk positions. Those positions map back to metadata records.”

---

## 20. Migration cheat sheet

| If you know Laravel… | Remember in Django/DRF… |
|---|---|
| `Route::get()` | `path()` in a `urls.py` `urlpatterns` list |
| Route group prefix | `include()` under a parent `path()` |
| `{id}` parameter | `<int:pk>` converter |
| Controller | `APIView` or generic view |
| `index/store/show/destroy` | `list/create/retrieve/destroy` behavior from generics |
| FormRequest | Serializer `is_valid()` and `validated_data` |
| API Resource | Serializer `.data` |
| Eloquent `User` | `django.contrib.auth.models.User` here |
| `where('user_id', auth()->id())` | `filter(user=request.user)` |
| `findOrFail` + ownership | `get_object_or_404(..., user=request.user)` |
| `with('pages')` | `prefetch_related("pages")` |
| `DB::transaction()` | `with transaction.atomic():` |
| Queued job | Celery task (**PROPOSED** here) |
| `queue:work` | Celery worker (**PROPOSED** here) |
| Artisan | `manage.py` |
| Blade | React components |
| Sanctum/Passport | Simple JWT here |
| PHP-FPM | Gunicorn/uWSGI (**PROPOSED** here) |
| `APP_DEBUG=false` | `DEBUG = False` (**PROPOSED** here) |

---

## 21. Final spoken summary

> “If I explain KnowHub AI to a Laravel developer, I call DRF views controllers, serializers a mix of FormRequests and API Resources, Django ORM the Eloquent layer, and `documents/services` the service layer. The frontend is React instead of Blade, authentication is JWT instead of Sanctum, and processing is synchronous instead of queued. The AI-specific pieces—embeddings, FAISS, and Ollama—are the new domain layer. I would be careful to say that deployment, Celery, persistent indexing, SSO, and monitoring are proposed improvements, because they are not present in this repository.”
