# 13 — Scalability and Performance

This file separates what the current implementation does from what would be needed as usage grows. No performance benchmarks were run while preparing this guide, so there are no latency or throughput guarantees.

---

## 1. Current bottlenecks

| Bottleneck | Code evidence | Effect |
|---|---|---|
| FAISS index rebuilt per search | `IndexFlatIP` created inside `_search_faiss()` | Loads and copies all user vectors each query |
| Embeddings stored as JSON | `JSONField` in chunk models | Parsing + memory overhead |
| Synchronous PDF processing | `DocumentListCreateView` calls `process_document()` | Long HTTP request |
| Synchronous crawling | `WebSourceListCreateView` calls `crawl_website()` | Long HTTP request, worker blocked |
| LLM call is synchronous | `requests.post(..., timeout=180)` | Worker occupied up to 3 minutes |
| Local model singleton | `_model` global | Per-process memory cost |
| No pagination | list endpoints return all rows | Large JSON responses |
| No caching | no Redis/cache layer | Repeated work |
| No connection pooling | default Django DB config | Connection overhead at high concurrency |
| No rate limiting | no DRF throttle settings | Abuse risk |

---

## 2. Growth stages

### 100 users

Current architecture may be acceptable if:

- documents are small;
- total chunks per user are modest;
- Ollama runs on capable hardware;
- usage is intermittent.

Recommended low-cost improvements:

- add basic logging;
- add DB indexes for owner/timestamp fields;
- add throttling;
- add health checks;
- measure before changing architecture.

### 1,000 users

Likely needed:

- Celery/Redis for PDF, crawl, and embedding jobs;
- persistent FAISS index per user or shared index with metadata filtering;
- pagination on list endpoints;
- cache for user metadata and hot queries;
- separate Ollama host;
- monitoring and alerting.

### 10,000 users

Likely needed:

- horizontal scaling of Django workers;
- dedicated model-serving cluster;
- managed vector database or ANN index;
- queue-based backpressure;
- DB connection pooling;
- read replicas for metadata queries;
- object storage for media;
- rate limits and quotas;
- multi-tenant isolation review.

These are architectural recommendations, not claims that the current system handles these loads.

---

## 3. Thousands of documents

With thousands of documents, the main issue is chunk count. A 20 MB PDF can produce thousands of chunks depending on text density.

Current flow at ingest:

1. extract all pages;
2. chunk all pages in memory;
3. embed all chunks in one batch;
4. create all model objects in memory;
5. bulk-create.

Problems:

- memory spikes for large PDFs;
- no batch size control;
- no resume after failure;
- no per-document chunk limit.

Proposed:

- stream page-by-page;
- batch embeddings (e.g. 64–256 chunks);
- checkpoint progress;
- retry failed batches;
- update status incrementally;
- move work to Celery.

---

## 4. Millions of chunks

Current design is not suitable:

- each search loads every user's embeddings from MySQL;
- JSON parsing is heavy;
- `IndexFlatIP` scans all vectors;
- each Gunicorn worker may hold its own copy.

Rough memory scale for raw float32 vectors:

- 1 million × 384 × 4 bytes ≈ 1.5 GB;
- 10 million × 384 × 4 bytes ≈ 15 GB;

and that excludes index overhead, Python objects, JSON rows, and duplicates in worker memory.

Proposed approach:

- persistent vector index loaded once per worker;
- stable vector IDs mapped to MySQL chunk IDs;
- ANN index (IVF-PQ, HNSW, or managed DB);
- metadata filtering by user;
- incremental updates;
- index snapshots;
- reindex pipeline when models change.

---

## 5. Multiple simultaneous questions

Current behavior:

- each ask holds a Django request worker;
- each search rebuilds FAISS;
- each LLM call is synchronous;
- local Ollama has its own concurrency limits.

Failure pattern:

```text
many asks -> all workers waiting on Ollama -> new requests queue -> 502/504 at proxy
```

Mitigations — PROPOSED:

- asynchronous ask jobs for very slow models;
- streaming responses;
- concurrency limits at Ollama;
- queue depth monitoring;
- rate limiting per user;
- request timeouts aligned across Nginx/Gunicorn/Ollama;
- separate model service scaled independently.

---

## 6. Large PDFs

Current limits:

- 20 MB request/size cap;
- chunk size 1,000 chars;
- overlap 200 chars;
- embedding in one batch;
- synchronous processing.

Proposed optimizations:

- page streaming;
- batch embedding;
- background job;
- progress updates;
- temp file quarantine;
- OCR only where needed;
- document-level chunk budget;
- cleanup on failure;
- per-user upload quota.

---

## 7. Large website crawls

Current limits:

- `max_pages` 1–20;
- max depth default 2, validated up to 3;
- 2 MB per page;
- 15-second timeout;
- 0.5-second politeness delay;
- same-host only;
- no JavaScript rendering.

Proposed:

- job queue;
- per-host crawl budget;
- robots and terms policy;
- page deduplication;
- sitemap ingestion;
- incremental recrawl based on `Last-Modified`/ETag;
- URL allowlist/denylist;
- crawl state persistence;
- egress firewall.

---

## 8. LLM inference bottlenecks

Current call:

```python
requests.post(..., timeout=180)
```

Bottlenecks:

- small local model on CPU;
- up to 400 generated tokens;
- full prompt built from top-K chunks;
- no streaming;
- no concurrency control.

Mitigations:

- use GPU where available;
- separate Ollama service;
- set explicit context limits;
- stream tokens;
- reduce top-K adaptively;
- cache answers for identical questions;
- rerank fewer chunks for better context;
- queue requests;
- fallback model.

