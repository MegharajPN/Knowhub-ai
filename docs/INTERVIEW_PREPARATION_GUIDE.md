# KnowHub AI — Technical Interview Preparation Guide

This guide is a practical interview handbook built from the **actual code in this repository**, not from assumptions. It explains what KnowHub AI really does today, what is only proposed, and where the implementation differs from the README.

> **Verification rule used in this guide**
>
> - **IMPLEMENTED** = the behavior was read directly in source code.
> - **PARTIALLY IMPLEMENTED** = code exists, but it is incomplete, inconsistent, or limited.
> - **NOT IMPLEMENTED** = no source code was found for the feature.
> - **NEEDS VERIFICATION** = could not be confirmed from the repository alone.
> - **PROPOSED** = a production improvement, not present in the codebase.

No application source code was changed. No migrations were run. No database was modified. No tests or deployments were performed while preparing this guide.

---

## How to use this guide

1. Start with `00_PROJECT_OVERVIEW.md` and memorize the 30-second, 1-minute, and 2-minute answers.
2. Study `02_RAG_COMPLETE_GUIDE.md`, `03_EMBEDDINGS_AND_TRANSFORMERS.md`, and `04_FAISS_VECTOR_SEARCH.md` before any AI-engineer interview.
3. Use `15_INTERVIEW_QUESTIONS_AND_ANSWERS.md` for daily spoken practice.
4. Use `20_SCENARIO_BASED_INTERVIEW_QUESTIONS.md` for debugging and system-design rounds.
5. Use `19_QUICK_REVISION_CHEATSHEET.md` in the final revision before the interview.

---

## Documentation index

