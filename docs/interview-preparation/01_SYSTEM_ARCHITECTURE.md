# 01 — Complete System Architecture

All diagrams below are based on the inspected code. The final diagram is explicitly **PROPOSED** and is not present in the repository.

---

## 1. Component responsibilities

| Layer | Component | Actual responsibility |
|---|---|---|
| Client | `frontend/src/` | Forms, upload, crawl trigger, search, chat, citation rendering |
| Client | `services/api.js` | Axios base URL, JWT header, multipart handling, refresh retry |
| API | `backend/config/urls.py` | Routes `/admin/`, `/api/auth/`, `/api/documents/`, `/api/conversations/` |
| API | DRF views | Parse requests, enforce `IsAuthenticated`, call services, return `Response` |
| Validation | Serializers | Validate PDF, query, ask, and web-source payloads |
| Domain | `documents/services/` | Extraction, chunking, embeddings, crawl, FAISS, RAG, Ollama |
| Persistence | MySQL | Users, documents, chunks, web sources, pages, conversations, messages, embeddings |
| AI | Sentence Transformers | Convert text to vectors; model loaded lazily into a global singleton |
| AI | FAISS | Search vectors with `IndexFlatIP` |
| AI | Ollama + Qwen | Generate the natural-language answer |

---

## 2. Diagram 1 — Overall application architecture (IMPLEMENTED)

```mermaid
flowchart TB
    U[User / Browser] --> FE[React Frontend<br/>Vite + MUI + React Router]

    FE -->|Axios + JWT| API[Django REST Framework<br/>config/urls.py]

    API --> AUTH[accounts<br/>Register, Login, Refresh, Me]
    API --> DOC[documents views<br/>upload, list, delete, search, ask]
    API --> WEB[web_views<br/>create/list/delete web source]
    API --> CONV[conversations views<br/>list/create/detail/ask/delete]

    DOC --> DP[document_processor.py]
    DP --> PE[pdf_extractor.py<br/>PyMuPDF]
    DP --> TC[text_chunker.py]
    DP --> ES[embedding_service.py<br/>all-MiniLM-L6-v2]

    WEB --> WC[web_crawler.py<br/>Requests + BeautifulSoup]
    WEB --> WES[web_embedding_service.py]

    PE --> DB[(MySQL<br/>Document, DocumentChunk)]
    WC --> DB
    WES --> DB
    TC --> ES
    ES --> DB

    DOC --> VS[vector_search.py<br/>search_knowledge]
    VS --> DB
    VS --> FAISS[In-memory FAISS<br/>IndexFlatIP 384]
    VS --> RAG[rag_service.py]
    RAG --> LLM[llm_service.py]
    LLM --> OLLAMA[Ollama local API<br/>qwen2.5:0.5b]

    RAG --> FE
    CONV --> DB
    CONV --> RAG
```

---

## 3. Diagram 2 — PDF ingestion pipeline (IMPLEMENTED)

```mermaid
sequenceDiagram
    participant FE as Documents.jsx
    participant API as DocumentListCreateView
    participant SER as DocumentSerializer
    participant PROC as process_document()
    participant PDF as extract_pdf_text()
    participant CH as chunk_pages()
    participant EM as generate_embeddings()
    participant DB as MySQL

    FE->>API: POST /api/documents/ (multipart file)
    API->>SER: is_valid()
    SER->>SER: .pdf extension, <=20 MB, %PDF- signature
    SER->>DB: Document.objects.create(uploaded_by=user)
    API->>PROC: process_document(document)
    PROC->>DB: status = processing
    PROC->>PDF: document.file.path
    PDF-->>PROC: [{page_number, text}, ...]
    PROC->>CH: chunk_pages(pages, 1000, 200)
    CH-->>PROC: [{chunk_number, page_number, content}, ...]
    PROC->>EM: list of chunk texts
    EM-->>PROC: normalized numpy vectors
    PROC->>DB: atomic: delete old chunks, bulk_create chunks, status=completed
    API-->>FE: 201 with message, document, processing result
```

Failure path: if any step after record creation raises, `process_document()` sets `status = failed` and re-raises. `DocumentListCreateView.create()` catches the exception and still returns **HTTP 201** with a generic failure message.

---

## 4. Diagram 3 — Website crawling pipeline (IMPLEMENTED)

