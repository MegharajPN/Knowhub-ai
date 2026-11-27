# 16 — Forward Deployed Engineer Interview Guide

This guide prepares you for a **Forward Deployed Engineer (FDE)** interview using KnowHub AI as the evidence. It is deliberately honest: the repository contains a working local full-stack RAG application, but **no customer deployment, production rollout, or enterprise integration is documented in this codebase**.

> Status labels used throughout this handbook:
>
> - **IMPLEMENTED** = read directly in source code.
> - **PARTIALLY IMPLEMENTED** = code exists but is limited or inconsistent.
> - **NOT IMPLEMENTED** = no source code was found.
> - **NEEDS VERIFICATION** = cannot be confirmed from the repository alone.
> - **PROPOSED** = a production improvement, not present in the codebase.

No source code, database, migrations, tests, or deployments were changed or performed while preparing this guide.

---

## 1. What an FDE interviewer is really testing

An FDE role usually sits between engineering, product, and the customer. The interviewer wants to know whether you can:

1. Understand a customer's real workflow, not only repeat a feature list.
2. Turn a vague requirement into a small, useful prototype.
3. Integrate with existing systems: identity, storage, documents, networks, and security.
4. Debug across frontend, backend, model, and infrastructure boundaries.
5. Explain technical trade-offs to both engineers and non-engineers.
6. Admit gaps honestly and propose a safe path to production.
7. Hand off a working system rather than abandoning a demo.

KnowHub AI is useful evidence for all seven points because the full loop is visible in code: PDF/website ingestion, chunks, embeddings, FAISS search, Ollama generation, citations, authentication, and chat persistence.

---

## 2. Your honest positioning

### 30-second answer

> “KnowHub AI is a local full-stack RAG application I built to demonstrate the complete path from user-owned PDFs and websites to grounded answers with citations. React calls a Django REST API, MySQL stores documents, chunks, embeddings, and chats, Sentence Transformers creates vectors, FAISS retrieves, and a local Ollama/Qwen model generates the answer. I have not deployed it to a customer or production environment, so I describe the hardening, queueing, persistent vector index, SSO, and monitoring work as proposed next steps rather than completed features.”

### Why this answer works

- It states what is **IMPLEMENTED**.
- It does not imply customers or production usage.
- It shows you understand the whole data path.
- It opens the door to discussing production gaps without overclaiming.

### One sentence you should never say

> “It is deployed for enterprise customers with SSO, role-based access, and a scalable vector database.”

That would be false for this repository. SSO, RBAC, persistent vector databases, and scalable deployment are **NOT IMPLEMENTED**.

---

## 3. Verified project facts an FDE can safely use

| Area | What you can say | Source |
|---|---|---|
| User workflow | Users register/login, upload PDFs, add websites, search, ask questions, and keep conversations. | `frontend/src/App.jsx`, `backend/config/urls.py` |
| Backend | Django + DRF, Simple JWT, MySQL configured in settings. | `backend/config/settings.py` |
| Ingestion | PDFs are validated, text extracted with PyMuPDF, chunked, embedded, and stored. | `backend/documents/services/document_processor.py` |
| Web ingestion | Public HTTP(S) pages are crawled with URL checks, robots.txt, BFS, and BeautifulSoup extraction. | `backend/documents/services/web_crawler.py` |
| Unified search | PDF and website chunks are searched together through `search_knowledge()`. | `backend/documents/services/vector_search.py` |
| Generation | A local Ollama `/api/generate` call uses `qwen2.5:0.5b`. | `backend/documents/services/llm_service.py` |
| Citations | Assistant messages store source metadata returned by retrieval. | `backend/conversations/views.py`, `backend/conversations/models.py` |
| User isolation | Querysets filter by `request.user` and detail views use `get_object_or_404(..., user=request.user)`. | `backend/documents/views.py`, `backend/documents/web_views.py`, `backend/conversations/views.py` |
| Current limitation | Processing and crawling happen synchronously inside HTTP requests. | `backend/documents/views.py`, `backend/documents/web_views.py` |

