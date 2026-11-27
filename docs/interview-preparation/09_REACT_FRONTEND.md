# 09 — React Frontend

Primary sources: `frontend/src/App.jsx`, `main.jsx`, `components/DashboardLayout.jsx`, `pages/`, `services/`, `theme.js`, `vite.config.js`, `package.json`.

---

## 1. Application structure

```text
frontend/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── theme.js
    ├── App.css
    ├── index.css
    ├── components/
    │   └── DashboardLayout.jsx
    ├── pages/
    │   ├── Login.jsx
    │   ├── Register.jsx
    │   ├── Dashboard.jsx
    │   ├── Documents.jsx
    │   ├── WebSources.jsx
    │   ├── Search.jsx
    │   └── Chat.jsx
    └── services/
        ├── api.js
        ├── authService.js
        ├── documentService.js
        ├── webSourceService.js
        ├── searchService.js
        ├── chatService.js
        └── conversationService.js
```

---

## 2. Vite

`vite.config.js` uses `@vitejs/plugin-react`. Scripts in `package.json`:

- `npm run dev` — Vite dev server;
- `npm run build` — production bundle;
- `npm run lint` — Oxlint;
- `npm run preview` — preview built bundle.

README documents frontend dev URL `http://localhost:5173/`. Vite config does not define a proxy; API calls go directly to `http://127.0.0.1:8000/api/`.

---

## 3. React Router

`main.jsx` wraps the app in `BrowserRouter`, `ThemeProvider`, `CssBaseline`, and `React.StrictMode`.

`App.jsx` routes:

| Path | Component | Access |
|---|---|---|
| `/login` | `Login` | Public |
| `/register` | `Register` | Public |
| `/dashboard` | `Dashboard` | Inside `DashboardLayout` |
| `/documents` | `Documents` | Inside `DashboardLayout` |
| `/web-sources` | `WebSources` | Inside `DashboardLayout` |
| `/search` | `Search` | Inside `DashboardLayout` |
| `/chat` | `Chat` | Inside `DashboardLayout` |
| `/` | Navigate to `/dashboard` | Redirect |
| `*` | Navigate to `/dashboard` | Redirect |

Protected route implementation is client-side: `DashboardLayout` calls `GET /api/auth/me/` in `useEffect` and navigates to `/login` if it fails. Backend permissions remain the real security boundary.

---

## 4. Material UI

`theme.js` defines colors, typography, button defaults, and border radius. Components use MUI `Box`, `Card`, `TextField`, `Button`, `Chip`, `Alert`, `CircularProgress`, `Drawer`, `AppBar`, and icons.

MUI is used for both layout and feedback states.

---

## 5. Axios API layer

`services/api.js`:

```javascript
const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
  headers: { "Content-Type": "application/json" },
});
```

### Request interceptor

- reads `localStorage.getItem("access_token")`;
- sets `Authorization: Bearer <token>`;
- deletes `Content-Type` for `FormData` so the browser sets the multipart boundary.

### Response interceptor

On 401, excluding login and refresh calls:

1. mark `originalRequest._retry = true`;
2. read `refresh_token`;
3. `POST` directly to `/api/auth/token/refresh/`;
4. store new `access_token`;
5. retry original request with new header;
6. on failure clear both tokens.

Limitation: the interceptor does not itself navigate to `/login`; pages/layout handle that separately.

---

## 6. Authentication flow

### `authService.js`

| Function | API call | Behavior |
|---|---|---|
| `register(userData)` | POST `auth/register/` | Returns response data |
| `login(email, password)` | POST `auth/login/` with `username: email` | Stores access/refresh in localStorage |
| `getCurrentUser()` | GET `auth/me/` | Used by layout/dashboard |
| `logout()` | — | Removes both tokens |

### `Login.jsx`

- email/password form;
- shows password visibility toggle;
- error message reads `detail`, `non_field_errors[0]`, or fallback;
- navigates to `/dashboard` on success.

“Remember me” checkbox state exists but is not used in logic.

### `Register.jsx`

- collects username, email, password, confirm password;
- checks password match client-side;
- sends `username: form.email`, `email: form.email`, `password`;
- navigates to login with a success state.

The typed username field is not used in the API payload.

---

## 7. Dashboard

`Dashboard.jsx`:

- calls `authService.getCurrentUser()`;
- `Promise.all([api.get("documents/"), api.get("conversations/")])`;
- computes total documents, ready documents, processing documents, conversations;
- shows recent documents and recent conversations;
- has retry button for data errors;
- logout clears tokens and navigates to login.

It accepts either paginated (`data.results`) or plain array responses.

---

## 8. Document management

`Documents.jsx`:

- drag-and-drop and file picker;
- client-side extension check `.pdf` and MIME check when available;
- client-side 20 MB limit;
- `documentService.uploadDocument()` sends `FormData`;
- status cards: Uploaded, Processing, Completed, Failed;
- title search and status filter using `useMemo`;
- delete confirmation with `window.confirm`;
- manual refresh button;
- loading and error alerts.

`documentService.js`:

```javascript
const formData = new FormData();
formData.append("file", file, file.name);
const response = await api.post("documents/", formData);
```

