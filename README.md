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

## Capacitor Mobile (Android + iOS)

This app now includes Capacitor configuration and native platform projects (`android/`, `ios/`).

### Installed mobile plugins

- `@capacitor/app` (lifecycle hooks)
- `@capacitor/network` (network quality/status detection)
- `@capacitor/preferences` (non-sensitive local metadata)
- `@capacitor/filesystem` (native temp chunk handling for recording)
- `@aparajita/capacitor-secure-storage` (secure auth token persistence)
- `@capacitor/app-launcher` (settings deep-link fallback)
- `@codetrix-studio/capacitor-google-auth` (native Google sign-in)

### Mobile workflow

```bash
npm run build
npm run cap:sync
npm run cap:open:android
npm run cap:open:ios
```

If platform folders do not exist yet:

```bash
npm run cap:add:android
npm run cap:add:ios
```

### Microphone permissions

- iOS: `NSMicrophoneUsageDescription` is defined in `/ios/App/App/Info.plist`.
- Android: `RECORD_AUDIO` is declared in `/android/app/src/main/AndroidManifest.xml`.
- The app only asks for microphone access when the user taps **Record**.
- Permission states are tracked in the UI (`unknown`, `granted`, `denied`, `permanently_denied`, `blocked`) with a settings fallback for permanently denied cases.

### Mobile performance and reliability notes

- Recording enforces guardrails: max 30 minutes and max 100 MB.
- Native recording chunks are persisted to temporary cache files to reduce memory pressure during long recordings.
- Chunk upload parallelism adapts by network type (faster on Wi-Fi, reduced on cellular).
- Upload session metadata is persisted so interrupted uploads can resume.
- App lifecycle hooks stop active recording on background and attempt recovery when app becomes active again.

### Platform pitfalls to validate

- iOS WebView media behavior can be stricter than desktop browsers.
- Android OEM power policies may interrupt long background operations.
- Very long recordings can still be device-dependent; test low-end Android devices.
- Ensure backend transport security policies are configured appropriately for mobile environments.

### Remote / production backend

Set `VITE_API_BASE_URL` in a `.env` file (copy from `.env.example`) and the frontend will send API requests directly to that URL:

```env
VITE_API_BASE_URL=https://your-backend.example.com
```

When `VITE_API_BASE_URL` is set, the Vite proxy target is also updated so the dev server forwards requests to the same host.

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

All API requests are authenticated via `?google_token=<token>` query parameter.

### Download file types

The `/api/v1/download/{folder_name}/{file_type}` endpoint accepts the following `file_type` values:

| `file_type` | Description |
|-------------|-------------|
| `transcript` | Plain-text transcription |
| `summary` | Plain-text summary |
| `mindmap_svg` | Mind-map SVG image |
| `mindmap_html` | Interactive mind-map HTML page |
