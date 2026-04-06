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
| `/login` | Google OAuth sign-in |
| `/` | Home — Audio pipeline (upload, transcribe, summarize, visualize) |
| `/history` | History — Past jobs with downloadable artifacts |
| `/settings` | Settings — LLM provider, API key, backend URL |

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

## Configuration

All settings are saved to `localStorage` automatically. Configure on the **Settings** page:

- **LLM Provider**: Ollama (local), OpenAI, Claude, Gemini, or Groq
- **Model**: Optional — uses provider default if not set
- **API Key**: Required for cloud providers
- **API Base URL**: URL of your backend (default: `http://localhost:8000`)

## API Endpoints Used

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/transcribe` | Upload audio and transcribe |
| `POST` | `/api/v1/summarize` | Summarize a transcribed job |
| `POST` | `/api/v1/visualize` | Generate mind map visualization |
| `GET`  | `/api/v1/history` | List all past jobs |
| `GET`  | `/api/v1/job/{folder}` | Get details of a specific job |
| `GET`  | `/api/v1/download/{folder}/{file}` | Download an artifact |

All API requests are authenticated via `?google_token=<token>` query parameter.
