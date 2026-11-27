# 06 — Website Crawler

Primary source: `backend/documents/services/web_crawler.py`, with related files `web_views.py`, `web_serializers.py`, `web_embedding_service.py`, and `models.py`.

---

## 1. What is web crawling?

Web crawling is automatically fetching web pages, extracting their content, and discovering links to other pages. A crawler usually starts from a root URL, keeps a queue of URLs, and visits them within configured limits.

KnowHub AI crawls public same-host HTML pages and turns them into searchable chunks.

---

## 2. HTML parsing

HTML parsing means reading the HTML document structure and extracting useful parts such as `<title>`, `<main>`, text, and `<a href>` links.

This project uses BeautifulSoup:

```python
soup = BeautifulSoup(html, "html.parser")
```

---

## 3. What is Requests?

`requests` is a Python HTTP client library. The crawler uses it to fetch `robots.txt` and pages:

```python
requests.get(
    current_url,
    headers={"User-Agent": USER_AGENT},
    timeout=REQUEST_TIMEOUT,
    stream=True,
    allow_redirects=False,
)
```

`stream=True` lets the code enforce a maximum response size while downloading.

---

## 4. What is BeautifulSoup?

BeautifulSoup is a Python library for parsing HTML and navigating the DOM-like tree. Here it:

- removes noisy tags;
- extracts `<title>`;
- prefers `<main>` or `<article>` content over `body`;
- collects all anchor `href` values.

---

## 5. What is robots.txt?

`robots.txt` is a file websites publish to state which crawlers may access which paths. Python's `RobotFileParser` reads it, and the crawler calls:

```python
if not robots.can_fetch(USER_AGENT, current_url):
    continue
```

Behavior in this project:

- `robots.txt` is fetched through `safe_fetch()`;
- if HTTP 200, lines are parsed;
- if not HTTP 200, the code allows all paths with `["User-agent: *", "Disallow:"]`;
- if `safe_fetch()` fails, crawling stops (“fail closed”).

---

## 6. Same-host crawling

The root hostname is stored:

```python
base_host = parsed_start.hostname.lower()
```

Queued pages are skipped if:

```python
parsed.hostname.lower() != base_host
```

Discovered links are added only when their hostname matches `base_host`.

Nuance: this compares hostname only, not scheme or port. URL validation separately restricts ports to 80 and 443.

---

## 7. Crawling depth and page count

Function signature:

```python
def crawl_website(start_url, max_pages=5, max_depth=2):
```

Validation:

```python
if not 1 <= max_pages <= 20:
    raise CrawlerError("max_pages must be between 1 and 20.")

if not 0 <= max_depth <= 3:
    raise CrawlerError("max_depth must be between 0 and 3.")
```

The web view passes `max_pages` from the request but does **not** pass `max_depth`, so the effective depth is the default `2`.

Depth behavior:

- root URL is depth 0;
- links found at depth 0 are queued at depth 1;
- links found at depth 1 are queued at depth 2;
- links are not discovered from depth 2 pages when `max_depth = 2`.

Page count:

- `max_pages` comes from the form and is limited to 1–20;
- the BFS loop stops when `len(pages) >= max_pages`.

---

## 8. URL validation

`validate_public_url(url)` checks:

1. scheme is only `http` or `https`;
2. hostname exists;
3. URL has no username/password;
4. port is only 80 or 443;
5. hostname is not `localhost` or `localhost.localdomain`;
6. DNS resolution succeeds;
7. every resolved address has `ip.is_global == True`.

This rejects obvious private destinations such as `127.0.0.1`, `10.x`, `172.16–31.x`, and `192.168.x` after DNS resolution.

---

## 9. Redirect handling

`safe_fetch()` sets `allow_redirects=False` and manually follows redirects:

```python
for _ in range(MAX_REDIRECTS + 1):
    validate_public_url(current_url)
    ...
    if response.is_redirect or response.is_permanent_redirect:
        location = response.headers.get("Location")
        current_url = urljoin(current_url, location)
        continue
```

Constants:

```python
MAX_REDIRECTS = 5
REQUEST_TIMEOUT = 15
MAX_PAGE_SIZE = 2 * 1024 * 1024
```

Every redirect destination is passed through `validate_public_url()` before fetching.

Nuance: after a redirect, the final `response.url` is stored without another explicit same-host or `robots.txt` check in `crawl_website()`. This is a production concern.

---

## 10. Private IP and localhost rejection

Explicit code:

```python
if hostname in ("localhost", "localhost.localdomain"):
    raise CrawlerError("Localhost URLs are not allowed.")
```

And:

```python
for address in addresses:
    ip = ipaddress.ip_address(address[4][0])
    if not ip.is_global:
        raise CrawlerError(
            "Private or non-public network destinations are not allowed."
        )
```