### Facts you must qualify

- **No production deployment files** were found: no Dockerfile, Gunicorn config, Nginx config, systemd unit, CI/CD config, or TLS config.
- **No Celery or Redis setup** was found.
- **No persistent FAISS index** exists; `_search_faiss()` builds a fresh index from MySQL rows on every search.
- **No SSO, RBAC, audit logging, tenant model, or document ACLs** were found.
- **No conversation history in the RAG prompt**; messages are stored but `ask_documents()` only retrieves for the current question.
- **Frontend/backend web-source mismatch** exists: `root_url` is sent by `frontend/src/services/webSourceService.js`, while `backend/documents/web_serializers.py` expects `url`.
- **Registration mismatch** exists: `frontend/src/pages/Register.jsx` sends `username: form.email`, so the typed username is unused.
- **Search UI mismatch** exists: `frontend/src/pages/Search.jsx` always shows a `Page` chip even when a website result has `page_number: null`.
- Development settings contain a hardcoded secret key, `DEBUG = True`, and empty `ALLOWED_HOSTS`. Values are intentionally not reproduced here.

---

## 4. FDE competency map applied to this project

| Competency | Evidence in KnowHub AI | Interview framing |
|---|---|---|
| Customer discovery | User-owned documents and websites, citations, per-user workspace. | “I started from the problem: people need answers grounded in their own material, not generic chatbot output.” |
| Technical prototyping | Full ingestion-to-answer loop implemented locally. | “I built the smallest end-to-end slice that proves the value: upload, ask, answer, cite.” |
| Integration | React ↔ DRF ↔ MySQL ↔ Ollama; two ingestion sources converge on one search function. | “The main integration seam is `search_knowledge()`, which lets PDFs and websites share one retrieval path.” |
| Debugging | Validation, status fields, error messages, exception handling, service boundaries. | “I instrument the path by stage: upload validation, extraction, chunking, embedding, retrieval, generation, persistence.” |
| Security awareness | JWT, user-scoped querysets, crawler URL checks, file signature validation. | “I implemented basic isolation and input checks, and I can name the production controls still missing.” |
| Communication | Citations and simple status labels make behavior visible. | “Citations are not just UI; they are the trust mechanism for a knowledge assistant.” |
| Handoff | Services are separated by responsibility and paths are explicit. | “A new engineer can follow the call chain from view to service to model call.” |

---

## 5. Customer discovery questions you should be able to ask

An FDE interview may include a mock discovery call. Ask questions in this order.

### Business context

1. Who is the primary user, and what decision are they trying to make faster?
2. What happens today when they cannot find an answer?
3. Which documents are authoritative?
4. What does a wrong answer cost?
5. Who approves an answer before it is used?

### Data and sources

1. Are sources PDFs, web pages, wikis, tickets, databases, or scanned images?
2. Are documents public, internal, confidential, or regulated?
3. How often do sources change?
4. Do you need deletion to remove content from every index immediately?
5. Are there language, OCR, or table-extraction requirements?

### Identity and access

1. Do users already authenticate through SSO or SAML/OIDC?
2. Do permissions differ by document, team, region, or role?
3. Can one user share a source with another?
4. Who can delete a source?
5. Is an audit trail required?

### Operations

1. Where must the system run: cloud, on-premise, or air-gapped?
2. Can models call an external API?
3. What latency is acceptable for ingestion and for asking?
4. How many users and documents are expected in six months?
5. What observability and support process already exists?

### Success criteria

1. What is the baseline search/answer time?
2. What accuracy or citation quality is acceptable?
3. What percentage of answers must be traceable to a source?
4. What is the pilot deadline?
5. What would make you stop the project?

---

## 6. Customer scenario 1 — Support team with PDFs and public help pages

### Customer statement

> “Our support agents waste time searching product manuals and public documentation. We want them to ask a question and get an answer with the exact page or URL.”

