# KnowHub AI — Enterprise Knowledge Assistant

An AI-powered enterprise knowledge management and question-answering platform that allows users to upload PDF documents, search their content using semantic search, and ask questions in natural language.

KnowHub AI uses **Retrieval-Augmented Generation (RAG)** to retrieve relevant information from uploaded documents and generate context-aware answers using a locally running Large Language Model (LLM).

The application is built using React.js, Django REST Framework, MySQL, FAISS, Sentence Transformers, and Ollama.

---

## Project Overview

Organizations often store important information across multiple PDF documents, making it difficult to find specific information quickly.

KnowHub AI addresses this problem by providing a centralized knowledge assistant where users can:

- Upload and manage PDF documents.
- Extract and process document content automatically.
- Convert document content into searchable text chunks.
- Generate vector embeddings for semantic search.
- Search documents using natural language.
- Ask questions and receive AI-generated answers based on document content.
- Maintain multiple conversations with persistent chat history.
- View document sources and page references used to generate answers.

The application uses locally hosted AI models, reducing dependency on paid external AI APIs.

## Key Features

### 1. User Authentication

- User registration and login.
- JWT-based authentication.
- Access token and refresh token handling.
- Protected API endpoints.
- User-specific document and conversation access.

### 2. Document Management

- Upload PDF documents.
- PDF file validation.
- File size validation (maximum 20 MB).
- PDF content extraction.
- Document processing status tracking.
- View uploaded documents.
- Delete uploaded documents.
- Document statistics and filtering.

### 3. PDF Processing

- Extract text from PDF files using PyMuPDF.
- Process document content page by page.
- Split extracted content into smaller text chunks.
- Maintain page numbers and chunk references.
- Store extracted chunks in MySQL.

### 4. Semantic Search

- Generate text embeddings using Sentence Transformers.
- Use the `all-MiniLM-L6-v2` embedding model.
- Generate 384-dimensional vector representations.
- Perform similarity searches using FAISS.
- Retrieve the most relevant document chunks.
- Restrict search results to the authenticated user's documents.

### 5. AI Question Answering

- Ask questions in natural language.
- Retrieve relevant document content using semantic search.
- Pass retrieved context to the LLM.
- Generate context-aware answers.
- Display relevant source documents and page references.
- Instruct the model not to invent answers when the provided context is insufficient.

### 6. AI Chat and Conversation Management

- Create new conversations.
- Maintain multiple chat sessions.
- Continue previous conversations.
- Store user and assistant messages.
- Display conversation history.
- Delete conversations.
- Display document sources associated with AI responses.

### 7. Modern User Interface

- React.js frontend.
- Material UI component library.
- Responsive dashboard layout.
- Sidebar navigation.
- Document management interface.
- Semantic search interface.
- AI chat interface.
- Loading and error states.

---

## Technology Stack

| Category | Technology |
|---|---|
| Frontend | React.js |
| Build Tool | Vite |
| UI Framework | Material UI (MUI) |
| Routing | React Router DOM |
| HTTP Client | Axios |
| Backend | Python |
| Backend Framework | Django |
| API Framework | Django REST Framework |
| Authentication | Simple JWT |
| Database | MySQL |
| PDF Processing | PyMuPDF |
| Text Embeddings | Sentence Transformers |
| Embedding Model | all-MiniLM-L6-v2 |
| Vector Search | FAISS (CPU) |
| LLM Runtime | Ollama |
| LLM Model | qwen2.5:0.5b |
| Programming Languages | Python, JavaScript |
| Version Control | Git and GitHub |

---

## System Architecture

```text
                   USER
                     |
                     v
          REACT.JS FRONTEND
             (Vite + MUI)
                     |
                     v
              DJANGO REST API
                     |
          +----------+-----------+
          |          |           |
          v          v           v
     Authentication  Documents  Conversations
          |          |           |
          |          v           |
          |     PDF Extraction   |
          |       (PyMuPDF)      |
          |          |           |
          |          v           |
          |     Text Chunking    |
          |          |           |
          |          v           |
          |    Embedding Model   |
          |          |           |
          |          v           |
          |      FAISS Search    |
          |          |           |
          +----------+-----------+
                     |
                     v
                  MySQL
             (Application Data,
              Chunks, Embeddings,
              Chat History)
                     |
                     v
              RETRIEVAL (RAG)
                     |
                     v
                OLLAMA LLM
               qwen2.5:0.5b
                     |
                     v
              AI-GENERATED
                 ANSWER
                     |
                     v
             REACT.JS FRONTEND
```