This is application-level SSRF protection, but it is not complete. See security section below.

---

## 11. Title and content extraction

`extract_page_content(html)`:

```python
for element in soup([
    "script", "style", "noscript", "header", "footer", "nav", "svg", "iframe",
]):
    element.decompose()
```

Then:

```python
title = soup.title.get_text(" ", strip=True) if soup.title else ""
main_content = soup.find("main") or soup.find("article") or soup.body
text = main_content.get_text(" ", strip=True)
text = " ".join(text.split())
```

Links:

```python
for anchor in soup.find_all("a", href=True):
    links.append(anchor["href"])
```

Output:

```python
{
    "title": title,
    "content": text,
    "links": links,
}
```

---

## 12. Link discovery and BFS

`crawl_website()` uses `collections.deque`:

```python
queue = deque([(start_url, 0)])
visited = set()
```

For each URL:

- remove fragment with `urldefrag()`;
- skip if already visited;
- validate public URL;
- enforce same host;
- check `robots.can_fetch()`;
- fetch with `safe_fetch()`;
- require `text/html` in the content type;
- decode UTF-8 with `errors="replace"`;
- extract content;
- skip pages with empty content;
- append result;
- discover links only if `depth < max_depth`;
- normalize links with `urljoin(response["url"], link)`;
- sleep `0.5` seconds after a successful page.

Returned structure:

```python
{
    "start_url": start_url,
    "total_pages": len(pages),
    "pages": pages,
    "errors": errors,
}
```

---

## 13. Website models

### `WebSource`

| Field | Type | Notes |
|---|---|---|
| `id` | BigAutoField | Primary key |
| `user` | FK to User, CASCADE, `related_name="web_sources"` | Owner |
| `root_url` | URLField(2048) | Starting URL |
| `title` | CharField(500), blank | First page title or empty |
| `status` | CharField choices | `queued`, `processing`, `completed`, `failed` |
| `max_pages` | PositiveSmallIntegerField(default=5) | Requested page limit |
| `pages_count` | PositiveSmallIntegerField(default=0) | Successful pages |
| `error_message` | TextField(blank) | Truncated to 2000 chars on failure |
| `created_at`, `updated_at` | DateTimeFields | Timestamps |
| `last_crawled_at` | DateTimeField(null=True) | Set on success |

### `WebPage`

| Field | Type | Notes |
|---|---|---|
| `id` | BigAutoField | Primary key |
| `source` | FK to WebSource, CASCADE, `related_name="pages"` | Parent source |
| `url` | URLField(2048) | Page URL |
| `title` | CharField(500), blank | Extracted title |
| `content` | TextField | Extracted readable text |
| `created_at` | DateTimeField | Timestamp |

Unique constraint: `(source, url)` named `unique_webpage_per_source`.

### `WebPageChunk`

| Field | Type | Notes |
|---|---|---|
| `id` | BigAutoField | Primary key |
| `page` | FK to WebPage, CASCADE, `related_name="chunks"` | Parent page |
| `chunk_number` | PositiveIntegerField | Per-page order |
| `content` | TextField | Chunk text |
| `embedding` | JSONField(null=True, blank=True) | 384-number vector |
| `created_at` | DateTimeField | Timestamp |

Unique constraint: `(page, chunk_number)`. Index: `(page, chunk_number)`.

Relationship: `User 1 → N WebSource 1 → N WebPage 1 → N WebPageChunk`.

---

## 14. Page-to-chunk-to-embedding flow

`process_web_page(page)`:

1. If content is empty, delete existing chunks and return 0.
2. `chunk_text(page.content, chunk_size=1000, overlap=200)`.
3. `generate_embeddings(chunks)`.
4. Validate lengths match.
5. Build `WebPageChunk` objects with `chunk_number = index + 1`.
6. In `transaction.atomic()`, delete old chunks and `bulk_create()` new ones.
7. Return chunk count.

`process_web_source(source)` loops all pages and returns:

```python
{
    "processed_pages": processed_pages,
    "total_chunks": total_chunks,
}
```

---

## 15. Unified RAG entry

Website chunks enter the same retrieval pipeline as PDF chunks:

```python
web_chunks = WebPageChunk.objects.filter(
    page__source__user=user,
    embedding__isnull=False,
).select_related("page", "page__source")
```

Metadata includes `source_type = "website"`, `page_url`, `web_source_id`, and a title fallback chain:

```python
chunk.page.title or chunk.page.source.title or chunk.page.url
```

---

## 16. API behavior

### `GET /api/documents/web-sources/`

- user-filtered;
- `prefetch_related("pages")`;
- nested pages serialized including full content.

### `POST /api/documents/web-sources/`

Expected request:

```json
{
  "url": "https://example.com",
  "max_pages": 5
}
```

Validation:

