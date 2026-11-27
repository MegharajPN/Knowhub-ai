# 03 — Sentence Transformers and Embeddings

Primary source: `backend/documents/services/embedding_service.py`.

---

## 1. What is Sentence Transformers?

Sentence Transformers is a Python library built around transformer models that converts sentences, paragraphs, or short passages into fixed-length vectors called embeddings.

In KnowHub AI it is used for two things:

- indexing: turn document chunks into vectors;
- querying: turn the user's question into a vector.

It is **not** an LLM chat runtime and it is **not** a vector database.

---

## 2. What is an embedding model?

An embedding model learns to place semantically similar text close together in vector space. For example, “paid time off” and “annual leave” should be closer than “paid time off” and “database index”.

The model does not store your documents. It only produces numbers for the text you give it.

---

## 3. What is `all-MiniLM-L6-v2`?

The exact string in code is:

```python
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
```

It is a compact general-purpose sentence embedding model. “MiniLM” refers to a distilled transformer architecture; “L6” means six transformer layers. It produces 384-dimensional vectors.

### Why was it selected?

Only the following can be verified:

- it is the model configured in `embedding_service.py`;
- it produces 384-dimensional vectors, matching `DIMENSIONS = 384` in `vector_search.py`;
- it is small enough for local CPU usage;
- it avoids an external embedding API.

A reasoned interview answer:

> “I chose a small local embedding model because the project is a local portfolio application. `all-MiniLM-L6-v2` gives reasonable general-purpose semantic vectors at 384 dimensions, which keeps memory and FAISS index size manageable while matching the small local LLM theme.”

Do **not** claim benchmark results; none are present in the repository.

---

## 4. What does 384 dimensions mean?

Each text is represented by 384 floating-point numbers. You can think of these as 384 learned features, but they are not human-labelled fields like “topic” or “sentiment”.

Code evidence:

```python
DIMENSIONS = 384  # vector_search.py
```

`DocumentChunk.embedding` and `WebPageChunk.embedding` store a list that should contain 384 numbers. `_search_faiss()` rejects anything else:

```python
if vectors.ndim != 2 or vectors.shape[1] != DIMENSIONS:
    raise ValueError("Stored embeddings must have 384 dimensions.")
```

---

## 5. Actual code line by line

```python
from sentence_transformers import SentenceTransformer
```

Imports the model class.

```python
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
```

Configures one model name used everywhere.

```python
_model = None
```

Module-level cache. It starts empty.

```python
def get_embedding_model():
    global _model

    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)

    return _model
```

This is a lazy singleton:

- first caller loads the model into memory;
- later callers reuse the same object;
- this avoids reloading weights for every chunk batch or query;
- in a multi-process server such as Gunicorn, each worker process may have its own copy because module memory is per-process.

```python
def generate_embeddings(texts):
    if not texts:
        return []
```

Empty input returns an empty list.

```python
    model = get_embedding_model()
```

Gets the cached model.

```python
    embeddings = model.encode(
        texts,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
```

Calls the model:

- `convert_to_numpy=True` returns a NumPy array;
- `normalize_embeddings=True` makes each vector length 1;
- `show_progress_bar=False` keeps server logs clean.

```python
    return embeddings
```

Returns an array with shape `(number_of_texts, 384)`.

---

## 6. How does text become a vector?

At a high level:

```text
text -> tokenizer -> transformer layers -> pooling -> 384-number vector -> L2 normalization
```

KnowHub AI does not implement tokenization or pooling manually. `SentenceTransformer.encode()` does it.

The application-level flow is:

```text
chunk_text / question string
    -> generate_embeddings([...])
    -> model.encode(...)
    -> normalized NumPy vector(s)
```

---

## 7. How are document chunks converted into vectors?

PDF path:

```python
texts = [chunk["content"] for chunk in chunks]
embeddings = generate_embeddings(texts)
```

Then each vector is stored:

```python
DocumentChunk(
    ...
    embedding=embedding.tolist(),
)
```

Website path in `web_embedding_service.py`:

```python
embeddings = generate_embeddings(chunks)
...
WebPageChunk(
    ...
    embedding=embedding.tolist(),
)
```

The conversion `.tolist()` is needed because MySQL `JSONField` stores Python lists/JSON, not NumPy arrays.

---

## 8. How is a user question converted into a vector?

In `vector_search.py`:

```python
query_vector = generate_embeddings([query]).astype(np.float32)
```

Important details:

- the question goes through the **same** `generate_embeddings()` function;
- it is wrapped in a list because `encode()` expects a list of texts;
- the result is cast to `float32` because FAISS vectors are `float32`.

---

## 9. Why must the same embedding model be used for indexing and querying?

Because vector space is model-specific. A vector from model A has no reliable geometric meaning relative to a vector from model B.

If chunks were embedded with `all-MiniLM-L6-v2` but questions with another model, FAISS could still compute numbers, but the ranking would be meaningless.

In this project consistency is maintained because:

- both ingestion and search import `generate_embeddings`;
- `generate_embeddings()` always uses the single `MODEL_NAME`;
- `DIMENSIONS = 384` matches the model output.

If the model is changed later, all stored embeddings must be regenerated. That is **NOT IMPLEMENTED** as a migration/reindex tool.

---

## 10. Cosine similarity vs inner-product similarity

### Cosine similarity

Cosine similarity compares the angle between two vectors:

```text
cos(A, B) = (A · B) / (||A|| * ||B||)
```

It ranges from -1 to 1. It ignores vector magnitude and focuses on direction.