## How RAG Works in KnowHub AI

KnowHub AI implements a Retrieval-Augmented Generation pipeline.

### Step 1: Document Upload

The user uploads a PDF through the React frontend.

The Django REST API validates the file and stores the document.

### Step 2: Text Extraction

PyMuPDF extracts text from the uploaded PDF, preserving page-level information.

### Step 3: Text Chunking

The extracted content is divided into smaller chunks.

Current chunking configuration:

- Chunk size: 1,000 characters approximately, split at word boundaries.
- Chunk overlap: 200 characters.
- Page-level chunk tracking.

Overlap helps preserve context between adjacent chunks.

### Step 4: Embedding Generation

Sentence Transformers converts each text chunk into a numerical vector.

Embedding model:

`sentence-transformers/all-MiniLM-L6-v2`

Each embedding contains 384 dimensions.

The generated embeddings are stored in MySQL.

### Step 5: Semantic Search

When a user submits a question:

1. The question is converted into an embedding.
2. The application retrieves the authenticated user's document chunks.
3. FAISS performs similarity search using an inner-product index.
4. The most relevant chunks are selected.

The embeddings are normalized, allowing inner-product similarity to represent cosine similarity.

### Step 6: Context Retrieval

The selected document chunks are combined into a context containing document and page references.

### Step 7: LLM Answer Generation

The retrieved context and user question are sent to the locally running Ollama model.

Model: `qwen2.5:0.5b`

The LLM generates an answer based on the retrieved context.

### Step 8: Source References

The response includes relevant source information, including document names and page references, so users can identify where the answer originated.

---

## Project Folder Structure

```text
knowhub-ai/
│
├── backend/
│   │
│   ├── config/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── __init__.py
│   │
│   ├── accounts/
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── models.py
│   │
│   ├── documents/
│   │   ├── services/
│   │   │   ├── pdf_extractor.py
│   │   │   ├── text_chunker.py
│   │   │   ├── embedding_service.py
│   │   │   ├── document_processor.py
│   │   │   ├── vector_search.py
│   │   │   ├── llm_service.py
│   │   │   └── rag_service.py
│   │   │
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   │
│   ├── conversations/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   │
│   ├── media/
│   ├── manage.py
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── theme.js
│   │
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

*Folder structure is representative; adjust it if your local project contains additional files.*

---

## Installation and Setup

### Prerequisites

Install the following software before running the project:

- Python 3.11 or later, with compatible dependencies.
- Node.js and npm.
- MySQL Server.
- Ollama.
- Git.

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/knowhub-ai.git

cd knowhub-ai
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv .venv
```

Activate the environment on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file inside the backend directory.

Example:

```env
SECRET_KEY=your-django-secret-key
DEBUG=True

DB_NAME=knowhub_ai
DB_USER=root
DB_PASSWORD=your-mysql-password
DB_HOST=127.0.0.1
DB_PORT=3306
```

Never commit your actual `.env` file or database credentials to GitHub.

### 4. Create MySQL Database

Open MySQL Workbench or the MySQL command line and execute:

```sql
CREATE DATABASE knowhub_ai
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

### 5. Run Database Migrations

From the backend directory:

```bash
python manage.py makemigrations

python manage.py migrate
```

Start the Django development server:

```bash
python manage.py runserver
```

Backend URL:

`http://127.0.0.1:8000/`

### 6. Install and Configure Ollama

Download and install Ollama:

https://ollama.com/

Pull the required model:

```bash
ollama pull qwen2.5:0.5b
```

Start Ollama:

```bash
ollama serve
```

Ollama API:

`http://127.0.0.1:11434/`

Ensure the model is available:

```bash
ollama list
```

### 7. Frontend Setup

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the React development server:

```bash
npm run dev
```

Frontend URL:

`http://localhost:5173/`

---

## API Endpoints

The application exposes REST APIs through Django REST Framework.

### Authentication APIs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register/` | Register a new user |
| POST | `/api/auth/login/` | Authenticate user and obtain JWT tokens |
| POST | `/api/auth/token/refresh/` | Refresh access token |
| GET | `/api/auth/me/` | Retrieve authenticated user information |