### How to respond as an FDE

1. **Restate the problem.**
   > “You want one search box over manuals and public help pages, with a source link agents can trust.”

2. **Map to current implementation.**
   - PDF upload path: `DocumentListCreateView.create()` → `process_document()`.
   - Web path: `WebSourceListCreateView.post()` → `crawl_website()` → `process_web_source()`.
   - Unified search: `search_knowledge()`.
   - Answer with citations: `ask_documents()` → `generate_answer()`.

3. **State what works today.**
   - PDF page citations and website URL citations are returned.
   - Sources are stored with assistant messages.

4. **State the gaps.**
   - No incremental crawl scheduling.
   - No reranking or keyword search.
   - No OCR for scanned manuals.
   - No per-document ACLs.
   - FAISS index rebuilds per request.

5. **Propose a PoC.**
   - Ingest 10–20 representative manuals and 2–3 public sites.
   - Create 25 real agent questions.
   - Measure answer correctness, citation correctness, and latency.
   - Review failures with agents weekly.

6. **Production path (PROPOSED).**
   - Move ingestion and crawling to background workers.
   - Persist and incrementally update the vector index.
   - Add hybrid retrieval and reranking.
   - Add SSO and role-based access.
   - Add evaluation set and monitoring.

### Strong interview answer

> “I would not start by selling the model. I would start with their real questions and authoritative sources. The current code already proves the core loop, but I would treat OCR, incremental crawling, access control, and a persistent index as PoC-to-production work, not as things this repository already does.”

---

## 7. Customer scenario 2 — Regulated enterprise with confidential documents

### Customer statement

> “We cannot send data to a third-party model. We also need to know exactly who accessed what.”

### FDE response

1. **Clarify constraints.**
   - Is an external API forbidden entirely, or only for certain data classes?
   - Must the model run on-premise?
   - Which identity provider is mandatory?
   - What audit events are required?

2. **Map to current implementation.**
   - The LLM call goes to `http://127.0.0.1:11434/api/generate`, a local Ollama endpoint (**IMPLEMENTED**).
   - Authentication is Simple JWT (**IMPLEMENTED**).
   - User-scoped querysets exist (**IMPLEMENTED**).
   - Audit logging, SSO, RBAC, tenant isolation, and encryption policy are **NOT IMPLEMENTED**.

3. **Be precise about what “local” means here.**
   - The URL is local to the Django process, so no third-party model API is used in the runtime path.
   - However, the repository also contains an exploratory script with a third-party API key; it is not used by the application runtime. Its value is intentionally not reproduced.

4. **Propose hardening.**
   - Environment-driven secrets and key rotation.
   - OIDC/SAML integration through the identity provider.
   - Document-level authorization checks in both retrieval and generation.
   - Audit log for upload, view, delete, search, and ask events.
   - Network policy around Ollama and MySQL.
   - Encryption at rest and in transit.
   - Data retention and deletion policy.

5. **Honest boundary.**
   > “The local Ollama design is a good starting point for privacy-sensitive deployments, but the current repository is not production-hardened.”

---

## 8. Customer scenario 3 — “Search is too slow with 100,000 chunks”

### Customer statement

> “Our knowledge base will grow to 100,000 chunks. Search takes too long.”

### FDE response

1. **Diagnose first.**
   - Identify where time is spent: database fetch, embedding generation, FAISS build, model generation, or network.
   - In this code, `search_knowledge()` loads all eligible chunk rows from MySQL, then `_search_faiss()` builds `IndexFlatIP` from those vectors every request.

2. **Explain current behavior.**
   > “Retrieval is exact but not cached or persistent. It is simple and correct for a demo, but it scales poorly because every search pays database read plus index build cost.”

3. **Proposed staged plan.**
   - Phase 1: measure with timing logs and a representative dataset.
   - Phase 2: persist the FAISS index and store the chunk ID mapping.
   - Phase 3: use `IndexIVFFlat` or HNSW for approximate nearest neighbor search.
   - Phase 4: add metadata filters so fewer vectors are scanned.
   - Phase 5: cache frequent query embeddings.
   - Phase 6: move ingestion/embedding to workers so requests stay short.