```mermaid
flowchart TB
    A[WebSources.jsx form] --> B[POST /api/documents/web-sources/]
    B --> C[WebSourceCreateSerializer<br/>url + max_pages 1..20]
    C --> D[Create WebSource<br/>status=processing]
    D --> E[crawl_website(start_url, max_pages)]
    E --> F[validate_public_url<br/>scheme, host, private IP, port, credentials]
    F --> G[safe_fetch robots.txt<br/>manual redirects, 2 MB cap]
    G --> H{robots allows?}
    H -- no --> X[Stop / error]
    H -- yes --> I[BFS queue, visited set<br/>same host, depth <=2]
    I --> J[safe_fetch page]
    J --> K[BeautifulSoup<br/>remove script/style/nav/footer<br/>extract title, text, links]
    K --> L[WebPage update_or_create]
    L --> M[process_web_source]
    M --> N[chunk_text 1000/200]
    N --> O[generate_embeddings]
    O --> P[(MySQL WebPageChunk)]
    P --> Q[status=completed<br/>last_crawled_at]
    Q --> R[Response with pages + embedding_result]
```

Verified limitation: `WebSourceCreateSerializer` expects the field name `url`, but `frontend/src/services/webSourceService.js` sends `root_url`. This is a frontend/backend mismatch.

---

## 5. Diagram 4 — Embedding generation pipeline (IMPLEMENTED)

```mermaid
flowchart LR
    T1[PDF chunk text] --> G[generate_embeddings(texts)]
    T2[Website chunk text] --> G
    G --> M1[get_embedding_model()<br/>lazy global _model]
    M1 --> ST[SentenceTransformer<br/>sentence-transformers/all-MiniLM-L6-v2]
    ST --> ENC[model.encode<br/>convert_to_numpy=True<br/>normalize_embeddings=True<br/>show_progress_bar=False]
    ENC --> V[NumPy array shape N x 384]
    V --> S1[embedding.tolist() -> MySQL JSON]
    V --> S2[used directly for FAISS float32 vectors]
    Q[User question] --> GQ[generate_embeddings([question])]
    GQ --> QV[1 x 384 normalized vector]
```

Key point: Sentence Transformers creates embeddings. FAISS only searches them.

---

## 6. Diagram 5 — RAG retrieval and generation pipeline (IMPLEMENTED)

```mermaid
sequenceDiagram
    participant U as User
    participant V as DocumentAskView / ConversationAskView
    participant R as ask_documents()
    participant S as search_knowledge()
    participant DB as MySQL
    participant F as FAISS IndexFlatIP
    participant L as generate_answer()
    participant O as Ollama Qwen

    U->>V: question + top_k
    V->>R: user, question, top_k
    R->>S: retrieve unified chunks
    S->>DB: PDF chunks where document__uploaded_by=user
    S->>DB: WebPageChunks where page__source__user=user
    DB-->>S: embeddings + metadata
    S->>F: build index, add vectors, search(question_vector, top_k)
    F-->>S: scores + positions
    S-->>R: results with metadata and similarity
    alt no results
        R-->>V: fixed "couldn't find relevant information" answer, sources=[]
    else results
        R->>R: build SOURCE 1..N text blocks
        R->>L: question, context
        L->>O: POST /api/generate (stream=false)
        O-->>L: JSON response field
        L-->>R: answer string
        R-->>V: answer + structured sources
    end
    V-->>U: JSON response
```

No streaming is implemented. The frontend waits for the full response.

---

## 7. Diagram 6 — Authentication workflow (IMPLEMENTED)

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant REG as /api/auth/register/
    participant LOG as /api/auth/login/
    participant API as Protected API
    participant REF as /api/auth/token/refresh/

    FE->>REG: username(=email), email, password
    REG-->>FE: user id/username/email
    FE->>LOG: username(=email), password
    LOG-->>FE: access + refresh JWT
    FE->>FE: localStorage.setItem tokens
    FE->>API: Authorization: Bearer access
    API->>API: JWTAuthentication + IsAuthenticated
    alt access valid
        API-->>FE: data
    else 401
        FE->>REF: refresh token
        REF-->>FE: new access token
        FE->>API: retry original request
    end
```

Server-side nuance: `RegisterView` uses `AllowAny`; `CurrentUserView` and all document/web/conversation views require authentication. The layout also performs a client-side check with `GET /api/auth/me/`, but backend permissions are the real protection.

---

## 8. Diagram 7 — Chat conversation workflow (IMPLEMENTED)

```mermaid
sequenceDiagram
    participant U as User
    participant CH as Chat.jsx
    participant CS as conversationService.js
    participant CV as ConversationAskView
    participant RAG as ask_documents()
    participant DB as MySQL

    U->>CH: types question
    CH->>CH: adds temporary user bubble
    alt no active conversation
        CH->>CS: createConversation(title)
        CS->>DB: Conversation row
    end
    CH->>CS: askConversation(id, question, 5)
    CS->>CV: POST /api/conversations/{id}/ask/
    CV->>DB: get_object_or_404(Conversation, pk, user=request.user)
    CV->>RAG: generate answer
    RAG-->>CV: answer + sources
    CV->>DB: atomic create user Message + assistant Message(sources JSON)
    CV-->>CH: success response
    CH->>CS: getConversation(id)
    CS-->>CH: persisted messages
    CH->>CH: replace temp state with server state
