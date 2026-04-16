"""
main.py – Audio Processing API

Supports three authentication methods, all of which pass their token as the
`google_token` parameter (body field or query param) that existing API
endpoints already expect:

  1. Google OAuth  – frontend stores a Google ID token
  2. Email / password (basic)  – frontend stores a signed JWT issued here
  3. Personal API token  – a static token pre-configured via the API_TOKENS
                           environment variable; intended for personal /
                           self-hosted usage without a full account
"""

import contextlib
import datetime
import hmac
import json
import os
import shutil
import time
import traceback
from typing import Any, Dict, List, Literal, Optional

import ffmpeg
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponsefrom pydantic import BaseModel, EmailStr, field_validator

import auth
from tools import extract_records, generate_timeline, json_to_txt, load_transcript_vizualize
from utils import diarize_and_transcribe, load_transcript, make_provider, save_results, summarize_pipeline

# =========================================================
# CONFIGURATION
# =========================================================
load_dotenv()

GOOGLE_CLIENT_ID: Optional[str] = os.getenv("GOOGLE_CLIENT_ID")
BASE_DIR = "Data"

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

    Format: comma-separated entries of the form ``token:user_id``.
    The ``user_id`` part is optional; when omitted it defaults to ``api_user``.

    Example::

        API_TOKENS=mypersonaltoken:hadi,anothertoken

    Both ``mypersonaltoken`` (→ user_id ``hadi``) and ``anothertoken``
    (→ user_id ``api_user``) are accepted.
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


# Populated once at import time; changes require a process restart.
_API_TOKEN_MAP: Dict[str, str] = _parse_api_tokens(os.getenv("API_TOKENS"))

# =========================================================
# APPLICATION
# =========================================================

@contextlib.asynccontextmanager
async def _lifespan(application: FastAPI):  # noqa: ARG001
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
    yield  # application runs here


app = FastAPI(
    title="Audio Processing API",
    description=(
        "Modular API for transcribing, summarizing, and visualizing audio. "
        "Supports Google OAuth, email/password, and static API token authentication."
    ),
    lifespan=_lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
</html>
"""


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


# =========================================================
# API: HEALTH
# =========================================================

@app.get("/api/v1/health")
async def health():
    return {"status": "ok"}


# =========================================================
# API: AUTH – REGISTER
# =========================================================

@app.post("/api/v1/auth/register", status_code=201)
async def register(req: RegisterRequest):
    """
    Create a new account.  Returns a JWT token so the user is immediately
    logged in after registration.
    """
    user = auth.create_user(req.name, str(req.email), req.password)
    token = auth.create_access_token(user["id"])
    return JSONResponse(
        status_code=201,
        content={
            "token": token,
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
    Authenticate with email + password.  Returns a JWT token.
    Uses a generic error message to avoid leaking whether the email exists.
    """
    user = auth.get_user_by_email(str(req.email))
    if not user or not auth.verify_password(req.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    token = auth.create_access_token(user["id"])
    return JSONResponse(
        status_code=200,
        content={
            "token": token,
            "user": {
                "name": user["name"],
                "email": user["email"],
                "picture": "",
            },
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
    if not user_full or not auth.verify_password(
        req.current_password, user_full["hashed_password"]
    ):
        raise HTTPException(status_code=403, detail="Current password is incorrect.")

    auth.update_password(user_id, req.new_password)
    return JSONResponse(
        status_code=200,
        content={"message": "Password changed successfully."},
    )


# =========================================================
# API: TRANSCRIBE
# =========================================================


@app.post("/api/v1/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    google_token: str = Form(...),
    transcribe_lang: str = Form(None),
):
    """
    Creates a new job folder: Data/<user_id>/<safe_name>_<timestamp>/
    Produces <base>.wav, <base>.json, <base>.txt and manifest.json.
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
        wav_name = f"{safe_stem}.wav"
        wav_path = _safe_join(job_dir, wav_name)
        ffmpeg.input(tmp_path).output(wav_path, ac=1, ar=16000).run(
            overwrite_output=True, quiet=True
        )
        os.remove(tmp_path)

        json_name = _safe_join(job_dir, f"{safe_stem}.json")
        txt_name = _safe_join(job_dir, f"{safe_stem}.txt")

        # Transcribe + diarize
        print(f"\n[INFO] Transcribing {safe_stem}...")
        diarize_and_transcribe(wav_path, json_name, lang=transcribe_lang)
        json_to_txt(json_name, txt_name)

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
            },
            "files": {
                "audio": wav_name,
                "transcript_txt": os.path.basename(txt_name),
                "transcript_json": os.path.basename(json_name),
            },
        }
        _write_manifest(job_dir, manifest)

        return JSONResponse(
            status_code=200,
            content={
                "message": "Transcription complete",
                "folder_name": folder_name,
                "file_name": safe_stem,
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
        chunk_summaries, final_summary, json_summary = summarize_pipeline(llm, transcript)
        save_results(file_name, job_dir, chunk_summaries, final_summary, json_summary)

        summary_txt_name = f"{file_name}_final_summary.txt"
        summary_html_name = f"{file_name}_final_summary.html"

        with open(_safe_join(job_dir, summary_txt_name), "w", encoding="utf-8") as f:
            f.write(final_summary)
        with open(_safe_join(job_dir, summary_html_name), "w", encoding="utf-8") as f:
            f.write(_summary_to_html(f"{file_name} \u2013 Final Summary", final_summary))

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
async def history(google_token: str):
    """Returns { "jobs": [manifest, ...] } for the authenticated user."""
    user_id = _resolve_user(google_token)
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
async def job_details(folder_name: str, google_token: str):
    """Returns manifest.json for one job."""
    user_id = _resolve_user(google_token)
    job_dir = _safe_join(
        BASE_DIR, user_id, _sanitize_name(folder_name, "folder_name")
    )
    return JSONResponse(status_code=200, content=_read_manifest(job_dir))


# =========================================================
# API: DOWNLOADS
# =========================================================

FileType = Literal[
    "audio", "summary_txt", "summary_html", "image", "transcript_txt", "transcript_json"
]

_FILE_KEY_MAP: Dict[str, str] = {
    "audio": "audio",
    "summary_txt": "summary_txt",
    "summary_html": "summary_html",
    "image": "timeline_png",
    "transcript_txt": "transcript_txt",
    "transcript_json": "transcript_json",
}


@app.get("/api/v1/download/{folder_name}/{file_type}")
async def download(folder_name: str, file_type: FileType, google_token: str):
    """Stream a single artifact file from the job folder."""
    user_id = _resolve_user(google_token)
    job_dir = _safe_join(
        BASE_DIR, user_id, _sanitize_name(folder_name, "folder_name")
    )
    manifest = _read_manifest(job_dir)

    mf_key = _FILE_KEY_MAP[file_type]
    raw_filename = manifest.get("files", {}).get(mf_key)
    if not raw_filename:
        raise HTTPException(
            status_code=404, detail=f"{file_type} is not available yet."
        )

    filename = _sanitize_name(raw_filename, "filename")
    file_path = _safe_join(job_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk.")

    return FileResponse(file_path, filename=os.path.basename(file_path))