4. **Trade-off explanation.**
   - `IndexFlatIP`: exact, simple, slower and memory-heavy at large scale.
   - Approximate index: faster, lower memory, but needs recall tuning.
   - Persistent index: avoids rebuild, but needs consistency handling on document deletion.

5. **Interview answer.**
   > “I would not immediately replace FAISS. I would first prove the bottleneck. If index rebuild dominates, I would persist or shard the index. If database reads dominate, I would filter metadata earlier. If generation dominates, I would tune or upgrade the model path.”

---

## 9. Customer scenario 4 — “The assistant made up an answer”

### Customer statement

> “The assistant answered confidently, but the source does not support it.”

### FDE response

1. **Separate three failure types.**
   - Retrieval failure: correct chunk was not retrieved.
   - Grounding failure: correct chunk was retrieved but the model ignored it.
   - Presentation failure: citation was shown but did not match the sentence.

2. **Trace in this code.**
   - `ask_documents()` retrieves top chunks and builds the context.
   - `generate_answer()` instructs the model to use only context, not invent facts, and not follow instructions inside documents.
   - If no results are found, a fixed no-information answer is returned without calling Ollama.

3. **Explain the limitation.**
   - The prompt rule is **PARTIALLY IMPLEMENTED** mitigation, not a guarantee.
   - There is no answer verification step, no sentence-level citation, and no RAGAS evaluation in runtime.

4. **Proposed improvements.**
   - Add reranking before generation.
   - Add a groundedness checker.
   - Require the model to quote supporting text.
   - Add sentence-level citation mapping.
   - Add a rule-based fallback when similarity is below a threshold.
   - Build a golden question set and evaluate every change.
   - Add prompt-injection tests using malicious document text.

5. **Customer-friendly explanation.**
   > “Retrieval finds the pages, and generation writes the answer. The prompt asks the model to stay inside those pages, but it is not a formal guarantee. For high-trust use, we add a verification layer and show exactly which sentence supports each claim.”

---

## 10. Customer scenario 5 — On-premise or air-gapped deployment

### Customer statement

> “We need this inside our network with no internet access.”

### FDE response

1. **What the project already supports conceptually.**
   - Ollama is called at a local address (**IMPLEMENTED**).
   - Embedding model is loaded from the Sentence Transformers model name; whether weights are pre-cached offline is **NEEDS VERIFICATION** from runtime environment.
   - MySQL, Django, and React can run inside a private network, but deployment files are absent (**NOT IMPLEMENTED**).

2. **What must be prepared.**
   - Pre-download and mount model weights for both embedding and LLM.
   - Provide internal package mirrors or vendor wheels.
   - Configure DNS, TLS certificates, and internal hostname rules.
   - Set `ALLOWED_HOSTS`, secure secrets, and disable debug mode.
   - Decide how crawlers behave when only internal sites are allowed.

3. **Crawler caution.**
   - `validate_public_url()` rejects private/non-global IPs and localhost.
   - An air-gapped deployment that needs to crawl internal pages would require a different, policy-driven crawler mode. That is **NOT IMPLEMENTED**.

4. **FDE answer.**
   > “The local model call is helpful, but air-gapped delivery is more than changing a URL. I would plan for offline model artifacts, package mirrors, certificates, secrets, and an internal-source crawling policy. The current crawler intentionally rejects private addresses, so internal crawling would be a scoped change with security review.”

---

## 11. Customer scenario 6 — Website source creation fails

### Customer statement

> “The UI says crawling failed, but the website is public.”

### FDE debug path

1. Check the browser request payload.
   - `frontend/src/services/webSourceService.js` sends `root_url`.
   - `backend/documents/web_serializers.py` expects `url`.
   - This is a verified mismatch and is a likely first cause.