### Document APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/documents/` | List user's documents |
| POST | `/api/documents/` | Upload a PDF document |
| DELETE | `/api/documents/{id}/` | Delete a document |
| POST | `/api/documents/search/` | Perform semantic document search |
| POST | `/api/documents/ask/` | Ask a question using RAG |

### Conversation APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/conversations/` | List conversations |
| POST | `/api/conversations/` | Create a conversation |
| GET | `/api/conversations/{id}/` | Retrieve conversation and messages |
| DELETE | `/api/conversations/{id}/` | Delete a conversation |
| POST | `/api/conversations/{id}/ask/` | Submit a question in a conversation |

Protected endpoints require JWT authentication.

---

## Database Design

The application uses MySQL as its primary relational database.

### Main Models

**User**

Uses Django's built-in authentication user model.

**Document**

Stores document metadata:

- Uploaded user.
- Document title.
- File path.
- File size.
- Processing status.
- Creation timestamp.

**DocumentChunk**

Stores extracted document content:

- Related document.
- Chunk number.
- Page number.
- Extracted text.
- Vector embedding.
- Creation timestamp.

**Conversation**

Stores chat session information:

- User.
- Conversation title.
- Created timestamp.
- Updated timestamp.

**Message**

Stores individual conversation messages:

- Related conversation.
- Message role (user or assistant).
- Message content.
- Source references.
- Creation timestamp.

---

## Security and Data Handling

KnowHub AI includes the following application-level security measures:

- JWT authentication for protected APIs.
- User-scoped document queries.
- User-scoped conversation queries.
- PDF extension and file-signature validation.
- Maximum upload size validation.
- Environment variables for database credentials and application secrets.
- Context instructions that treat retrieved document text as untrusted input.
- LLM instructions to answer using retrieved context rather than inventing information.

**Important:** This is a portfolio and development project. Before production deployment, additional hardening is required, including secure token storage, HTTPS, rate limiting, malware scanning, production-grade file storage, logging, monitoring, and robust authorization testing.

---

## Design Decisions

### Why MySQL?

MySQL stores application records, uploaded document metadata, extracted chunks, embeddings, and persistent conversation history.

### Why Sentence Transformers?

The `all-MiniLM-L6-v2` model provides compact semantic embeddings suitable for lightweight local semantic-search applications.

### Why FAISS?

FAISS provides efficient similarity search over vector representations without requiring a separate managed vector database.

The current implementation builds a FAISS index from the relevant stored embeddings during search. MySQL remains the source of truth.

### Why Ollama?

Ollama makes it possible to run a language model locally without depending on paid external LLM APIs.

### Why RAG?

RAG retrieves relevant document information before generating an answer. This helps ground responses in the user's uploaded knowledge rather than relying only on the LLM's general training data.

---

## Current Limitations

- PDF documents are supported; other document formats are not currently implemented.
- Document processing is synchronous.
- FAISS indexes are built during searches rather than maintained as a persistent vector index.
- The local LLM model is small and may produce less detailed answers than larger models.
- Performance depends on available system memory and CPU resources.
- The project is designed as a local development and portfolio application, not yet a production deployment.

---

## Future Enhancements

Potential improvements include:

- Support for DOCX, TXT, and additional document formats.
- Background document processing using Celery and Redis.
- Persistent FAISS indexes or a dedicated vector database.
- Streaming LLM responses.
- Conversation-aware retrieval and contextual follow-up questions.
- Improved document preview and citation navigation.
- Role-based access control.
- Admin dashboard and usage analytics.
- Cloud deployment.
- Automated testing and CI/CD.
- Improved prompt-injection defenses and document-level authorization tests.

---

## What This Project Demonstrates

KnowHub AI demonstrates practical implementation of:

- Full-stack application development.
- REST API development using Django REST Framework.
- React.js frontend development.
- JWT-based authentication.
- Relational database design using MySQL.
- PDF processing and text extraction.
- Text chunking and embedding generation.
- Semantic search using FAISS.
- Retrieval-Augmented Generation (RAG).
- Local LLM integration using Ollama.
- AI-powered question answering.
- Persistent chat and conversation management.
- Integration between frontend, backend, database, and AI services.

---

## Author

**Developed as a Full-Stack AI Portfolio Project**

**Technologies:** Python | Django REST Framework | React.js | MySQL | FAISS | Sentence Transformers | Ollama | RAG

GitHub: `https://github.com/YOUR_USERNAME`

---

## License

This project is available for educational and portfolio purposes. Add a license file if you intend to distribute or reuse the project under specific licensing terms.