# Record-App — Audio Intelligence

A mobile-friendly Vue 3 Single Page Application (SPA) for processing audio files through a full AI pipeline: **Upload → Transcribe → Summarize → Visualize**.

## Stack

- **Vue 3** (Composition API)
- **Vue Router 4** — multi-page SPA routing
- **Tailwind CSS 3** — responsive, mobile-first styling
- **Vite** — fast build tooling

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Authentication (email/password, API token, Google GIS on web) |
| `/` | Home dashboard — quick stats, recent jobs, and shortcuts |
| `/pipeline` | Audio pipeline (upload/record, transcribe, summarize, visualize) |
| `/history` | Past jobs with downloadable artifacts and re-run actions |
| `/settings` | LLM provider, API key, backend URL, and account controls |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Python FastAPI Backend

This frontend is designed to work with a Python FastAPI backend (`main.py`).

### Local development (recommended)

Start the Python backend on its default port:

```bash
uvicorn main:app --reload --port 8000
```

Then start the Vite dev server:

```bash
npm run dev
```

The Vite dev server automatically proxies all `/api/*` requests to `http://localhost:8000`, so no CORS configuration is needed during development. Leave `VITE_API_BASE_URL` unset (the default).

### Remote / production backend

Set `VITE_API_BASE_URL` in a `.env` file (copy from `.env.example`) and the frontend will send API requests directly to that URL:

```env
VITE_API_BASE_URL=https://your-backend.example.com
VITE_SITE_URL=https://your-frontend.example.com
```

When `VITE_API_BASE_URL` is set, the Vite proxy target is also updated so the dev server forwards requests to the same host.

### Backend CORS configuration (FastAPI)

The backend uses configurable CORS middleware with secure production defaults.

Example backend environment configuration:

```env
APP_ENV=production
CORS_ALLOW_ORIGINS=https://app.example.com,https://admin.example.com
CORS_ALLOW_CREDENTIALS=true
CORS_ALLOW_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS
CORS_ALLOW_HEADERS=Authorization,Content-Type,Accept,Origin,X-Requested-With
CORS_EXPOSE_HEADERS=
CORS_MAX_AGE=600
```

Notes:
- In `production`, wildcard origins (`*`) are intentionally rejected.
- Preflight `OPTIONS` requests are handled by the middleware.
- CORS response headers are applied automatically for allowed origins.

### Google OAuth

Set your Google OAuth client ID in `.env`:

```env
VITE_GOOGLE_CLIENT_ID=<your-client-id>
```

## Configuration

All runtime settings are saved to `localStorage` automatically. Configure on the **Settings** page:

- **LLM Provider**: Ollama (local), OpenAI, Claude, Gemini, or Groq
- **Model**: Optional — uses provider default if not set
- **API Key**: Required for cloud providers
- **API Base URL**: Full URL of your backend, or leave empty to use the dev proxy

## API Endpoints Used

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/transcribe` | Upload audio and transcribe |
| `POST` | `/api/v1/summarize` | Summarize a transcribed job |
| `POST` | `/api/v1/visualize` | Generate mind map visualization |
| `GET`  | `/api/v1/history` | List all past jobs |
| `GET`  | `/api/v1/job/{folder_name}` | Get details of a specific job |
| `GET`  | `/api/v1/download/{folder_name}/{file_type}` | Download an artifact |
| `GET`  | `/api/v1/health` | Backend health check |

API requests are managed by a centralized HTTP client with timeout, retry, and cancellation handling.

- Read endpoints send `Authorization: Bearer <token>`
- Some write/download endpoints additionally include `google_token` payload/query for backend compatibility

### Download file types

The `/api/v1/download/{folder_name}/{file_type}` endpoint accepts the following `file_type` values:

| `file_type` | Description |
|-------------|-------------|
| `transcript` | Plain-text transcription |
| `summary` | Plain-text summary |
| `mindmap_svg` | Mind-map SVG image |
| `mindmap_html` | Interactive mind-map HTML page |