- `url` is `URLField(max_length=2048)`;
- `max_pages` integer 1–20, default 5.

Steps: create source → crawl → save pages → process embeddings → status completed → response 201 with `embedding_result`.

Failure: status failed, `error_message = str(exc)[:2000]`, HTTP 400.

**Verified mismatch:** `frontend/src/services/webSourceService.js` sends `root_url`, not `url`. The current frontend form will not satisfy the serializer unless this is corrected.

### `GET /api/documents/web-sources/{id}/`

Uses `get_object_or_404(WebSource, pk=pk, user=request.user)`, preventing cross-user access.

### `DELETE /api/documents/web-sources/{id}/`

Deletes source; `CASCADE` removes pages and chunks. Returns HTTP 200 with a message.

---

## 17. Security concerns

### Existing checks

| Concern | Existing implementation |
|---|---|
| SSRF via scheme | Only HTTP/HTTPS |
| SSRF via localhost | Explicit hostname rejection |
| SSRF via private IP | `ip.is_global` check after DNS |
| Credentials in URL | Rejected |
| Non-standard ports | Only 80/443 |
| Malicious redirects | Each redirect validated; max 5 |
| Oversized responses | `Content-Length` check and 2 MB streaming cap |
| Slow endpoints | 15-second request timeout |
| Unauthorized crawling | `robots.txt` checked; fail closed on fetch error |
| Cross-user source access | `user=request.user` filters |

### Production hardening — PROPOSED / NOT IMPLEMENTED

1. **DNS rebinding** — the code resolves DNS for validation, then `requests` resolves again during connection. An attacker can change DNS between those steps. Fix: pin the validated IP at connection time or enforce egress proxy/firewall rules.
2. **Network-level SSRF defense** — application checks can be bypassed. Use outbound firewall rules, proxy allowlists, and metadata-service blocking.
3. **Redirect final URL** — revalidate final host, IP, robots, and same-host policy after redirects.
4. **Content type trust** — content type comes from the response header; validate actual bytes.
5. **HTML prompt injection** — crawled text is placed into the LLM context. The prompt says to ignore document instructions, but this is not a hard boundary.
6. **Untrusted website content** — sanitize before display; React escapes text, but URLs and content still need policy controls.
7. **Rate limiting and budgets** — no per-user crawl quota; only 0.5-second politeness delay.
8. **Crawl depth persistence** — no `max_depth` field; depth is hard-coded default in the view call.
9. **Terms-of-service compliance** — robots.txt is checked, but legal/policy review is still required.
10. **Observability** — crawl errors are returned in-memory but not logged or monitored centrally.

---

## 18. Interview Q&A

### Q1. What is the difference between scraping and crawling?

**Spoken:** “Crawling discovers links and visits multiple pages; scraping extracts data from a page.”

**Detail:** This project does both: BFS discovery plus BeautifulSoup extraction.

**Source:** `web_crawler.py`.

**Follow-up:** Does it execute JavaScript? No.

---

### Q2. Why is `robots.txt` checked before every page?

**Spoken:** “Because permission can differ by path.”

**Detail:** `robots.can_fetch(USER_AGENT, current_url)` is called inside the crawl loop.

**Source:** `web_crawler.py`.

**Follow-up:** What if robots.txt is unavailable? The code stops with an error.

---

### Q3. How do you prevent crawling the whole internet?

**Spoken:** “Same-host restriction, max depth, max pages, visited set, and fragments removed.”

**Detail:** Defaults are `max_pages=5`, `max_depth=2`, validated up to 20 and 3.

**Source:** `crawl_website()`.

**Follow-up:** Could a redirect leave the host? Yes; final redirect host is not explicitly rechecked.

---

### Q4. Why stream the response?

**Spoken:** “To stop downloading once a 2 MB limit is crossed.”

**Detail:** `iter_content(8192)` with a running total.

**Source:** `safe_fetch()`.

**Follow-up:** Is `Content-Length` enough? No; the code also measures actual bytes.

---

### Q5. What is SSRF?

**Spoken:** “Server-Side Request Forgery: tricking the server into making requests to internal systems.”

**Detail:** This crawler blocks localhost, private IPs, credentials, bad schemes, and bad ports, but DNS rebinding still needs network controls.

**Source:** `validate_public_url()`.

**Follow-up:** Why is DNS rebinding dangerous? Validation resolves one IP; connection may resolve another.

---

### Q6. How do website results become RAG sources?

**Spoken:** “They are chunked, embedded, stored as WebPageChunk rows, and loaded by `search_knowledge()` with `source_type='website'`.”

**Detail:** Metadata includes URL and web source ID.

**Source:** `web_embedding_service.py`, `vector_search.py`.

**Follow-up:** How does the UI distinguish them? Globe icon and Website chip in `Chat.jsx`.