```

Important: prior messages are **not** passed to the retriever or the LLM. Conversation-aware retrieval is **NOT IMPLEMENTED**.

---

## 9. Diagram 8 — Proposed production deployment architecture (PROPOSED — NOT IMPLEMENTED)

```mermaid
flowchart TB
    User[Browser / Enterprise User] --> TLS[HTTPS Internet]
    TLS --> LB[PROPOSED Load Balancer / WAF]
    LB --> NGINX[PROPOSED Nginx<br/>static files, reverse proxy, timeouts]

    NGINX --> GUN[Gunicorn workers<br/>config.wsgi.application]
    GUN --> DJ[Django production settings<br/>DEBUG=False, ALLOWED_HOSTS, secrets manager]

    DJ --> MYSQL[(MySQL primary<br/>backups + replicas)]
    DJ --> REDIS[(PROPOSED Redis<br/>broker, cache, rate limits)]
    REDIS --> CELERY[PROPOSED Celery workers<br/>PDF + crawl + embedding jobs]
    CELERY --> MYSQL

    DJ --> VEC[PROPOSED persistent vector index<br/>FAISS snapshot or vector DB]
    VEC --> OBJ[(PROPOSED object storage<br/>index files + media)]

    DJ --> OLLAMA_SVC[PROPOSED Ollama model service<br/>separate host/GPU, auth, timeout]
    OLLAMA_SVC --> MODEL[Qwen or larger approved model]

    OBS[PROPOSED logging + metrics + alerts] -.-> NGINX
    OBS -.-> GUN
    OBS -.-> DJ
    OBS -.-> CELERY
    OBS -.-> OLLAMA_SVC
```

Everything labelled **PROPOSED** is absent from the repository. See `12_PRODUCTION_DEPLOYMENT.md`.

---

## 10. Request flow from URL to response

Example: `POST /api/documents/ask/`

1. Browser sends JSON with Axios. `api.js` adds `Authorization: Bearer <access>`.
2. `config/urls.py` maps `/api/documents/` to `documents.urls`.
3. `documents/urls.py` maps `ask/` to `DocumentAskView.as_view()`.
4. DRF's `JWTAuthentication` validates the token because `DEFAULT_AUTHENTICATION_CLASSES` is configured globally.
5. `IsAuthenticated` rejects anonymous users.
6. `DocumentAskSerializer` validates `question` (nonblank, max 1000) and `top_k` (1–10, default 5).
7. View calls `ask_documents(user=request.user, question=..., top_k=...)`.
8. Service layer retrieves, builds context, calls Ollama, and returns a dictionary.
9. View converts the dictionary into a DRF `Response`.
10. Any service exception is caught and returned as HTTP 500 with a generic message.

---

## 11. How data isolation works in the architecture

| Resource | Filter used | Source |
|---|---|---|
| Documents | `Document.objects.filter(uploaded_by=self.request.user)` | `documents/views.py` |
| Document detail/delete | same queryset inside `RetrieveDestroyAPIView` | `documents/views.py` |
| PDF chunks for search | `document__uploaded_by=user` | `vector_search.py` |
| Web sources | `WebSource.objects.filter(user=request.user)` | `web_views.py` |
| Web source detail/delete | `get_object_or_404(WebSource, pk=pk, user=request.user)` | `web_views.py` |
| Web chunks for search | `page__source__user=user` | `vector_search.py` |
| Conversations | `Conversation.objects.filter(user=request.user)` | `conversations/views.py` |
| Conversation ask | `get_object_or_404(Conversation, pk=pk, user=request.user)` | `conversations/views.py` |

This is solid application-level isolation. Automated authorization regression tests are **NOT IMPLEMENTED**.

---

## 12. Architectural trade-offs to discuss in interviews

| Decision | Benefit today | Production trade-off |
|---|---|---|
| MySQL JSON embeddings | One source of truth, simple transactions | Large JSON arrays are inefficient for millions of vectors |
| FAISS built per search | Always reflects latest DB rows, no index sync | O(N) load cost per query; no persistence |
| `IndexFlatIP` | Exact results, simple | Slow at very large scale; no compression |
| Normalized embeddings + inner product | Equivalent ranking to cosine | Requires same preprocessing at index and query time |
| Local Ollama | No paid API, private local demo | Needs GPU/host capacity, timeouts, model lifecycle |
| Synchronous processing | Simple request/response | Long HTTP requests, worker exhaustion |
| BFS crawler with limits | Bounded and readable | No JS rendering, no distributed queue |
| JWT in `localStorage` | Easy SPA demo | XSS exposure; prefer secure HTTP-only cookies in production |
| Service modules | Thin views, testable business logic | Needs formal tests and dependency injection for real unit testing |