| File | Covers |
|---|---|
| [00_PROJECT_OVERVIEW.md](interview-preparation/00_PROJECT_OVERVIEW.md) | Problem, users, business value, differentiators, technology map, 30s/1m/2m introductions |
| [01_SYSTEM_ARCHITECTURE.md](interview-preparation/01_SYSTEM_ARCHITECTURE.md) | Full architecture with eight Mermaid diagrams: overall, PDF, crawl, embedding, RAG, auth, chat, proposed deployment |
| [02_RAG_COMPLETE_GUIDE.md](interview-preparation/02_RAG_COMPLETE_GUIDE.md) | Complete RAG lifecycle and all 15 core concepts with implementation references and interview answers |
| [03_EMBEDDINGS_AND_TRANSFORMERS.md](interview-preparation/03_EMBEDDINGS_AND_TRANSFORMERS.md) | Sentence Transformers, `all-MiniLM-L6-v2`, 384 dimensions, normalization, cosine vs inner product, limitations |
| [04_FAISS_VECTOR_SEARCH.md](interview-preparation/04_FAISS_VECTOR_SEARCH.md) | FAISS, `IndexFlatIP`, in-memory index rebuilding, metadata mapping, exact search, scale limits |
| [05_PDF_INGESTION.md](interview-preparation/05_PDF_INGESTION.md) | Upload validation, PyMuPDF, chunking, embeddings, MySQL writes, failure behavior |
| [06_WEBSITE_CRAWLER.md](interview-preparation/06_WEBSITE_CRAWLER.md) | Crawler, robots.txt, URL/SSRF checks, BeautifulSoup, page models, security gaps |
| [07_OLLAMA_AND_LLM.md](interview-preparation/07_OLLAMA_AND_LLM.md) | Ollama HTTP API, Qwen, prompt, options, timeout, response parsing, limitations |
| [08_DJANGO_BACKEND.md](interview-preparation/08_DJANGO_BACKEND.md) | Django apps, DRF request flow, all endpoints, validation, services, errors, settings |
| [09_REACT_FRONTEND.md](interview-preparation/09_REACT_FRONTEND.md) | React, Vite, MUI, Router, Axios interceptors, pages, services, token handling, UI gaps |
| [10_MYSQL_DATABASE.md](interview-preparation/10_MYSQL_DATABASE.md) | Every model and field, relationships, constraints, indexes, ER diagram, isolation |
| [11_SECURITY.md](interview-preparation/11_SECURITY.md) | JWT, permissions, user-scoped querysets, CORS, file validation, SSRF, missing controls |
| [12_PRODUCTION_DEPLOYMENT.md](interview-preparation/12_PRODUCTION_DEPLOYMENT.md) | Proposed Linux/Gunicorn/Nginx/MySQL/systemd/TLS/monitoring deployment, FDE-to-Gunicorn comparison |
| [13_SCALABILITY_AND_SYSTEM_DESIGN.md](interview-preparation/13_SCALABILITY_AND_SYSTEM_DESIGN.md) | 100/1,000/10,000 users, millions of chunks, queues, caching, model serving, rate limits |
| [14_RAG_ADVANCED_CONCEPTS.md](interview-preparation/14_RAG_ADVANCED_CONCEPTS.md) | Hybrid search, BM25, reranking, query rewriting, RAGAS, hallucination and prompt-injection defenses |
| [15_INTERVIEW_QUESTIONS_AND_ANSWERS.md](interview-preparation/15_INTERVIEW_QUESTIONS_AND_ANSWERS.md) | 112 questions in 22 categories with spoken answers, detail, project examples, sources, follow-ups |
| [16_FDE_INTERVIEW_GUIDE.md](interview-preparation/16_FDE_INTERVIEW_GUIDE.md) | Forward Deployed Engineer framing, customer scenarios, enterprise integration, honest positioning |
| [17_LARAVEL_TO_DJANGO_COMPARISON.md](interview-preparation/17_LARAVEL_TO_DJANGO_COMPARISON.md) | Laravel ↔ Django/DRF comparisons for a PHP/Laravel developer |
| [18_CODE_FILE_REFERENCE.md](interview-preparation/18_CODE_FILE_REFERENCE.md) | File-by-file index of important backend and frontend files, classes, functions, inputs, outputs, callers |
| [19_QUICK_REVISION_CHEATSHEET.md](interview-preparation/19_QUICK_REVISION_CHEATSHEET.md) | Final cheat sheets, top 30 questions, mistakes to avoid, terms to memorize |
| [20_SCENARIO_BASED_INTERVIEW_QUESTIONS.md](interview-preparation/20_SCENARIO_BASED_INTERVIEW_QUESTIONS.md) | 14 realistic debugging/system-design scenarios with step-by-step answers |

---

## Part-to-file map

| Requested part | Where it is covered |
|---|---|
| Part 1 — Project overview | `00_PROJECT_OVERVIEW.md` |
| Part 2 — Complete architecture | `01_SYSTEM_ARCHITECTURE.md` |
| Part 3 — Complete RAG explanation | `02_RAG_COMPLETE_GUIDE.md` |
| Part 4 — Sentence Transformers and embeddings | `03_EMBEDDINGS_AND_TRANSFORMERS.md` |
| Part 5 — FAISS | `04_FAISS_VECTOR_SEARCH.md` |
| Part 6 — PDF processing | `05_PDF_INGESTION.md` |
| Part 7 — Website crawler | `06_WEBSITE_CRAWLER.md` |
| Part 8 — Unified vector search | `01_SYSTEM_ARCHITECTURE.md`, `04_FAISS_VECTOR_SEARCH.md`, `02_RAG_COMPLETE_GUIDE.md` |
| Part 9 — Ollama and Qwen | `07_OLLAMA_AND_LLM.md` |
| Part 10 — Django REST Framework | `08_DJANGO_BACKEND.md` |
| Part 11 — MySQL database | `10_MYSQL_DATABASE.md` |
| Part 12 — React frontend | `09_REACT_FRONTEND.md` |
| Part 13 — Authentication and security | `11_SECURITY.md` |
| Part 14 — Production deployment | `12_PRODUCTION_DEPLOYMENT.md` |
| Part 15 — Scalability and performance | `13_SCALABILITY_AND_SYSTEM_DESIGN.md` |
| Part 16 — Advanced RAG improvements | `14_RAG_ADVANCED_CONCEPTS.md` |
| Part 17 — 100+ interview Q&A | `15_INTERVIEW_QUESTIONS_AND_ANSWERS.md` |
| Part 18 — Scenario questions | `20_SCENARIO_BASED_INTERVIEW_QUESTIONS.md` |
| Part 19 — FDE preparation | `16_FDE_INTERVIEW_GUIDE.md` |
| Part 20 — Laravel to Django comparison | `17_LARAVEL_TO_DJANGO_COMPARISON.md` |
| Part 21 — Code walkthrough index | `18_CODE_FILE_REFERENCE.md` |
| Part 22 — Final cheat sheets | `19_QUICK_REVISION_CHEATSHEET.md` |