2. Check validation errors.
   - `WebSourceCreateSerializer` validates `url` and `max_pages`.
   - `max_pages` must be 1–20.

3. Check crawler safety rules.
   - Only HTTP/HTTPS.
   - No credentials in URL.
   - Ports 80/443 only.
   - No localhost/private/non-global addresses.
   - `robots.txt` must be safely checked.
   - Same host only.
   - HTML content type and readable content required.

4. Check status persistence.
   - `WebSourceListCreateView.post()` stores `error_message` up to 2000 characters and sets status failed.

5. **Fix framing.**
   - Immediate correctness fix: align frontend field name with backend serializer.
   - Production improvement: add automated contract test for this endpoint.
   - No source code was changed as part of this guide.

---

## 12. Enterprise integration map

The table below separates what exists from what would be needed in an enterprise deployment.

| Layer | Current repository | Enterprise requirement | Status |
|---|---|---|---|
| Identity | Django auth users; Simple JWT login/refresh; frontend stores tokens in `localStorage`. | SSO/OIDC/SAML, MFA, session policy, secure token storage. | Current auth **IMPLEMENTED**; SSO/RBAC **NOT IMPLEMENTED**. |
| Authorization | User-scoped querysets and object checks. | Document/team/tenant ACLs applied at retrieval and generation. | Basic isolation **IMPLEMENTED**; ACLs **NOT IMPLEMENTED**. |
| Document sources | Local PDF upload, public website crawl. | S3/SharePoint/Confluence/Jira/database connectors, OCR. | **PARTIALLY IMPLEMENTED**; connectors **NOT IMPLEMENTED**. |
| Ingestion | Synchronous PDF and website processing in request. | Queue workers, retries, idempotency, progress events. | Current **IMPLEMENTED**; workers **NOT IMPLEMENTED**. |
| Storage | MySQL for metadata, text, JSON embeddings, chats; media files under `MEDIA_ROOT`. | Object storage, backups, encryption, retention. | Current **IMPLEMENTED**; object storage/production policy **NOT IMPLEMENTED**. |
| Vector search | FAISS `IndexFlatIP`, rebuilt per search from MySQL. | Persistent index, approximate search, filters, replica management. | Current **IMPLEMENTED**; production design **PROPOSED**. |
| Generation | Local Ollama `qwen2.5:0.5b`, non-streaming. | Model gateway, fallback, streaming, GPU sizing, observability. | Basic path **IMPLEMENTED**; production features **NOT IMPLEMENTED**. |
| Frontend | React SPA with MUI and Axios interceptors. | CDN/static hosting, CSP, accessible UI, error boundaries. | SPA **IMPLEMENTED**; production hardening **PROPOSED**. |
| Operations | No deployment config found. | Gunicorn/uWSGI, Nginx, systemd/containers, TLS, monitoring, alerts. | **NOT IMPLEMENTED / PROPOSED**. |
| Evaluation | No runtime evaluation suite found. | Golden datasets, RAGAS-style scoring, human review. | **NOT IMPLEMENTED**. |

---

## 13. Debugging as an FDE: stage-by-stage runbook

Use this structure in interviews and real customer calls.

| Stage | Check | Code location | Likely signal |
|---|---|---|---|
| 1. Browser request | URL, method, payload, token. | `frontend/src/services/api.js` and service files. | 401, 404, field validation error. |
| 2. DRF validation | Serializer fields and constraints. | `documents/serializers.py`, `web_serializers.py`, `conversations/views.py`. | 400 with field errors. |
| 3. Authentication/ownership | Token and user filter. | DRF settings, view querysets, `get_object_or_404`. | 401 or 404. |
| 4. Ingestion | File signature, encrypted PDF, readable text, chunk count. | `document_processor.py`, `pdf_extractor.py`, `text_chunker.py`. | `status=failed`, generic upload error. |
| 5. Embeddings | Model loaded, vector dimension 384, finite values. | `embedding_service.py`, `vector_search.py`. | ValueError about dimensions or invalid values. |
| 6. Retrieval | User's chunks, source filters, top_k, similarity. | `search_knowledge()`, `_search_faiss()`. | Empty results or irrelevant results. |
| 7. Generation | Ollama reachable, model present, timeout, empty response. | `llm_service.py`. | 500, 180-second timeout, empty response error. |
| 8. Persistence | Message roles, sources JSON, conversation ownership. | `conversations/views.py`. | Missing history or wrong title. |
| 9. UI rendering | Source type, page number vs URL, chip labels. | `Chat.jsx`, `Search.jsx`. | “Page null” or missing link. |

