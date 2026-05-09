"""
main.py - Audio Processing API

Supports three authentication methods, all of which pass their token as the
`google_token` parameter (body field or query param) that existing API
endpoints already expect:

  1. Google OAuth  - frontend stores a Google ID token
  2. Email / password (basic)  - frontend stores a signed JWT issued here
  3. Personal API token  - a static token pre-configured via the API_TOKENS
                           environment variable; intended for personal /
                           self-hosted usage without a full account
"""

import os
import time
import json
import hmac
import uuid
import shutil
import traceback
import contextlib
import datetime
import logging
import ffmpeg
from dotenv import load_dotenv
from filelock import FileLock, Timeout
from typing import Optional, Dict, Any, List, Literal

import re
import urllib.request
import urllib.error
import hashlib

from fastapi import BackgroundTasks, FastAPI, UploadFile, File, Form, HTTPException, Header, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field, field_validator

import auth

# =========================================================
# CONFIGURATION
# =========================================================
load_dotenv()

GOOGLE_CLIENT_ID: Optional[str] = os.getenv("GOOGLE_CLIENT_ID")
BASE_DIR = "Data"
SPEECH_BAND_LOW_HZ = 80
SPEECH_BAND_HIGH_HZ = 7800
NOISE_FLOOR_DB = -25

# Chunked-upload constants
_UPLOADS_SUBDIR = "_uploads"      # staging folder inside user data root
_MAX_UPLOAD_CHUNKS = 10_000       # safety cap on number of chunks per session

# ── Webhook ─────────────────────────────────────────────────────────────────
# Optional HMAC secret for signing outbound webhook payloads.
# Set WEBHOOK_SECRET in .env to enable the X-RecordNote-Signature header.
_WEBHOOK_SECRET: Optional[str] = os.getenv("WEBHOOK_SECRET")

# ── Processing-time estimate rates ──────────────────────────────────────────
# Values are expressed as "compute seconds per audio-minute" unless otherwise
# noted.  They represent conservative CPU-class baselines and can be tuned by
# overriding the corresponding ESTIMATE_* environment variables.
_ESTIMATE_RATES: Dict[str, float] = {
    # Transcription (faster-whisper, CPU, incl. diarization)
    "transcribe_sec_per_audio_min": float(os.getenv("ESTIMATE_TRANSCRIBE_RATE", "90")),
    "transcribe_min_sec":           float(os.getenv("ESTIMATE_TRANSCRIBE_MIN",  "10")),
    # Noise-reduction pass (ffmpeg afftdn – fast)
    "denoise_sec_per_audio_min":    float(os.getenv("ESTIMATE_DENOISE_RATE",    "3")),
    # Summarization – local (ollama) vs. cloud provider
    "summarize_ollama_sec_per_audio_min": float(os.getenv("ESTIMATE_SUMMARIZE_OLLAMA_RATE", "30")),
    "summarize_cloud_sec_per_audio_min":  float(os.getenv("ESTIMATE_SUMMARIZE_CLOUD_RATE",  "10")),
    "summarize_min_sec":                  float(os.getenv("ESTIMATE_SUMMARIZE_MIN",          "5")),
    # Visualization (matplotlib timeline – fast, mostly I/O-bound)
    "visualize_fixed_sec":          float(os.getenv("ESTIMATE_VISUALIZE_FIXED", "5")),
    "visualize_sec_per_audio_min":  float(os.getenv("ESTIMATE_VISUALIZE_RATE",  "1")),
    # Translation (CTranslate2 NLLB)
    "translate_sec_per_audio_min":  float(os.getenv("ESTIMATE_TRANSLATE_RATE",  "15")),
    "translate_min_sec":            float(os.getenv("ESTIMATE_TRANSLATE_MIN",    "3")),
}

_CLOUD_PROVIDERS = {"openai", "anthropic", "groq", "google", "gemini"}
logger = logging.getLogger(__name__)

_COMMON_HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
_DEFAULT_DEV_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Files produced per job folder:
#   <base>.wav
#   <base>.json
#   <base>.txt
#   <base>.png
#   <base>_final_summary.txt
#   <base>_final_summary.html
#   manifest.json

def _parse_api_tokens(env_val: Optional[str]) -> Dict[str, str]:
    """
    Parse the API_TOKENS environment variable into a {token: user_id} mapping.
    """
    if not env_val:
        return {}
    result: Dict[str, str] = {}
    for entry in env_val.split(","):
        entry = entry.strip()
        if not entry:
            continue
        if ":" in entry:
            token_part, _, uid_part = entry.partition(":")
            token_part = token_part.strip()
            uid_part = uid_part.strip()
        else:
            token_part = entry
            uid_part = ""
        if token_part:
            result[token_part] = uid_part or "api_user"
    return result

_API_TOKEN_MAP: Dict[str, str] = _parse_api_tokens(os.getenv("API_TOKENS"))

# =========================================================
# APPLICATION
# =========================================================
@contextlib.asynccontextmanager
async def _lifespan(application: FastAPI):
    """Startup and shutdown logic using the modern lifespan API."""
    import warnings

    auth.init_db()
    if not GOOGLE_CLIENT_ID:
        warnings.warn(
            "VITE_GOOGLE_CLIENT_ID / GOOGLE_CLIENT_ID is not set. "
            "Google Sign-In will be unavailable.",
            stacklevel=1,
        )
    if _API_TOKEN_MAP:
        print(
            f"[INFO] {len(_API_TOKEN_MAP)} static API token(s) configured.",
            flush=True,
        )
    yield

app = FastAPI(
    title="Audio Processing API",
    description=(
        "Modular API for transcribing, summarizing, and visualizing audio. "
        "Supports Google OAuth, email/password, and static API token authentication."
    ),
    lifespan=_lifespan,
)


def _parse_bool_env(var_name: str, default: bool) -> bool:
    """Parse a boolean environment variable with a safe default."""
    raw = os.getenv(var_name)
    if raw is None:
        return default
    value = raw.strip().lower()
    if value in {"1", "true", "yes", "on"}:
        return True
    if value in {"0", "false", "no", "off"}:
        return False
    raise ValueError(f"{var_name} must be a boolean value.")


def _parse_csv_env(var_name: str, default: List[str]) -> List[str]:
    """Parse comma-separated env values and trim whitespace."""
    raw = os.getenv(var_name)
    if raw is None or not raw.strip():
        return list(default)
    parsed = [item.strip() for item in raw.split(",") if item.strip()]
    if not parsed:
        raise ValueError(f"{var_name} must contain at least one non-empty value.")
    return parsed