---

## Highest-confidence facts from the repository

These are safe to state in an interview because they were read directly from code.

1. The backend is Django + Django REST Framework with MySQL configured in `backend/config/settings.py`.
2. Authentication is Simple JWT; protected endpoints use `IsAuthenticated` by default.
3. PDFs are validated by extension, size, and `%PDF-` signature in `backend/documents/serializers.py`.
4. PDF text comes from PyMuPDF in `backend/documents/services/pdf_extractor.py`.
5. Text is split into 1,000-character chunks with 200-character overlap in `backend/documents/services/text_chunker.py`.
6. Embeddings come from `sentence-transformers/all-MiniLM-L6-v2` and are normalized in `backend/documents/services/embedding_service.py`.
7. MySQL stores chunk text and JSON embeddings; FAISS is built from those stored embeddings during each search in `backend/documents/services/vector_search.py`.
8. Search covers both PDF chunks and website chunks through `search_knowledge()`.
9. The LLM call is a local Ollama `/api/generate` request to `qwen2.5:0.5b` in `backend/documents/services/llm_service.py`.
10. Conversations and messages are stored in MySQL; the frontend keeps JWTs in `localStorage`.
11. Processing and crawling are synchronous inside HTTP requests.
12. The project is a local/portfolio implementation, not a production deployment.

---

## Important verified discrepancies and limitations

These must be stated honestly if asked.

- `README.md` describes environment-based secrets, but `backend/config/settings.py` currently contains a hardcoded development `SECRET_KEY`, `DEBUG = True`, and empty `ALLOWED_HOSTS`. Values are intentionally not reproduced here.
- `README.md` mentions `requirements.txt` and `.env.example`; neither file exists in the repository at the time of inspection.
- `backend/accounts/` is the installed app. A separate `backend/apps/accounts/` directory exists but is not in `INSTALLED_APPS`.
- `frontend/src/services/webSourceService.js` sends `root_url`, while `backend/documents/web_serializers.py` expects `url`. This is a verified frontend/backend mismatch.
- `frontend/src/pages/Register.jsx` sends `username: form.email`; the typed username field is not used in the API payload.
- `frontend/src/pages/Search.jsx` always displays a `Page` chip, even though the unified backend returns `page_number: null` for website results.
- `backend/conversations/tests.py` contains URL patterns copied from `urls.py`; it is not a real test module.
- A local exploratory script `backend/test_mistral.py` contains a hardcoded third-party API key. Its value is intentionally not reproduced here. It is not used by the application runtime path.
- No Dockerfile, Gunicorn config, Nginx config, systemd unit, Celery setup, Redis setup, CI/CD config, or persistent FAISS index was found. All such deployment material in this guide is **PROPOSED**.

---

## Final note

Speak about this project as a **working local full-stack RAG application** that demonstrates end-to-end integration. Do not describe it as a production enterprise deployment or claim customer deployments. The strongest interview framing is: *“I built the full loop — ingest PDFs and websites, embed and search them together, generate grounded answers with citations, and persist chats — and I can clearly explain which parts would need hardening before production.”*