### Status update template for customers

> “We isolated the failure to the ingestion stage: the file passed upload validation but extraction produced no readable text, so the document status changed to failed. The answer path is not involved yet. We are checking whether the PDF is scanned and whether OCR should be added to the PoC scope.”

---

## 14. Explaining technical concepts to non-technical stakeholders

### RAG

> “Instead of asking the model to answer from memory, we first search the customer's own material and hand those pages to the model as reference text. The answer is grounded in those pages, and we show the source next to it.”

### Embeddings

> “An embedding turns text into a list of numbers so that pieces with similar meaning sit close together. That lets us find relevant passages even when the user's words do not exactly match the document.”

### FAISS

> “FAISS is a library that quickly finds the closest vectors. In this project it is used as an in-memory index built from stored embeddings during each search.”

### Ollama

> “Ollama runs the language model locally and exposes it over HTTP. The Django backend sends the question plus retrieved context and receives the generated answer.”

### Why an answer was not found

> “Either the material was not ingested, the search did not find it, or the model was not given enough evidence. We check those three stages separately.”

### Why production needs more work

> “The demo proves the idea works. Production adds access control, background jobs, reliable indexing, monitoring, and recovery when a model or database is unavailable.”

---

## 15. Mock FDE interview questions and strong answers

### Q1. Why should we hire you as an FDE if this is a portfolio project?

> “Because I can own the full loop: understand the user problem, build a working slice, explain each technical boundary, and be honest about what is missing. This project demonstrates ingestion, retrieval, generation, citations, and persistence. It also shows I know the difference between a demo that works locally and a system that is ready for a customer.”

### Q2. What would you demo first to a customer?

> “I would upload one real PDF, add one public website, ask a question that spans both, and show the answer with source badges. Then I would search the same content directly to show retrieval before generation. That separates ‘we found the right material’ from ‘the model wrote a good answer’.”

### Q3. What is the biggest technical risk?

> “Scaling and trust. The index is rebuilt per search, so it will not scale to large corpora without a persistent or approximate index. Also, the prompt tries to prevent invented answers, but there is no automated groundedness check yet.”

### Q4. How do you handle a customer asking for SSO?

> “I would clarify the identity provider and authorization model. Simple JWT is currently implemented, but SSO and document-level RBAC are not. I would scope an integration with OIDC/SAML, map identity claims into Django users, and enforce permissions in both retrieval and generation.”

### Q5. How do you handle confidential data?

> “I would first classify the data and the deployment boundary. The current model call is local to Ollama, which is useful, but secrets, debug settings, transport security, audit logging, and access policy all need hardening before a regulated rollout.”

### Q6. A customer reports a wrong answer. What do you do?

> “I reproduce it, inspect retrieved chunks, check similarity scores, then inspect the prompt and model output. I classify it as retrieval, grounding, or presentation failure. Then I add the case to a regression set before changing the pipeline.”

### Q7. How would you run a PoC?

> “One to two weeks with real documents and 25–50 representative questions. Define success up front: citation correctness, answer correctness, and latency. Review failures with the customer and publish a go/no-go report.”

### Q8. How would you explain your project to a Laravel team?

> “I would map React + DRF to a Laravel API + frontend, serializers to FormRequests/resources, services to Laravel service classes, and Celery—which is proposed here—to Laravel queues. The RAG pieces are new domain logic, but the web architecture is familiar.” See `17_LARAVEL_TO_DJANGO_COMPARISON.md`.