def _build_cors_config() -> Dict[str, Any]:
    """
    Build CORS middleware settings from environment variables.

    This keeps CORS strict by default in production and convenient in
    development.  In production, wildcard origins are explicitly rejected.
    """
    # APP_ENV takes precedence over ENVIRONMENT when both are present.
    app_env = (os.getenv("APP_ENV") or os.getenv("ENVIRONMENT") or "development").strip().lower()
    is_production = app_env in {"production", "prod"}

    try:
        default_origins = [] if is_production else _DEFAULT_DEV_CORS_ORIGINS
        origins = _parse_csv_env("CORS_ALLOW_ORIGINS", default_origins)
        allow_credentials = _parse_bool_env("CORS_ALLOW_CREDENTIALS", True)
        allow_methods = _parse_csv_env("CORS_ALLOW_METHODS", _COMMON_HTTP_METHODS)
        allow_headers = _parse_csv_env(
            "CORS_ALLOW_HEADERS",
            ["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
        )
        expose_headers = _parse_csv_env("CORS_EXPOSE_HEADERS", [])
        max_age = int(os.getenv("CORS_MAX_AGE", "600"))
        if max_age < 0:
            raise ValueError("CORS_MAX_AGE must be >= 0.")

        # OPTIONS is required for browser preflight checks.
        if not any(method.upper() == "OPTIONS" for method in allow_methods):
            allow_methods.append("OPTIONS")

        # Prevent insecure/invalid credential + wildcard configuration.
        if "*" in origins:
            if is_production:
                raise ValueError("CORS_ALLOW_ORIGINS cannot include '*' in production.")
            if allow_credentials:
                raise ValueError(
                    "CORS_ALLOW_ORIGINS='*' cannot be used when CORS_ALLOW_CREDENTIALS=true."
                )

        if not origins:
            logger.warning(
                "CORS is enabled with no allowed origins; browser cross-origin requests will be blocked."
            )

        return {
            "allow_origins": origins,
            "allow_credentials": allow_credentials,
            "allow_methods": allow_methods,
            "allow_headers": allow_headers,
            "expose_headers": expose_headers,
            "max_age": max_age,
        }
    except Exception as exc:
        # In production we fail fast to avoid silently running with unsafe CORS.
        if is_production:
            raise RuntimeError(f"Invalid production CORS configuration: {exc}") from exc

        logger.warning(
            "Invalid CORS configuration (%s). Falling back to safe development defaults.",
            exc,
        )
        return {
            "allow_origins": _DEFAULT_DEV_CORS_ORIGINS,
            "allow_credentials": True,
            "allow_methods": _COMMON_HTTP_METHODS,
            "allow_headers": ["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
            "expose_headers": [],
            "max_age": 600,
        }


app.add_middleware(
    CORSMiddleware,
    **_build_cors_config(),
)

@app.middleware("http")
async def add_api_security_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
    return response


# =========================================================
# SHARED AUTH HELPER
# =========================================================
def _check_api_token(token: str) -> Optional[str]:
    """
    Return the configured user_id when *token* matches one of the static API
    tokens, otherwise return None.

    Uses ``hmac.compare_digest`` for all comparisons to avoid leaking
    information via timing side-channels.
    """
    for configured_token, user_id in _API_TOKEN_MAP.items():
        if hmac.compare_digest(token, configured_token):
            return user_id
    return None


def _resolve_user(token: str) -> str:
    """
    Resolve and sanitize a user_id from one of three token types:

      1. Static API token (configured via API_TOKENS env var)
      2. Basic-auth JWT issued by this service
      3. Google OAuth ID token

    The returned value is safe to use as a filesystem path component.
    Raises HTTPException 401 if none of the three paths succeeds.
    """
    # --- 1. Static API token (personal usage) ---
    api_user_id = _check_api_token(token)
    if api_user_id is not None:
        safe_id = os.path.basename(api_user_id.strip())
        if not safe_id:
            raise HTTPException(
                status_code=500,
                detail="Invalid API token user_id configuration.",
            )
        return safe_id

    # --- 2 & 3. Basic JWT / Google OAuth ---
    try:
        raw_id = auth.resolve_user_id(token, google_client_id=GOOGLE_CLIENT_ID)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    # os.path.basename strips any directory separators from the user_id so the
    # value cannot escape its intended directory even if a malformed token
    # somehow carried a path payload.
    safe_id = os.path.basename(raw_id.strip())
    if not safe_id:
        raise HTTPException(status_code=401, detail="Invalid user identity.")
    return safe_id


def _resolve_user_from_auth(
    google_token: Optional[str] = None,
    authorization: Optional[str] = None,
) -> str:
    """Resolve user identity using Bearer auth first, then google_token fallback."""
    bearer_token = ""
    if authorization and authorization.startswith("Bearer "):
        bearer_token = authorization[7:].strip()
    token = bearer_token or (google_token or "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return _resolve_user(token)


# =========================================================
# PATH HELPERS
# =========================================================

def _safe_join(base: str, *paths: str) -> str:
    """Prevent path traversal: final path must stay inside 'base'."""
    base_abs = os.path.abspath(base)
    final = os.path.abspath(os.path.join(base_abs, *paths))
    if final == base_abs:
        return final
    if not final.startswith(base_abs + os.sep):
        raise HTTPException(status_code=400, detail="Invalid path.")
    return final


def _sanitize_name(value: str, label: str = "name") -> str:
    """
    Sanitize a single path component.

    Uses os.path.basename (a CodeQL-recognised path sanitizer) as the core
    operation, then rejects null bytes and empty results.  The caller must
    never concatenate the returned value with os.path.join directly – always
    pass it through _safe_join for the second layer of defence.
    """
    if "\0" in value:
        raise HTTPException(status_code=400, detail=f"Invalid {label}.")
    clean = os.path.basename(value.strip())
    if not clean:
        raise HTTPException(status_code=400, detail=f"Invalid {label}.")
    return clean


def _safe_file_suffix(raw_filename: Optional[str]) -> str:
    """
    Extract and sanitize the file extension from an uploaded filename.

    Strips the leading dot, keeps only alphanumeric characters, and limits
    the result to 8 characters to prevent crafted extensions from being used
    as path components or carrying injection payloads.
    Returns the suffix with its leading dot (e.g. '.mp3'), defaulting to '.audio'.
    """
    suffix = os.path.splitext(raw_filename or "")[1]
    safe = "".join(c for c in suffix.lstrip(".") if c.isalnum())[:8]
    return f".{safe}" if safe else ".audio"


def _now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _detect_job_language(job_dir: str, file_name: str) -> str:
    """
    Return the full name of the dominant spoken language for a transcribed job
    (e.g. ``"Indonesian"``).  Reads ``<file_name>.json`` from *job_dir* and
    delegates to :func:`detect_dominant_language`.  Falls back to
    ``"Indonesian"`` when the JSON is absent or contains no language metadata.
    """
    json_path = _safe_join(job_dir, f"{file_name}.json")
    if os.path.exists(json_path):
        language, _ = detect_dominant_language(json_path)
        if language:
            return language
    return "Indonesian"


def _language_token(value: str) -> str:
    """
    Normalize language labels (name or code) to filesystem-safe lowercase tokens.
    """
    cleaned = "".join(c.lower() if c.isalnum() else "_" for c in value.strip())
    token = "_".join(part for part in cleaned.split("_") if part)
    if not token:
        raise HTTPException(status_code=400, detail="Invalid language value.")
    return token[:40]


def _try_apply_noise_reduction(input_wav: str, output_wav: str) -> bool:
    """
    Apply lightweight speech-focused denoising before transcription.
    input_wav: source WAV path.
    output_wav: destination path for denoised WAV.
    Filters:
      - highpass at SPEECH_BAND_LOW_HZ
      - lowpass at SPEECH_BAND_HIGH_HZ
      - afftdn with NOISE_FLOOR_DB
    Returns True on success and False when falling back to the original file.
    """
    try:
        # Keep the speech band and reduce stationary noise
        # efficiently for long files before the diarization/transcription step.
        (
            ffmpeg
            .input(input_wav)
            .output(
                output_wav,
                ac=1,
                ar=16000,
                af=(
                    f"highpass=f={SPEECH_BAND_LOW_HZ},"
                    f"lowpass=f={SPEECH_BAND_HIGH_HZ},"
                    f"afftdn=nf={NOISE_FLOOR_DB}"
                ),
            )
            .run(overwrite_output=True, quiet=True)
        )
        return True
    except Exception:
        traceback.print_exc()
        return False


# =========================================================
# MANIFEST (job metadata) helpers
# =========================================================

def _manifest_path(job_dir: str) -> str:
    return os.path.join(job_dir, "manifest.json")


def _read_manifest(job_dir: str) -> Dict[str, Any]:
    p = _manifest_path(job_dir)
    if not os.path.exists(p):
        raise HTTPException(status_code=404, detail="Manifest not found.")
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_manifest(job_dir: str, manifest: Dict[str, Any]) -> None:
    with open(_manifest_path(job_dir), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)


# =========================================================
# CHUNKED-UPLOAD STATE HELPERS
# =========================================================

def _upload_dir(user_id: str, upload_id: str) -> str:
    """Return the staging directory for a chunked upload session."""
    safe_uid = _sanitize_name(upload_id, "upload_id")
    return _safe_join(BASE_DIR, user_id, _UPLOADS_SUBDIR, safe_uid)

def _read_upload_state(upload_directory: str) -> Dict[str, Any]:
    p = os.path.join(upload_directory, "upload_state.json")
    lock_path = os.path.join(upload_directory, "upload_state.lock")
    
    if not os.path.exists(p):
        raise HTTPException(status_code=404, detail="Upload session not found.")
    
    try:
        with FileLock(lock_path, timeout=10):
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Upload state corrupted.")
    except Timeout:
        raise HTTPException(status_code=503, detail="Server busy handling upload chunks. Try again.")

def _write_upload_state(upload_directory: str, state: Dict[str, Any]) -> None:
    p = os.path.join(upload_directory, "upload_state.json")
    lock_path = os.path.join(upload_directory, "upload_state.lock")
    
    try:
        with FileLock(lock_path, timeout=10):
            with open(p, "w", encoding="utf-8") as f:
                json.dump(state, f, ensure_ascii=False, indent=2)
    except Timeout:
        raise HTTPException(status_code=503, detail="Server busy handling upload chunks. Try again.")


# =========================================================
# PROCESSING-TIME ESTIMATE HELPERS
# =========================================================

def _format_duration(seconds: float) -> str:
    """Return a human-readable duration string, e.g. '~2 min 30 sec'."""
    seconds = max(0.0, seconds)
    if seconds < 60:
        return f"~{int(seconds)} sec"
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    if secs == 0:
        return f"~{minutes} min"
    return f"~{minutes} min {secs} sec"


def _estimate_step_seconds(
    step: str,
    audio_duration_min: float,
    provider: str = "ollama",
) -> float:
    """
    Return an estimated processing time in seconds for a single pipeline step.

    Parameters
    ----------
    step : str
        One of ``transcribe``, ``summarize``, ``visualize``, ``translate``.
    audio_duration_min : float
        Duration of the audio file in minutes.
    provider : str
        LLM provider name; affects the summarize estimate.
    """
    r = _ESTIMATE_RATES
    if step == "transcribe":
        raw = r["transcribe_sec_per_audio_min"] * audio_duration_min
        raw += r["denoise_sec_per_audio_min"] * audio_duration_min
        return max(r["transcribe_min_sec"], raw)
    if step == "summarize":
        rate_key = (
            "summarize_cloud_sec_per_audio_min"
            if provider.lower() in _CLOUD_PROVIDERS
            else "summarize_ollama_sec_per_audio_min"
        )
        raw = r[rate_key] * audio_duration_min
        return max(r["summarize_min_sec"], raw)
    if step == "visualize":
        return r["visualize_fixed_sec"] + r["visualize_sec_per_audio_min"] * audio_duration_min
    if step == "translate":
        raw = r["translate_sec_per_audio_min"] * audio_duration_min
        return max(r["translate_min_sec"], raw)
    return 0.0


# =========================================================
# WEBHOOK HELPER
# =========================================================

def _fire_webhook(url: str, payload: Dict[str, Any]) -> None:
    """
    POST *payload* as JSON to *url*.

    This is a best-effort, fire-and-forget call.  Errors are logged to stdout
    but never propagated to the caller.  When WEBHOOK_SECRET is set the
    request includes an ``X-RecordNote-Signature: sha256=<hex>`` header so
    consumers can verify authenticity.
    """
    try:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers: Dict[str, str] = {
            "Content-Type": "application/json",
            "User-Agent": "RecordNote-Webhook/1.0",
        }
        if _WEBHOOK_SECRET:
            sig = hmac.new(
                _WEBHOOK_SECRET.encode("utf-8"), body, hashlib.sha256
            ).hexdigest()
            headers["X-RecordNote-Signature"] = f"sha256={sig}"
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10):
            pass
    except Exception:
        traceback.print_exc()
        print(f"[WEBHOOK] WARNING: failed to deliver webhook to {url}", flush=True)


def _escape_html(text: str) -> str:
    """Minimal HTML escaping for user-controlled content embedded in HTML."""
    return (
        text
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#x27;")
    )


def _summary_to_html(title: str, summary_text: str) -> str:
    escaped_title = _escape_html(title)
    escaped_body = _escape_html(summary_text).replace("\n", "<br>")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{escaped_title}</title>
  <style>
    body {{font-family: system-ui, sans-serif; background: #f8fafc; margin: 0; padding: 2rem;}}
    .wrap {{max-width: 720px; margin: auto;}}
    .card {{background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 2rem;}}
    .badge {{display:inline-block; background:#eef2ff; color:#4338ca;
             font-size:.75rem; font-weight:700; padding:.25rem .75rem;
             border-radius:9999px; margin-bottom:1rem;}}
    h1 {{font-size:1.5rem; margin:.5rem 0;}}
    .meta {{color:#64748b; font-size:.875rem; margin-bottom:1.5rem;}}
    .summary {{line-height:1.75; color:#334155;}}
    .footer {{margin-top:2rem; color:#94a3b8; font-size:.8rem;}}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="badge">Final Summary</div>
      <h1>{escaped_title}</h1>
      <div class="meta">Generated by Audio Processing Pipeline</div>
      <div class="summary">{escaped_body}</div>
      <div class="footer">Tip: Save/share this HTML file as a report.</div>
    </div>
  </div>
</body>
</html>"""


# =========================================================
# REQUEST MODELS
# =========================================================

class SummarizeRequest(BaseModel):
    google_token: str
    folder_name: str
    file_name: str
    provider: str = "ollama"
    model: Optional[str] = None
    api_key: Optional[str] = None


class VisualizeRequest(BaseModel):
    google_token: str
    folder_name: str
    file_name: str


class TranslateRequest(BaseModel):
    google_token: str
    folder_name: str
    file_name: str
    source_language: str
    target_language: str
    ct2_model: Optional[str] = None
    files: Optional[List[Literal["json", "txt", "summary_txt"]]] = None


class SaveTranscriptRequest(BaseModel):
    google_token: str
    folder_name: str
    file_name: str
    transcript_data: List[Dict[str, Any]] = Field(default_factory=list)


class DeleteJobsRequest(BaseModel):
    google_token: str
    folder_names: List[str]


class RetranscribeRequest(BaseModel):
    google_token: str
    folder_name: str
    file_name: str
    transcribe_lang: Optional[str] = None


class ChunkedUploadInitRequest(BaseModel):
    google_token: str
    filename: str
    total_chunks: int
    file_size: Optional[int] = None
    transcribe_lang: Optional[str] = None


class ChunkedUploadCompleteRequest(BaseModel):
    google_token: str
    upload_id: str
    transcribe_lang: Optional[str] = None
    webhook_url: Optional[str] = None


# ---- auth request models --------------------------------

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name must not be empty.")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v


class RefreshRequest(BaseModel):
    refresh_token: str


class FlashcardsRequest(BaseModel):
    google_token: str
    folder_name: str
    file_name: str
    provider: str = "ollama"
    model: Optional[str] = None
    api_key: Optional[str] = None
    count: int = Field(default=10, ge=1, le=100)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    google_token: str
    folder_name: str
    file_name: str
    question: str = Field(min_length=1)
    provider: str = "ollama"
    model: Optional[str] = None
    api_key: Optional[str] = None
    history: Optional[List[ChatMessage]] = None


# =========================================================
# API: HEALTH
# =========================================================

@app.get("/api/v1/health")
async def health():
    return {"status": "ok"}


# =========================================================
# API: PROCESSING-TIME ESTIMATE
# =========================================================

_ALL_STEPS = ["transcribe", "summarize", "visualize", "translate"]


@app.get("/api/v1/estimate")
async def estimate_processing(
    audio_duration_seconds: float,
    google_token: Optional[str] = None,
    steps: str = "transcribe,summarize,visualize,translate",
    provider: str = "ollama",
    authorization: Optional[str] = Header(None),
):
    """
    Return estimated processing times for one or more pipeline steps.

    Query parameters
    ----------------
    audio_duration_seconds : float
        Duration of the audio file in seconds.
    steps : str
        Comma-separated list of steps to estimate.
        Allowed values: ``transcribe``, ``summarize``, ``visualize``,
        ``translate``.  Defaults to all four steps.
    provider : str
        LLM provider name used to tune the summarize estimate.
        ``ollama`` and ``llama_cpp`` (default group) assume a local model; any
        cloud provider name (``openai``, ``anthropic``, ``groq``, ``google``,
        ``gemini``) uses the faster cloud rate.

    Response
    --------
    A JSON object with per-step and total estimates:

    .. code-block:: json

        {
          "audio_duration_seconds": 120.0,
          "steps": {
            "transcribe": { "estimate_seconds": 186.0, "estimate_human": "~3 min 6 sec" },
            "summarize":  { "estimate_seconds": 65.0,  "estimate_human": "~1 min 5 sec" },
            ...
          },
          "total_estimate_seconds": 261.0,
          "total_estimate_human": "~4 min 21 sec"
        }
    """
    _resolve_user_from_auth(google_token=google_token, authorization=authorization)

    if audio_duration_seconds <= 0:
        raise HTTPException(status_code=400, detail="audio_duration_seconds must be positive.")

    requested = [s.strip().lower() for s in steps.split(",") if s.strip()]
    invalid = [s for s in requested if s not in _ALL_STEPS]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown step(s): {invalid}. Allowed: {_ALL_STEPS}",
        )
    if not requested:
        raise HTTPException(status_code=400, detail="steps must not be empty.")

    audio_duration_min = audio_duration_seconds / 60.0
    step_estimates: Dict[str, Any] = {}
    total_seconds = 0.0

    for step in requested:
        est = _estimate_step_seconds(step, audio_duration_min, provider)
        step_estimates[step] = {
            "estimate_seconds": round(est, 1),
            "estimate_human": _format_duration(est),
        }
        total_seconds += est

    return JSONResponse(
        status_code=200,
        content={
            "audio_duration_seconds": audio_duration_seconds,
            "provider": provider,
            "steps": step_estimates,
            "total_estimate_seconds": round(total_seconds, 1),
            "total_estimate_human": _format_duration(total_seconds),
        },
    )


# =========================================================
# API: AUTH – REGISTER
# =========================================================

@app.post("/api/v1/auth/register", status_code=201)
async def register(req: RegisterRequest):
    """
    Create a new account.  Returns a JWT access token and a long-lived refresh
    token so the user is immediately logged in after registration.
    """
    user = auth.create_user(req.name, str(req.email), req.password)
    token = auth.create_access_token(user["id"])
    refresh_token = auth.create_refresh_token(user["id"])
    return JSONResponse(
        status_code=201,
        content={
            "token": token,
            "refresh_token": refresh_token,
            "expires_in": auth.JWT_EXPIRES_SECONDS,
            "user": {
                "name": user["name"],
                "email": user["email"],
                "picture": "",
            },
        },
    )


# =========================================================
# API: AUTH – LOGIN
# =========================================================

@app.post("/api/v1/auth/login")
async def login(req: LoginRequest):
    """
    Authenticate with email + password.  Returns a JWT access token and a
    long-lived refresh token.
    Uses a generic error message to avoid leaking whether the email exists.
    """
    user = auth.get_user_by_email(str(req.email))
    if not user or not auth.verify_password(req.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    token = auth.create_access_token(user["id"])
    refresh_token = auth.create_refresh_token(user["id"])
    return JSONResponse(
        status_code=200,
        content={
            "token": token,
            "refresh_token": refresh_token,
            "expires_in": auth.JWT_EXPIRES_SECONDS,
            "user": {
                "name": user["name"],
                "email": user["email"],
                "picture": "",
            },
        },
    )


# =========================================================
# API: AUTH – REFRESH TOKEN
# =========================================================

@app.post("/api/v1/auth/refresh")
async def refresh_token(req: RefreshRequest):
    """
    Exchange a valid refresh token for a new access token + refresh token pair.
    The old refresh token is invalidated (token rotation) to limit replay risk.
    """
    new_access, new_refresh = auth.rotate_refresh_token(req.refresh_token)
    return JSONResponse(
        status_code=200,
        content={
            "token": new_access,
            "refresh_token": new_refresh,
            "expires_in": auth.JWT_EXPIRES_SECONDS,
        },
    )


# =========================================================
# API: AUTH – FORGOT PASSWORD
# =========================================================

@app.post("/api/v1/auth/forgot-password", status_code=200)
async def forgot_password(req: ForgotPasswordRequest):
    """
    Request a password-reset link.
    Always returns 200 to prevent email enumeration.
    """
    user = auth.get_user_by_email(str(req.email))
    if user:
        reset_token = auth.create_reset_token(user["id"])
        auth.send_reset_email(str(req.email), reset_token)
    return JSONResponse(
        status_code=200,
        content={"message": "If that email is registered, a reset link has been sent."},
    )


# =========================================================
# API: AUTH – RESET PASSWORD
# =========================================================

@app.post("/api/v1/auth/reset-password", status_code=200)
async def reset_password(req: ResetPasswordRequest):
    """
    Complete a password reset using the token from the reset email.
    The token is consumed (one-time use).
    """
    user_id = auth.consume_reset_token(req.token)
    auth.update_password(user_id, req.new_password)
    return JSONResponse(
        status_code=200,
        content={"message": "Password updated successfully."},
    )


# =========================================================
# API: AUTH – CHANGE PASSWORD
# =========================================================

@app.post("/api/v1/auth/change-password", status_code=200)
async def change_password(
    req: ChangePasswordRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Change password for an authenticated basic-auth user.
    Requires 'Authorization: Bearer <token>' header.
    Google OAuth and API-token users cannot use this endpoint.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")

    bearer_token = authorization[7:]
    user_id = auth.verify_basic_token(bearer_token)

    user = auth.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Re-fetch with hashed_password for verification
    user_full = auth.get_user_by_email(user["email"])
    if not user_full or not auth.verify_password(req.current_password, user_full["hashed_password"]):
        raise HTTPException(status_code=403, detail="Current password is incorrect.")

    auth.update_password(user_id, req.new_password)
    return JSONResponse(status_code=200, content={"message": "Password changed successfully."})


# =========================================================
# API: TRANSCRIBE
# =========================================================

from tools import json_to_txt, extract_records, generate_timeline, load_transcript_vizualize
from utils import (
    diarize_and_transcribe,
    load_transcript,
    make_provider,
    summarize_pipeline,
    save_results,
    translate_json_transcript,
    translate_plain_text_file,
    get_translator,
    build_timestamped_context,
    generate_flashcards,
    chat_with_transcript,
    detect_dominant_language,
)
from utils.translate import resolve_flores200


@app.post("/api/v1/transcribe")
async def transcribe_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    google_token: str = Form(...),
    transcribe_lang: str = Form(None),
    webhook_url: Optional[str] = Form(None),
):
    """
    Creates a new job folder: Data/<user_id>/<safe_name>_<timestamp>/
    Produces <base>.wav, <base>.json, <base>.txt and manifest.json.

    If ``webhook_url`` is provided the server fires a POST request to that URL
    once transcription is complete (see webhook payload documentation).
    """
    try:
        user_id = _resolve_user(google_token)

        # Build a filesystem-safe base name and unique folder name
        original_stem = os.path.splitext(file.filename or "recording")[0]
        safe_stem = (
            "".join(c if c.isalnum() or c in "-_" else "_" for c in original_stem)
            .strip("_")
            or "recording"
        )
        folder_name = f"{safe_stem}_{int(time.time())}"

        job_dir = _safe_join(BASE_DIR, user_id, folder_name)
        os.makedirs(job_dir, exist_ok=True)

        # Save uploaded file
        orig_suffix = _safe_file_suffix(file.filename)
        tmp_path = _safe_join(job_dir, f"_upload{orig_suffix}")
        with open(tmp_path, "wb") as f_out:
            shutil.copyfileobj(file.file, f_out)

        # Convert to 16 kHz mono WAV
        t_convert = time.monotonic()
        wav_name = f"{safe_stem}.wav"
        wav_path = _safe_join(job_dir, wav_name)
        ffmpeg.input(tmp_path).output(wav_path, ac=1, ar=16000).run(
            overwrite_output=True, quiet=True
        )
        os.remove(tmp_path)

        denoised_wav_name = f"{safe_stem}_denoised.wav"
        denoised_wav_path = _safe_join(job_dir, denoised_wav_name)
        noise_reduction_applied = _try_apply_noise_reduction(wav_path, denoised_wav_path)
        audio_for_transcription = denoised_wav_path if noise_reduction_applied else wav_path
        convert_seconds = round(time.monotonic() - t_convert, 2)

        json_name = _safe_join(job_dir, f"{safe_stem}.json")
        txt_name = _safe_join(job_dir, f"{safe_stem}.txt")

        # Transcribe + diarize
        print(f"\n[INFO] Transcribing {safe_stem}...")
        t_transcribe = time.monotonic()
        diarize_and_transcribe(audio_for_transcription, json_name, lang=transcribe_lang)
        json_to_txt(json_name, txt_name)
        transcribe_seconds = round(time.monotonic() - t_transcribe, 2)

        elapsed: Dict[str, float] = {
            "convert_seconds": convert_seconds,
            "transcribe_seconds": transcribe_seconds,
        }

        manifest: Dict[str, Any] = {
            "folder_name": folder_name,
            "file_name": safe_stem,
            "user_id": user_id,
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
            "status": {
                "transcribe": "done",
                "summarize": "pending",
                "visualize": "pending",
                "translate": "pending",
            },
            "files": {
                "audio": wav_name,
                "audio_denoised": denoised_wav_name if noise_reduction_applied else None,
                "transcript_txt": os.path.basename(txt_name),
                "transcript_json": os.path.basename(json_name),
            },
            "audio_processing": {
                "noise_reduction_applied": noise_reduction_applied,
                "transcription_source": os.path.basename(audio_for_transcription),
            },
            "elapsed": elapsed,
        }
        _write_manifest(job_dir, manifest)

        if webhook_url:
            background_tasks.add_task(
                _fire_webhook,
                webhook_url,
                {
                    "event": "transcribe_complete",
                    "folder_name": folder_name,
                    "file_name": safe_stem,
                    "elapsed": elapsed,
                    "manifest": manifest,
                },
            )

        return JSONResponse(
            status_code=200,
            content={
                "message": "Transcription complete",
                "folder_name": folder_name,
                "file_name": safe_stem,
                "elapsed": elapsed,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# API: RE-TRANSCRIBE EXISTING JOB
# =========================================================

@app.post("/api/v1/retranscribe")
async def retranscribe_audio(req: RetranscribeRequest):
    """
    Re-runs transcription on an existing job using its already-converted WAV
    file.  Overwrites <base>.json and <base>.txt, resets the summarize and
    visualize manifest statuses to 'pending', and returns the new transcript.
    """
    try:
        user_id = _resolve_user(req.google_token)
        folder_name = _sanitize_name(req.folder_name, "folder_name")
        file_name = _sanitize_name(req.file_name, "file_name")

        job_dir = _safe_join(BASE_DIR, user_id, folder_name)
        manifest = _read_manifest(job_dir)

        # Determine which audio file to use (prefer denoised if it exists)
        audio_proc = manifest.get("audio_processing", {})
        noise_applied = audio_proc.get("noise_reduction_applied", False)
        denoised_name = manifest.get("files", {}).get("audio_denoised")
        wav_name = manifest.get("files", {}).get("audio", f"{file_name}.wav")

        if noise_applied and denoised_name:
            audio_path = _safe_join(job_dir, denoised_name)
            if not os.path.exists(audio_path):
                audio_path = _safe_join(job_dir, wav_name)
        else:
            audio_path = _safe_join(job_dir, wav_name)

        if not os.path.exists(audio_path):
            raise HTTPException(
                status_code=404,
                detail="Audio file not found. Cannot re-transcribe.",
            )

        json_path = _safe_join(job_dir, f"{file_name}.json")
        txt_path = _safe_join(job_dir, f"{file_name}.txt")

        # Back up existing transcript files so originals can be restored on failure
        json_backup = json_path + ".bak"
        txt_backup = txt_path + ".bak"
        if os.path.exists(json_path):
            shutil.copy2(json_path, json_backup)
        if os.path.exists(txt_path):
            shutil.copy2(txt_path, txt_backup)

        try:
            print(f"\n[INFO] Re-transcribing {file_name}...")
            t_start = time.monotonic()
            diarize_and_transcribe(audio_path, json_path, lang=req.transcribe_lang)
            json_to_txt(json_path, txt_path)
            elapsed_sec = round(time.monotonic() - t_start, 2)
        except Exception:
            # Restore backups so the job folder is not left in a corrupt state
            if os.path.exists(json_backup):
                shutil.move(json_backup, json_path)
            if os.path.exists(txt_backup):
                shutil.move(txt_backup, txt_path)
            raise
        finally:
            # Clean up backup files on success (errors re-raise, so this always runs)
            for bak in (json_backup, txt_backup):
                with contextlib.suppress(FileNotFoundError):
                    os.remove(bak)

        with open(txt_path, "r", encoding="utf-8") as fh:
            transcript_text = fh.read()

        manifest["status"]["transcribe"] = "done"
        manifest["status"]["summarize"] = "pending"
        manifest["status"]["visualize"] = "pending"
        manifest["updated_at"] = _now_iso()
        manifest.setdefault("elapsed", {})["retranscribe_seconds"] = elapsed_sec
        _write_manifest(job_dir, manifest)

        return JSONResponse(
            status_code=200,
            content={
                "message": "Re-transcription complete",
                "folder_name": folder_name,
                "file_name": file_name,
                "transcript": transcript_text,
                "elapsed": {"transcribe_seconds": elapsed_sec},
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# API: DELETE HISTORY JOBS
# =========================================================

@app.post("/api/v1/history/delete")
async def delete_jobs(req: DeleteJobsRequest):
    """
    Permanently delete one or more job folders belonging to the authenticated
    user.  Each entry in ``folder_names`` must be a valid job folder that
    exists under the user's data directory.

    Returns a summary of deleted and not-found folders so the client can
    update its list accordingly.
    """
    try:
        user_id = _resolve_user(req.google_token)

        if not req.folder_names:
            raise HTTPException(status_code=400, detail="folder_names must not be empty.")

        deleted = []
        not_found = []

        for raw_name in req.folder_names:
            folder_name = _sanitize_name(raw_name, "folder_name")
            job_dir = _safe_join(BASE_DIR, user_id, folder_name)

            if not os.path.isdir(job_dir):
                not_found.append(folder_name)
                continue

            shutil.rmtree(job_dir)
            deleted.append(folder_name)

        return JSONResponse(
            status_code=200,
            content={
                "deleted": deleted,
                "not_found": not_found,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# API: CHUNKED UPLOAD – INIT
# =========================================================

@app.post("/api/v1/upload/init")
async def upload_init(req: ChunkedUploadInitRequest):
    """
    Initialize a chunked upload session.

    Returns an ``upload_id`` and the list of already-received chunks (always
    empty for a new session).  The client should split the file into
    ``total_chunks`` equal-sized pieces and upload each one via
    ``POST /api/v1/upload/chunk``.  Use ``GET /api/v1/upload/status/{upload_id}``
    to discover which chunks are still missing after an interruption.
    """
    try:
        user_id = _resolve_user(req.google_token)

        if req.total_chunks < 1 or req.total_chunks > _MAX_UPLOAD_CHUNKS:
            raise HTTPException(
                status_code=400,
                detail=f"total_chunks must be between 1 and {_MAX_UPLOAD_CHUNKS}.",
            )

        orig_filename = req.filename or "recording"
        orig_suffix = _safe_file_suffix(orig_filename)
        original_stem = os.path.splitext(orig_filename)[0]
        safe_stem = (
            "".join(c if c.isalnum() or c in "-_" else "_" for c in original_stem)
            .strip("_")
            or "recording"
        )

        upload_id = f"up_{uuid.uuid4().hex}"
        upload_directory = _upload_dir(user_id, upload_id)
        os.makedirs(upload_directory, exist_ok=True)

        state: Dict[str, Any] = {
            "upload_id": upload_id,
            "user_id": user_id,
            "original_filename": orig_filename,
            "safe_stem": safe_stem,
            "orig_suffix": orig_suffix,
            "total_chunks": req.total_chunks,
            "file_size": req.file_size,
            "transcribe_lang": req.transcribe_lang,
            "received_chunks": [],
            "created_at": _now_iso(),
        }
        _write_upload_state(upload_directory, state)

        return JSONResponse(
            status_code=200,
            content={
                "upload_id": upload_id,
                "total_chunks": req.total_chunks,
                "received_chunks": [],
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# API: CHUNKED UPLOAD – UPLOAD CHUNK
# =========================================================

@app.post("/api/v1/upload/chunk")
async def upload_chunk(
    file: UploadFile = File(...),
    google_token: str = Form(...),
    upload_id: str = Form(...),
    chunk_index: int = Form(...),
):
    """
    Upload a single chunk for an existing upload session.

    Chunks are identified by their zero-based ``chunk_index``.  Re-uploading
    the same ``chunk_index`` is idempotent and can be used to recover from a
    failed or incomplete chunk transfer - the server will simply overwrite the
    previously stored data and return the current progress.
    """
    try:
        user_id = _resolve_user(google_token)
        upload_directory = _upload_dir(user_id, upload_id)
        
        chunk_filename = f"chunk_{chunk_index:06d}.bin"
        chunk_path = _safe_join(upload_directory, chunk_filename)
        with open(chunk_path, "wb") as f_out:
            shutil.copyfileobj(file.file, f_out)

        state_path = os.path.join(upload_directory, "upload_state.json")
        lock_path = os.path.join(upload_directory, "upload_state.lock")
        
        try:
            with FileLock(lock_path, timeout=15):
                
                with open(state_path, "r", encoding="utf-8") as f:
                    state = json.load(f)

                if state.get("user_id") != user_id:
                    raise HTTPException(status_code=403, detail="Access denied.")

                total_chunks: int = state["total_chunks"]
                if chunk_index < 0 or chunk_index >= total_chunks:
                    raise HTTPException(
                        status_code=400,
                        detail=f"chunk_index must be between 0 and {total_chunks - 1}.",
                    )

                received: List[int] = state.get("received_chunks", [])
                if chunk_index not in received:
                    received.append(chunk_index)
                    received.sort()
                    state["received_chunks"] = received
                    
                    with open(state_path, "w", encoding="utf-8") as f:
                        json.dump(state, f, ensure_ascii=False, indent=2)
                        
        except Timeout:
            raise HTTPException(
                status_code=503, 
                detail=f"Server busy tracking chunk {chunk_index}. Please retry."
            )

        all_received = len(received) == total_chunks
        
        return JSONResponse(
            status_code=200,
            content={
                "upload_id": upload_id,
                "chunk_index": chunk_index,
                "total_chunks": total_chunks,
                "received_chunks": received,
                "complete": all_received,
            },
        )
        
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# API: CHUNKED UPLOAD – STATUS
# =========================================================

@app.get("/api/v1/upload/status/{upload_id}")
async def upload_status(
    upload_id: str,
    google_token: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    """
    Return the current status of a chunked upload session.

    Clients can call this endpoint after a network interruption to find out
    which chunks still need to be (re-)sent before calling
    ``POST /api/v1/upload/complete``.
    """
    try:
        user_id = _resolve_user_from_auth(google_token=google_token, authorization=authorization)
        upload_directory = _upload_dir(user_id, upload_id)
        state = _read_upload_state(upload_directory)

        if state.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied.")

        total_chunks: int = state["total_chunks"]
        received: List[int] = state["received_chunks"]
        received_set = set(received)
        missing = [i for i in range(total_chunks) if i not in received_set]

        return JSONResponse(
            status_code=200,
            content={
                "upload_id": upload_id,
                "total_chunks": total_chunks,
                "received_chunks": received,
                "missing_chunks": missing,
                "complete": len(missing) == 0,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# API: CHUNKED UPLOAD – COMPLETE (assemble + transcribe)
# =========================================================

@app.post("/api/v1/upload/complete")
async def upload_complete(
    req: ChunkedUploadCompleteRequest,
    background_tasks: BackgroundTasks,
):
    """
    Assemble all uploaded chunks and start transcription.

    All chunks must have been uploaded before calling this endpoint.  On
    success the upload staging directory is removed and the response is
    identical to the regular ``POST /api/v1/transcribe`` response, containing
    ``folder_name`` and ``file_name`` which can be used for subsequent
    summarize / visualize / translate requests.

    If ``webhook_url`` is set in the request body, a POST notification is sent
    to that URL once transcription is complete.
    """
    try:
        user_id = _resolve_user(req.google_token)
        upload_directory = _upload_dir(user_id, req.upload_id)
        state = _read_upload_state(upload_directory)

        if state.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied.")

        total_chunks: int = state["total_chunks"]
        received: List[int] = state["received_chunks"]
        if len(received) != total_chunks:
            received_set = set(received)
            missing = [i for i in range(total_chunks) if i not in received_set]
            raise HTTPException(
                status_code=400,
                detail=f"Upload incomplete. Missing chunks: {missing}",
            )

        safe_stem: str = state["safe_stem"]
        orig_suffix: str = state["orig_suffix"]
        transcribe_lang: Optional[str] = req.transcribe_lang or state.get("transcribe_lang")

        folder_name = f"{safe_stem}_{int(time.time())}"
        job_dir = _safe_join(BASE_DIR, user_id, folder_name)
        os.makedirs(job_dir, exist_ok=True)

        # Assemble ordered chunks into a single temporary file
        t_assemble = time.monotonic()
        tmp_path = _safe_join(job_dir, f"_upload{orig_suffix}")
        with open(tmp_path, "wb") as out_f:
            for idx in range(total_chunks):
                chunk_path = _safe_join(upload_directory, f"chunk_{idx:06d}.bin")
                if not os.path.exists(chunk_path):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Chunk file missing for index {idx}.",
                    )
                with open(chunk_path, "rb") as in_f:
                    shutil.copyfileobj(in_f, out_f)

        # Clean up the staging directory now that chunks are assembled
        shutil.rmtree(upload_directory, ignore_errors=True)
        assemble_seconds = round(time.monotonic() - t_assemble, 2)

        # Convert to 16 kHz mono WAV
        t_convert = time.monotonic()
        wav_name = f"{safe_stem}.wav"
        wav_path = _safe_join(job_dir, wav_name)
        ffmpeg.input(tmp_path).output(wav_path, ac=1, ar=16000).run(
            overwrite_output=True, quiet=True
        )
        os.remove(tmp_path)

        denoised_wav_name = f"{safe_stem}_denoised.wav"
        denoised_wav_path = _safe_join(job_dir, denoised_wav_name)
        noise_reduction_applied = _try_apply_noise_reduction(wav_path, denoised_wav_path)
        audio_for_transcription = denoised_wav_path if noise_reduction_applied else wav_path
        convert_seconds = round(time.monotonic() - t_convert, 2)

        json_name = _safe_join(job_dir, f"{safe_stem}.json")
        txt_name = _safe_join(job_dir, f"{safe_stem}.txt")

        print(f"\n[INFO] Transcribing {safe_stem} (chunked upload)...")
        t_transcribe = time.monotonic()
        diarize_and_transcribe(audio_for_transcription, json_name, lang=transcribe_lang)
        json_to_txt(json_name, txt_name)
        transcribe_seconds = round(time.monotonic() - t_transcribe, 2)

        elapsed: Dict[str, float] = {
            "assemble_seconds": assemble_seconds,
            "convert_seconds": convert_seconds,
            "transcribe_seconds": transcribe_seconds,
        }

        manifest: Dict[str, Any] = {
            "folder_name": folder_name,
            "file_name": safe_stem,
            "user_id": user_id,
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
            "status": {
                "transcribe": "done",
                "summarize": "pending",
                "visualize": "pending",
                "translate": "pending",
            },
            "files": {
                "audio": wav_name,
                "audio_denoised": denoised_wav_name if noise_reduction_applied else None,
                "transcript_txt": os.path.basename(txt_name),
                "transcript_json": os.path.basename(json_name),
            },
            "audio_processing": {
                "noise_reduction_applied": noise_reduction_applied,
                "transcription_source": os.path.basename(audio_for_transcription),
            },
            "elapsed": elapsed,
        }
        _write_manifest(job_dir, manifest)

        if req.webhook_url:
            background_tasks.add_task(
                _fire_webhook,
                req.webhook_url,
                {
                    "event": "transcribe_complete",
                    "folder_name": folder_name,
                    "file_name": safe_stem,
                    "elapsed": elapsed,
                    "manifest": manifest,
                },
            )

        return JSONResponse(
            status_code=200,
            content={
                "message": "Transcription complete",
                "folder_name": folder_name,
                "file_name": safe_stem,
                "elapsed": elapsed,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/translate")
async def translate_outputs(req: TranslateRequest):
    """
    Translate generated artifacts and save translated files as separate outputs.
    Supports: .json, .txt, and _final_summary.txt.
    """
    try:
        user_id = _resolve_user(req.google_token)
        folder_name = _sanitize_name(req.folder_name, "folder_name")
        file_name = _sanitize_name(req.file_name, "file_name")
        source_language = req.source_language.strip()
        target_language = req.target_language.strip()
        if not source_language or not target_language:
            raise HTTPException(status_code=400, detail="source_language and target_language are required.")
        # Resolve to FLORES-200 codes early so that equivalent labels like
        # "en" and "English" are correctly detected as the same language.
        try:
            src_flores = resolve_flores200(source_language)
            tgt_flores = resolve_flores200(target_language)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        if src_flores == tgt_flores:
            raise HTTPException(
                status_code=400,
                detail=f"Source and target languages cannot be the same (both resolved to '{src_flores}').",
            )
        source_token = _language_token(source_language)
        target_token = _language_token(target_language)

        job_dir = _safe_join(BASE_DIR, user_id, folder_name)
        manifest = _read_manifest(job_dir)
        translator = get_translator(req.ct2_model)

        selected = req.files or ["json", "txt", "summary_txt"]
        translated_files: Dict[str, str] = {}
        lang_pair = f"{source_token}_to_{target_token}"

        if "json" in selected:
            src_json = _safe_join(job_dir, f"{file_name}.json")
            if not os.path.exists(src_json):
                raise HTTPException(status_code=404, detail="JSON transcript not found.")
            dst_json_name = f"{file_name}_{lang_pair}.json"
            dst_json = _safe_join(job_dir, dst_json_name)
            translate_json_transcript(src_json, dst_json, translator, source_language, target_language)
            translated_files["transcript_json"] = dst_json_name

        if "txt" in selected:
            src_txt = _safe_join(job_dir, f"{file_name}.txt")
            if not os.path.exists(src_txt):
                raise HTTPException(status_code=404, detail="TXT transcript not found.")
            dst_txt_name = f"{file_name}_{lang_pair}.txt"
            dst_txt = _safe_join(job_dir, dst_txt_name)
            translate_plain_text_file(src_txt, dst_txt, translator, source_language, target_language)
            translated_files["transcript_txt"] = dst_txt_name

        if "summary_txt" in selected:
            src_summary = _safe_join(job_dir, f"{file_name}_final_summary.txt")
            if not os.path.exists(src_summary):
                raise HTTPException(status_code=404, detail="Final summary TXT not found.")
            dst_summary_name = f"{file_name}_final_summary_{lang_pair}.txt"
            dst_summary = _safe_join(job_dir, dst_summary_name)
            translate_plain_text_file(src_summary, dst_summary, translator, source_language, target_language)
            translated_files["summary_txt"] = dst_summary_name

        if "translations" not in manifest:
            manifest["translations"] = {}
        manifest["translations"][lang_pair] = translated_files
        manifest["status"]["translate"] = "done"
        manifest["updated_at"] = _now_iso()
        _write_manifest(job_dir, manifest)

        return JSONResponse(
            status_code=200,
            content={
                "message": "Translation complete",
                "folder_name": folder_name,
                "file_name": file_name,
                "source_language": source_language,
                "target_language": target_language,
                "files": translated_files,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# =========================================================
# API: TRANSCRIPT SAVE
# =========================================================
@app.post("/api/v1/transcript/save")
async def save_transcript(req: SaveTranscriptRequest):
    """
    Persist the interactive transcript JSON and regenerate the plain-text
    transcript so downstream features (summary/chat/flashcards) can reuse it.
    """
    try:
        user_id = _resolve_user(req.google_token)
        folder_name = _sanitize_name(req.folder_name, "folder_name")
        file_name = _sanitize_name(req.file_name, "file_name")

        job_dir = _safe_join(BASE_DIR, user_id, folder_name)
        manifest = _read_manifest(job_dir)

        files = manifest.setdefault("files", {})
        raw_json_name = files.get("transcript_json") or f"{file_name}.json"
        raw_txt_name = files.get("transcript_txt") or f"{file_name}.txt"
        json_name = _sanitize_name(raw_json_name, "transcript_json")
        txt_name = _sanitize_name(raw_txt_name, "transcript_txt")

        json_path = _safe_join(job_dir, json_name)
        txt_path = _safe_join(job_dir, txt_name)

        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(req.transcript_data, f, ensure_ascii=False, indent=2)

        json_to_txt(json_path, txt_path)

        files["transcript_json"] = os.path.basename(json_path)
        files["transcript_txt"] = os.path.basename(txt_path)
        manifest.setdefault("status", {})["transcribe"] = "done"
        manifest["status"]["summarize"] = "pending"
        manifest["status"]["visualize"] = "pending"
        manifest["updated_at"] = _now_iso()
        _write_manifest(job_dir, manifest)

        return JSONResponse(
            status_code=200,
            content={
                "message": "Transcript saved",
                "folder_name": folder_name,
                "file_name": file_name,
                "segment_count": len(req.transcript_data),
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# =========================================================
# API: SUMMARIZE
# =========================================================
@app.post("/api/v1/summarize")
async def summarize_audio(req: SummarizeRequest):
    """
    Runs summarization on a transcribed job.
    Produces <base>_final_summary.txt and <base>_final_summary.html.
    Updates manifest.json.
    """
    try:
        user_id = _resolve_user(req.google_token)
        folder_name = _sanitize_name(req.folder_name, "folder_name")
        file_name = _sanitize_name(req.file_name, "file_name")

        job_dir = _safe_join(BASE_DIR, user_id, folder_name)
        manifest = _read_manifest(job_dir)

        out_txt = _safe_join(job_dir, f"{file_name}.txt")
        if not os.path.exists(out_txt):
            raise HTTPException(
                status_code=404,
                detail="Transcript not found. Run transcription first.",
            )

        print(f"\n[INFO] Summarizing {file_name} using {req.provider}...")
        llm = make_provider(req.provider, model=req.model, api_key=req.api_key)
        transcript = load_transcript(out_txt)

        language = _detect_job_language(job_dir, file_name)

        chunk_summaries, final_summary, json_summary = summarize_pipeline(llm, transcript, language=language)
        save_results(file_name, job_dir, chunk_summaries, final_summary, json_summary)

        summary_txt_name = f"{file_name}_final_summary.txt"
        summary_html_name = f"{file_name}_final_summary.html"

        with open(_safe_join(job_dir, summary_txt_name), "w", encoding="utf-8") as f:
            f.write(final_summary)
        with open(_safe_join(job_dir, summary_html_name), "w", encoding="utf-8") as f:
            f.write(_summary_to_html(f"{file_name} - Final Summary", final_summary))

        manifest["provider"] = req.provider
        manifest["model"] = req.model
        manifest["status"]["summarize"] = "done"
        manifest["files"]["summary_txt"] = summary_txt_name
        manifest["files"]["summary_html"] = summary_html_name
        manifest["updated_at"] = _now_iso()
        _write_manifest(job_dir, manifest)

        return JSONResponse(
            status_code=200,
            content={
                "message": "Summary complete",
                "file_name": file_name,
                "summary": final_summary,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# =========================================================
# API: VISUALIZE
# =========================================================
@app.post("/api/v1/visualize")
async def visualize_audio(req: VisualizeRequest):
    """
    Generates a speaker-timeline PNG from the JSON transcript.
    Updates manifest.json.
    """
    try:
        user_id = _resolve_user(req.google_token)
        folder_name = _sanitize_name(req.folder_name, "folder_name")
        file_name = _sanitize_name(req.file_name, "file_name")

        job_dir = _safe_join(BASE_DIR, user_id, folder_name)
        manifest = _read_manifest(job_dir)

        out_json = _safe_join(job_dir, f"{file_name}.json")
        if not os.path.exists(out_json):
            raise HTTPException(status_code=404, detail="JSON transcript not found.")

        out_img_name = f"{file_name}.png"
        out_img = _safe_join(job_dir, out_img_name)

        print(f"\n[INFO] Visualizing conversation for {file_name}...")
        data = load_transcript_vizualize(out_json)
        extracted = extract_records(data)
        generate_timeline(extracted, out_img)

        manifest["status"]["visualize"] = "done"
        manifest["files"]["timeline_png"] = out_img_name
        manifest["updated_at"] = _now_iso()
        _write_manifest(job_dir, manifest)

        return JSONResponse(
            status_code=200,
            content={
                "message": "Visualization complete",
                "file_name": file_name,
                "timeline_image": out_img,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# =========================================================
# API: HISTORY + JOB DETAILS
# =========================================================
@app.get("/api/v1/history")
async def history(google_token: Optional[str] = None, authorization: Optional[str] = Header(None)):
    """Returns { "jobs": [manifest, ...] } for the authenticated user."""
    user_id = _resolve_user_from_auth(google_token=google_token, authorization=authorization)
    user_root = _safe_join(BASE_DIR, user_id)

    if not os.path.exists(user_root):
        return JSONResponse(status_code=200, content={"jobs": []})

    jobs: List[Dict[str, Any]] = []
    for folder in sorted(os.listdir(user_root), reverse=True):
        job_dir = os.path.join(user_root, folder)
        if not os.path.isdir(job_dir):
            continue
        if not os.path.exists(os.path.join(job_dir, "manifest.json")):
            continue
        try:
            jobs.append(_read_manifest(job_dir))
        except Exception:
            continue

    return JSONResponse(status_code=200, content={"jobs": jobs})

@app.get("/api/v1/job/{folder_name}")
async def job_details(
    folder_name: str,
    google_token: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    """Returns manifest.json for one job."""
    user_id = _resolve_user_from_auth(google_token=google_token, authorization=authorization)
    job_dir = _safe_join(BASE_DIR, user_id, _sanitize_name(folder_name, "folder_name"))
    manifest = _read_manifest(job_dir)
    detected_source_language = ""
    file_name = manifest.get("file_name")
    if file_name:
        detected_source_language = _detect_job_language(job_dir, file_name)
    return JSONResponse(
        status_code=200,
        content={
            **manifest,
            "detected_source_language": detected_source_language,
        },
    )


# =========================================================
# API: DOWNLOADS
# =========================================================

FileType = Literal[
    "audio", "summary_txt", "summary_html", "image", "transcript_txt", "transcript_json",
    "flashcards_json"
]

_FILE_KEY_MAP: Dict[str, str] = {
    "audio": "audio",
    "summary_txt": "summary_txt",
    "summary_html": "summary_html",
    "image": "timeline_png",
    "transcript_txt": "transcript_txt",
    "transcript_json": "transcript_json",
    "flashcards_json": "flashcards_json",
}


@app.get("/api/v1/download/{folder_name}/{file_type}")
async def download(
    folder_name: str,
    file_type: FileType,
    google_token: Optional[str] = None,
    lang_pair: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    """Stream a single artifact file from the job folder.
    When *lang_pair* is supplied (e.g. ``indonesian_to_english``) the endpoint
    serves the corresponding translated file stored under
    ``manifest["translations"][lang_pair]`` instead of the primary artifact.
    """
    user_id = _resolve_user_from_auth(google_token=google_token, authorization=authorization)
    job_dir = _safe_join(BASE_DIR, user_id, _sanitize_name(folder_name, "folder_name"))
    manifest = _read_manifest(job_dir)

    mf_key = _FILE_KEY_MAP[file_type]
    if lang_pair:
        # Validate lang_pair: must match <source_token>_to_<target_token> where each token
        # uses only lowercase alphanumerics and underscores (output of _language_token).
        # Example: "indonesian_to_english", "chinese_simplified_to_english"
        if not re.fullmatch(r'[a-z0-9][a-z0-9_]{0,38}_to_[a-z0-9][a-z0-9_]{0,38}', lang_pair):
            raise HTTPException(status_code=400, detail="Invalid lang_pair value.")
        translations = manifest.get("translations", {})
        if lang_pair not in translations:
            raise HTTPException(status_code=404, detail=f"Translation '{lang_pair}' not found.")
        raw_filename = translations[lang_pair].get(mf_key)
        if not raw_filename:
            raise HTTPException(
                status_code=404,
                detail=f"'{file_type}' is not available for translation '{lang_pair}'.",
            )
    else:
        raw_filename = manifest.get("files", {}).get(mf_key)
        if not raw_filename:
            raise HTTPException(status_code=404, detail=f"{file_type} is not available yet.")

    filename = _sanitize_name(raw_filename, "filename")
    file_path = _safe_join(job_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk.")

    return FileResponse(file_path, filename=os.path.basename(file_path))


# =========================================================
# API: FLASHCARDS
# =========================================================

@app.post("/api/v1/flashcards")
async def create_flashcards(req: FlashcardsRequest):
    """
    Generate flashcards / quiz questions from a transcribed conversation.

    Reads the job's JSON transcript, builds a timestamped context string,
    asks the configured LLM to produce *count* flashcards, and saves the
    result to ``<base>_flashcards.json`` inside the job folder.

    Each flashcard has the shape::

        {"front": "...", "back": "...", "type": "qa|definition", "timestamp": "HH:MM:SS"}
    """
    try:
        user_id = _resolve_user(req.google_token)
        folder_name = _sanitize_name(req.folder_name, "folder_name")
        file_name = _sanitize_name(req.file_name, "file_name")

        job_dir = _safe_join(BASE_DIR, user_id, folder_name)
        manifest = _read_manifest(job_dir)

        json_transcript = _safe_join(job_dir, f"{file_name}.json")
        if not os.path.exists(json_transcript):
            raise HTTPException(
                status_code=404,
                detail="JSON transcript not found. Run transcription first.",
            )

        print(f"\n[INFO] Generating flashcards for {file_name} using {req.provider}...")
        llm = make_provider(req.provider, model=req.model, api_key=req.api_key)
        context = build_timestamped_context(json_transcript)
        language = _detect_job_language(job_dir, file_name)
        flashcards = generate_flashcards(llm, context, count=req.count, language=language)

        flashcards_name = f"{file_name}_flashcards.json"
        flashcards_path = _safe_join(job_dir, flashcards_name)
        with open(flashcards_path, "w", encoding="utf-8") as f:
            json.dump(flashcards, f, ensure_ascii=False, indent=2)

        manifest.setdefault("files", {})["flashcards_json"] = flashcards_name
        manifest.setdefault("status", {})["flashcards"] = "done"
        manifest["updated_at"] = _now_iso()
        _write_manifest(job_dir, manifest)

        return JSONResponse(
            status_code=200,
            content={
                "message": "Flashcards generated",
                "file_name": file_name,
                "flashcards": flashcards,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# API: CHAT
# =========================================================

@app.post("/api/v1/chat")
async def chat(req: ChatRequest):
    """
    Stateless mini-chatbot for a single conversation.

    The client provides the full conversation history on every request so no
    server-side session state is required.  The LLM answers timestamp-based
    questions such as:

    - "At what timestamp did they discuss X?"
    - "What was discussed between 00:05:00 and 00:10:00?"
    - "Summarize key points from 00:00:00 to 00:05:00."
    - "Find moments where keyword Y was mentioned."
    """
    try:
        user_id = _resolve_user(req.google_token)
        folder_name = _sanitize_name(req.folder_name, "folder_name")
        file_name = _sanitize_name(req.file_name, "file_name")

        job_dir = _safe_join(BASE_DIR, user_id, folder_name)
        _read_manifest(job_dir)  # validates job existence

        json_transcript = _safe_join(job_dir, f"{file_name}.json")
        if not os.path.exists(json_transcript):
            raise HTTPException(
                status_code=404,
                detail="JSON transcript not found. Run transcription first.",
            )

        print(f"\n[INFO] Chat query for {file_name} using {req.provider}: {req.question!r}")
        llm = make_provider(req.provider, model=req.model, api_key=req.api_key)
        context = build_timestamped_context(json_transcript)
        dominant_language = _detect_job_language(job_dir, file_name)

        history = (
            [{"role": m.role, "content": m.content} for m in req.history]
            if req.history
            else []
        )
        answer = chat_with_transcript(llm, context, req.question, history=history, language=dominant_language)

        return JSONResponse(
            status_code=200,
            content={
                "question": req.question,
                "answer": answer,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