---

## 9. Caching — PROPOSED

Useful caches:

- current user object;
- document lists;
- web source metadata;
- embedding model loaded once per worker (already done via `_model`);
- recent search results for identical query + user + top_k;
- Ollama model health status.

Risks:

- stale results after uploads/deletes;
- cache keys must include user ID and source version;
- cache invalidation required on chunk changes.

No caching layer is implemented.

---

## 10. Database indexes — PROPOSED

Current explicit indexes:

- `(document, page_number)` for `DocumentChunk`;
- `(page, chunk_number)` for `WebPageChunk`.

Recommended to measure:

- `(uploaded_by, created_at)` on Document;
- `(user, created_at)` on WebSource;
- `(user, updated_at)` on Conversation;
- `(conversation, created_at)` on Message;
- status columns if filtered;
- foreign keys already indexed by Django.

Use `EXPLAIN` on MySQL before adding indexes.

---

## 11. Connection pooling — PROPOSED

Django opens DB connections per process/thread according to configuration. At higher concurrency:

- use `CONN_MAX_AGE` carefully;
- consider PgBouncer-like pooling for MySQL (ProxySQL/MaxScale);
- monitor `max_connections`;
- avoid holding connections during LLM/crawl calls.

Current settings have no pooling configuration.

---

## 12. Persistent vector indexes — PROPOSED

Benefits:

- avoid rebuilding per query;
- load once per worker;
- support incremental updates;
- snapshot/restore;
- scale beyond one request.

Design considerations:

- stable vector ID mapping;
- delete handling;
- model version;
- consistency with MySQL;
- index build job;
- memory per worker;
- reindex strategy.

---

## 13. Horizontal scaling

Stateless Django workers can be scaled horizontally:

```text
Nginx -> multiple Gunicorn instances/VMs -> shared MySQL + shared vector service + shared queue
```

Challenges:

- embedding model memory per worker;
- FAISS index must be shared/persistent;
- media files need shared object storage;
- Redis/Celery must be shared;
- rate limits must be centralized;
- sessions are not used for API auth, so JWT simplifies statelessness.

---

## 14. Model serving

Options:

- Ollama on same host — simplest, limited;
- dedicated GPU host — better isolation;
- multiple model replicas behind internal load balancer;
- hosted API for higher quality with cost/latency trade-offs.

Current code has a hardcoded URL; production needs configuration.

---

## 15. Rate limiting and queues

Rate limits:

- upload per user/hour;
- crawl per user/hour;
- ask requests per minute;
- global LLM concurrency;
- per-host crawl concurrency.

Queues:

- `ingestion` queue;
- `crawl` queue;
- `llm` queue;
- priority queue for interactive asks;
- dead-letter queue;
- retry/backoff.

---

## 16. Monitoring and logging

Minimum signals:

- search latency;
- FAISS vector count per request;
- embedding batch time;
- LLM latency/timeouts;
- queue depth;
- job success/failure;
- DB slow queries;
- HTTP error rate;
- storage usage.

No monitoring is implemented today.

---

## 17. An honest system-design answer

> “At the current size, the simple approach is acceptable: MySQL stores embeddings, and each request builds a FAISS index over the user's chunks. That is easy to reason about and always consistent with the database. As the number of chunks grows, this becomes expensive. I would first move ingestion and crawling into Celery workers, then persist the vector index so it is loaded once per worker. For 10,000 users or millions of chunks, I would move to an ANN index or a vector database, keep MySQL as the metadata and source-of-truth store, isolate Ollama as a separate model service, and add queue-based backpressure, rate limits, caching, and monitoring. I would not promise numbers without benchmarking on the target hardware.”

---

## 18. Interview Q&A

### Q1. What breaks first at scale?

**Spoken:** “Probably rebuilding FAISS per search and synchronous LLM calls blocking workers.”

**Detail:** Both grow with usage and hold resources during requests.

**Source:** `vector_search.py`, `llm_service.py`.

**Follow-up:** Which fix first? Background jobs and persistent index.

---

### Q2. How would you handle 1M vectors?

**Spoken:** “I would not rebuild a flat index per query. I would persist an ANN index, map IDs back to MySQL, and benchmark recall.”

**Detail:** Memory and latency must be measured.

**Source:** current implementation.

**Follow-up:** What is recall? Fraction of true nearest neighbors returned by ANN.

---

### Q3. Why queue ingestion?

**Spoken:** “To keep HTTP workers free and make retries possible.”

**Detail:** Frontend gets 202 and polls status.

**Source:** synchronous views.

**Follow-up:** What status model exists? Document has status; WebSource has status.

---

### Q4. How do you avoid stale vector indexes?

**Spoken:** “Use stable chunk IDs, event-driven updates, and a rebuild/reconcile job.”

**Detail:** Current rebuild-per-search avoids staleness but is slow.

**Source:** current behavior.

**Follow-up:** What about deletes? Remove vectors by ID or rebuild affected index.

---

### Q5. How do you scale Ollama?

**Spoken:** “Separate it from Django, limit concurrency, monitor latency, and add replicas if needed.”

**Detail:** Current URL is hardcoded to localhost.

**Source:** `llm_service.py`.

**Follow-up:** What about model quality? Bigger model vs latency/cost trade-off.

---

### Q6. Would you cache answers?

**Spoken:** “For identical questions over an unchanged knowledge base, yes, with a cache key including user and source version.”

**Detail:** Invalidation is critical after uploads/deletes.

**Source:** proposed design.

**Follow-up:** What if sources changed? Bump version and invalidate.