### Inner product

Inner product is:

```text
A · B = sum(A[i] * B[i])
```

If both vectors are normalized to length 1, then:

```text
||A|| = ||B|| = 1
cos(A, B) = A · B
```

### In KnowHub AI

`embedding_service.py` uses `normalize_embeddings=True`. `vector_search.py` uses `faiss.IndexFlatIP(384)`. Therefore inner product produces cosine-similarity ranking.

This is an important interview point: **normalization is what makes the inner-product index behave like cosine search**.

---

## 11. What is vector normalization?

Scaling a vector so its length is 1 while keeping its direction.

Example in 2D:

```text
[3, 4] has length 5
normalized = [0.6, 0.8]
```

The direction is unchanged; magnitude becomes 1.

Benefits:

- inner product equals cosine similarity;
- scores are comparable;
- magnitude differences between long and short chunks do not dominate ranking.

`normalize_embeddings=True` implements this inside `model.encode()`.

---

## 12. What happens when embedding dimensions do not match?

`_search_faiss()` validates before calling FAISS:

```python
vectors = np.asarray(
    [record["embedding"] for record in records],
    dtype=np.float32,
)

if vectors.ndim != 2 or vectors.shape[1] != DIMENSIONS:
    raise ValueError("Stored embeddings must have 384 dimensions.")
```

Consequences:

- a 768-dimensional vector raises `ValueError`;
- a ragged list may not form a proper 2D array and raises;
- the view catches the exception and returns HTTP 500 for search/ask.

It also rejects invalid numeric values:

```python
if not np.isfinite(vectors).all():
    raise ValueError("Stored embeddings contain invalid values.")
```

---

## 13. Limitations of `all-MiniLM-L6-v2`

Verified from the implementation context; these are general model limitations, not measured project benchmarks:

1. **Small model** — may miss subtle domain semantics.
2. **Short effective input** — very long chunks can be truncated internally by the model; the project chunks to 1,000 characters but does not measure token length.
3. **No domain fine-tuning** — generic weights, no legal/medical/financial specialization.
4. **No multilingual guarantee** — English is the main practical use; no language detection exists.
5. **Semantic-only** — weak for exact identifiers, codes, part numbers, or rare keywords unless the embedding model happens to handle them.
6. **Static model** — changing models requires re-embedding everything.
7. **CPU latency** — encoding large batches is synchronous in the request path.

Production improvements are in `14_RAG_ADVANCED_CONCEPTS.md`.

---

## 14. Practical example

Question: “How many casual leaves do employees get?”

Chunk A: “Employees receive 12 casual leave days each calendar year.”

Chunk B: “The coffee machine is on the second floor.”

Both are encoded to 384 numbers. The question vector is close to Chunk A and far from Chunk B. With normalized vectors and `IndexFlatIP`, Chunk A gets the higher score.

---

## 15. Interview Q&A

### Q1. Is an embedding a summary?

**Spoken:** “Not exactly. It is a numeric representation of meaning. Humans cannot easily read it, but vector math can compare it.”

**Detail:** The model produces 384 floats. The original chunk text remains in MySQL for the prompt and citations.

**Source:** `embedding_service.py`, `models.py`.

**Follow-up:** Why keep original text? To build context and show citations.

---

### Q2. Why normalize embeddings?

**Spoken:** “So inner-product search becomes cosine-similarity ranking and long vectors do not win just because they are larger.”

**Detail:** `normalize_embeddings=True` in `model.encode()`.

**Source:** `embedding_service.py`, `vector_search.py`.

**Follow-up:** What index would you use without normalization? Cosine-related options or normalized vectors with IP; FAISS also has other metrics.

---

### Q3. What is a lazy singleton?

**Spoken:** “The model is loaded only on first use and then reused from a module-level variable.”

**Detail:** `_model` starts as `None`; `get_embedding_model()` creates it once.

**Source:** `embedding_service.py`.

**Follow-up:** Is it safe with Gunicorn workers? Each process has its own copy; memory must be planned.

---

### Q4. Why store embeddings in MySQL if FAISS searches them?

**Spoken:** “MySQL is the persistent source of truth; FAISS is rebuilt from it at query time.”

**Detail:** `JSONField` stores vectors; `vector_search.py` loads them into NumPy.

**Source:** `models.py`, `vector_search.py`.

**Follow-up:** Is that efficient at millions of chunks? No; persistent index or vector DB is recommended.

---

### Q5. What happens if the embedding model changes?

**Spoken:** “All stored vectors become incompatible and need re-embedding.”

**Detail:** No version field or reindex command exists in the current models.

**Source:** `models.py`, `embedding_service.py`.

**Follow-up:** How would you design that properly? Store `embedding_model` and `embedding_version` per chunk.

---

### Q6. Why `float32`?

**Spoken:** “FAISS CPU indexes commonly use float32, and it halves memory compared with float64.”

**Detail:** Code casts both stored vectors and query vector with `np.float32` / `.astype(np.float32)`.

**Source:** `vector_search.py`.

**Follow-up:** What about float16? Some indexes support it, but `IndexFlatIP` in this code uses float32 input.

---

### Q7. Does the embedding model understand the question's intent?

**Spoken:** “It captures semantic similarity, not full reasoning. It does not know whether the answer is factually correct.”

**Detail:** Retrieval may return a similar but wrong chunk; the LLM and evaluation still matter.

**Source:** architecture.

**Follow-up:** How do you improve retrieval quality? Hybrid search, reranking, better chunking, evaluation.