Upload is synchronous from the user's perspective: the browser waits for PDF processing to finish.

---

## 9. Website source management

`WebSources.jsx`:

- URL text field;
- max pages field (1–20);
- add, refresh, expand pages, delete;
- shows status, pages_count, error_message, and nested crawled pages.

**Verified mismatch:** `webSourceService.createWebSource()` sends:

```javascript
{
  root_url: rootUrl,
  max_pages: maxPages
}
```

But `WebSourceCreateSerializer` expects `url`. Therefore the current frontend form does not match the backend contract. The error handler also checks `responseData.root_url[0]`, while a backend validation error would be on `url`.

---

## 10. Search interface

`Search.jsx`:

- query text field;
- `searchDocuments(query, 5)` → POST `documents/search/`;
- loading spinner;
- renders `document_title`, `content`, `similarity`;
- shows a `Page` chip using `result.page_number`.

Backend search is unified across PDFs and websites. The UI text still says “Search your uploaded PDFs”, and website results have `page_number: null`, so the chip can display `Page null`. These are presentation gaps.

---

## 11. Chat interface

`Chat.jsx` state:

- `conversations`;
- `activeConversation`;
- `messages`;
- `question`;
- `loading`, `loadingHistory`, `error`, `historyOpen`.

Flow:

1. load conversation list on mount;
2. show temporary user bubble immediately;
3. create a conversation if none active;
4. call `askConversation(id, question, 5)`;
5. refetch `getConversation(id)` to get persisted messages;
6. reload the conversation list;
7. show spinner while waiting.

Citation rendering:

```javascript
const isWebsite =
  source.source_type === "website" || Boolean(source.page_url);
```

- website: globe icon, Website chip, clickable URL;
- PDF: document icon, PDF chip, page number;
- both: similarity score with `.toFixed(3)`.

No streaming. No optimistic assistant answer. Prior messages are not sent to the backend for context.

---

## 12. Service files

| File | Responsibility |
|---|---|
| `api.js` | Axios instance, JWT interceptor, refresh, FormData handling |
| `authService.js` | Register, login, current user, logout |
| `documentService.js` | List, upload, delete documents |
| `webSourceService.js` | List/create/get/delete web sources |
| `searchService.js` | Unified semantic search request |
| `chatService.js` | Direct `documents/ask/` request (standalone RAG) |
| `conversationService.js` | Conversation CRUD and ask |

`chatService.js` is not used by `Chat.jsx`; chat uses `conversationService.js`.

---

## 13. Loading and error handling

| Page | Loading UI | Error UI |
|---|---|---|
| Dashboard | Spinner while initializing | Alert with retry for data load |
| Documents | Spinner/button states | MUI `Alert severity="error"` |
| WebSources | Spinner/crawling button | MUI error alert |
| Search | `CircularProgress` | Typography error |
| Chat | Thinking bubble and history spinner | MUI error alert |

---

## 14. Frontend limitations / gaps

1. JWTs stored in `localStorage` (XSS risk).
2. Hardcoded backend URL in `api.js`.
3. No environment configuration for API base URL.
4. Protected route is client-side only.
5. Web-source payload field mismatch.
6. Search page still describes PDF-only search.
7. Search result page chip does not handle `page_number: null`.
8. No pagination.
9. No polling for processing status.
10. No streaming responses.
11. Typed username on registration is ignored.
12. “Remember me” has no behavior.
13. No automated frontend tests.
14. No accessibility audit performed.

---

## 15. Interview Q&A

### Q1. Why use an Axios interceptor?

**Spoken:** “So every request automatically carries the JWT without passing it in every service call.”

**Detail:** Request interceptor adds the header; response interceptor refreshes on 401.

**Source:** `api.js`.

**Follow-up:** Why avoid refresh loops? Exclusions and `_retry` flag.

---

### Q2. Why delete Content-Type for FormData?

**Spoken:** “The browser must set the multipart boundary itself.”

**Detail:** If we force `application/json` or a static multipart header, Django cannot parse the upload correctly.

**Source:** `api.js`, `documentService.js`.

**Follow-up:** Which DRF parser handles it? `MultiPartParser`.

---

### Q3. How are protected routes implemented?

**Spoken:** “DashboardLayout checks `/auth/me/` and redirects if it fails. The backend still enforces auth on every endpoint.”

**Detail:** Client-side UX guard plus server-side permission.

**Source:** `DashboardLayout.jsx`, `settings.py`.

**Follow-up:** Is localStorage ideal? No; secure HTTP-only cookies are safer.

---

### Q4. How does chat display citations?

**Spoken:** “It inspects `source_type`, shows a link for websites and page number for PDFs, and prints similarity.”

**Detail:** `message.sources` comes from the assistant message JSON.

**Source:** `Chat.jsx`, `rag_service.py`.

**Follow-up:** Are citations inline in answer text? No.

---

### Q5. What happens if refresh fails?

**Spoken:** “Both tokens are removed from localStorage.”

**Detail:** The response interceptor catches refresh failure and clears tokens.

**Source:** `api.js`.

**Follow-up:** Does it redirect? Not in the interceptor; layout/page handles subsequent auth failure.
