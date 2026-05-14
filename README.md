# Record-App

A production-ready Vue 3 frontend for AI-powered audio workflow management.  
The application helps users record or upload audio, run transcription and summarization pipelines, review results, and manage historical jobs in a clean dashboard interface.

## Purpose

Record-App provides a user-friendly interface for turning raw audio into useful, structured outputs (transcripts, summaries, translations, and study tools) through a backend API.

## Core Functionality

- User authentication (email/password, API token, and Google sign-in paths)
- Audio input workflow (upload and in-browser recording)
- Processing pipeline:
  - Transcription
  - Summarization
  - Visualization
- Job history with detail views and downloadable artifacts
- Transcript editing with save support
- Translation workflow for generated artifacts
- AI-assisted flashcard generation and transcript chat
- Configurable LLM/provider settings from the UI

## Key Features

- **Modern frontend stack**: Vue 3, Vue Router, Vite, Tailwind CSS
- **Centralized API layer**: request handling, retries, caching, and GET de-duplication
- **Chunked upload support** for large files
- **Responsive UI** designed for desktop and mobile web usage
- **SEO assets included** (`public/robots.txt`, `public/sitemap.xml`)
- **Tested codebase** with Vitest unit/component tests

## Application Routes

| Route | Purpose |
|---|---|
| `/login` | Sign in |
| `/signup` | Create account |
| `/forgot-password` | Request password reset |
| `/reset-password` | Complete password reset |
| `/` | Home dashboard |
| `/pipeline` | Upload/record and process audio |
| `/history` | Job history list |
| `/history/:folderName` | Job details and actions |
| `/settings` | Provider, API, and account settings |

## Setup

### Prerequisites

- Node.js 18+ (recommended)
- npm 9+ (recommended)
- A running compatible backend API (local or remote)

### Install and run

```bash
npm install
npm run dev
```

### Build and test

```bash
npm test
npm run build
```

### Environment configuration

Copy `.env.example` to `.env` and set values as needed:

```env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
# Optional: set to use a remote backend directly
VITE_API_BASE_URL=https://your-backend.example.com
VITE_SITE_URL=https://your-frontend.example.com
```

If `VITE_API_BASE_URL` is empty/unset during development, the app uses the Vite proxy for `/api/*` requests.

## Usage Guide

1. Start the app with `npm run dev`.
2. Sign in (or use API token login).
3. Open **Pipeline** to upload or record audio.
4. Run transcription and follow-up processing.
5. Review outputs in **History** and **History Detail**.
6. Download artifacts, translate outputs, or generate flashcards/chat responses as needed.
7. Use **Settings** to choose provider, model, API key, and backend URL.

## Project Structure

```text
Record-App/
├── public/                 # Static assets (favicon, robots, sitemap)
├── src/
│   ├── assets/             # Global styles and static frontend assets
│   ├── components/         # Reusable Vue components
│   ├── config/             # Runtime environment/config helpers
│   ├── i18n/               # Localization messages and i18n setup
│   ├── router/             # Route definitions and navigation guards
│   ├── services/           # API client, auth, HTTP client, SEO helpers
│   ├── stores/             # Reactive app state store
│   ├── tests/              # Vitest test suite
│   ├── utils/              # Utility helpers
│   ├── views/              # Page-level Vue views
│   ├── App.vue             # Root application component
│   └── main.js             # Application entry point
├── .env.example            # Environment variable template
├── package.json            # Scripts and dependencies
├── tailwind.config.js      # Tailwind configuration
└── vite.config.js          # Vite configuration
```

## Backend Integration

This repository contains the frontend application only. It communicates with a separate FastAPI backend through `/api/v1/*` endpoints.

For local development:

- Run your backend on `http://localhost:8000`
- Keep `VITE_API_BASE_URL` unset so Vite proxies `/api/*` to the backend automatically

For remote environments:

- Set `VITE_API_BASE_URL` to your backend URL in `.env`
- Ensure the backend allows requests from your frontend origin

### API Endpoints Used by the Frontend

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/transcribe` | Upload audio and start transcription |
| `POST` | `/api/v1/upload/init` | Initialize chunked upload session |
| `POST` | `/api/v1/upload/chunk` | Upload chunk payload |
| `GET` | `/api/v1/upload/status/{upload_id}` | Check uploaded chunks |
| `POST` | `/api/v1/upload/complete` | Finalize chunked upload + transcribe |
| `POST` | `/api/v1/retranscribe` | Re-run transcription |
| `POST` | `/api/v1/summarize` | Generate summary |
| `POST` | `/api/v1/visualize` | Generate visualization |
| `GET` | `/api/v1/history` | List jobs |
| `GET` | `/api/v1/job/{folder_name}` | Fetch job details |
| `POST` | `/api/v1/history/delete` | Delete one or more jobs |
| `POST` | `/api/v1/translate` | Translate output files |
| `POST` | `/api/v1/transcript/save` | Save edited transcript data |
| `POST` | `/api/v1/flashcards` | Generate study flashcards |
| `POST` | `/api/v1/chat` | Ask questions about transcript content |

### Authentication and Downloads

- API requests include `Authorization: Bearer <token>` when authenticated.
- Some backend-compatible requests also include `google_token` in body/query values.
- Download URLs are generated via `/api/v1/download/{folder_name}/{file_type}` and support:
  - `audio`
  - `audio_denoised`
  - `summary_txt`
  - `summary_html`
  - `image`
  - `transcript_txt`
  - `transcript_json`
  - `flashcards_json`
  - `chatbot_json`