### Q9. What would you refuse to promise?

> “I would not promise zero hallucinations, instant large-scale search, production security, or customer-grade SSO based on this repository. I would promise a clear prototype, measurable evaluation, and a concrete hardening plan.”

### Q10. What is your handoff artifact?

> “A runbook with architecture diagrams, endpoint contract, environment setup, service boundaries, known gaps, evaluation results, and an incident checklist. The docs in this folder are the starting point for that handoff.”

### Q11. How do you prioritize bugs?

> “By user impact and blast radius. Authentication or data leakage first, then ingestion correctness, then retrieval quality, then generation quality, then UI polish.”

### Q12. What did you learn from building this?

> “That RAG is a system, not a single model call. Validation, chunking, metadata, user scoping, retrieval, prompt design, citations, and persistence all affect whether users trust the answer.”

---

## 16. Customer meeting checklist

### Before the meeting

- Bring the 30-second architecture answer.
- Bring one live demo path and one failure path.
- Prepare three questions about data, identity, and success criteria.
- Know which items are **NOT IMPLEMENTED**.

### During the meeting

- Write down the customer's exact words for the problem.
- Separate “must have for pilot” from “nice to have”.
- Ask who owns the data and who approves access.
- Avoid promising production features that are not built.

### After the meeting

- Send a short recap: problem, proposed PoC scope, success metrics, open questions.
- List assumptions explicitly.
- Mark items requiring verification.
- Convert each gap into an owner and next step.

---

## 17. FDE preparation plan

### Before the interview

1. Memorize the 30-second positioning answer.
2. Be able to draw the ingestion → embedding → search → generation flow.
3. Know the five honest gaps: production deployment, queues, persistent FAISS, SSO/RBAC, evaluation.
4. Practice one non-technical explanation for each major component.
5. Review the verified frontend/backend mismatches so you can discuss contract testing.

### During system-design rounds

1. Ask about scale, access control, and deployment boundary before proposing tools.
2. Start from the current implementation, then evolve it.
3. Say which changes are **PROPOSED**.
4. Include observability and rollback in the design.

### After the interview

1. Note every question you could not answer.
2. Map it to a source file in `18_CODE_FILE_REFERENCE.md`.
3. Add a one-page answer to your own notes.
4. Rehearse aloud, not silently.

---

## 18. Final answer bank

### “Are you an AI researcher?”

> “No. I am an engineer focused on shipping useful AI systems. I understand the core RAG concepts and can implement and debug them, but my strength is integrating models with real applications and explaining trade-offs.”

### “Is the model trained on customer data?”

> “No. The current application does not train or fine-tune a model. It retrieves text at query time and supplies it as context to the local model.”

### “Is it multi-tenant?”

> “It has per-user filtering, but it is not a complete multi-tenant enterprise system. There is no tenant model, role model, or document-level ACL.”

### “Can it crawl internal websites?”

> “The current crawler intentionally allows only public HTTP/HTTPS destinations and rejects private or non-global IP addresses. Internal crawling would need a policy-driven redesign.”

### “Can it handle scanned PDFs?”

> “Not currently. `extract_pdf_text()` raises an error when no readable text is found. OCR would be a proposed ingestion improvement.”

### “Does it remember the conversation?”

> “It stores conversation messages, but the current RAG call does not pass prior messages into retrieval or generation. Each answer is based on the current question and retrieved chunks.”

### “Is it production ready?”

> “No. It is a working local implementation. Production readiness would require secure settings, deployment configuration, background jobs, persistent vector indexing, SSO/RBAC, monitoring, and evaluation.”

---

## 19. Closing statement

> “The strongest thing I can say is not that the project is enterprise-ready; it is that I built and understand the complete RAG loop. I can take a customer problem, map it to the current code, demonstrate value, identify the gaps honestly, and propose a safe production path. That is the FDE mindset.”
