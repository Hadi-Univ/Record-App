import { useAppStore } from '../stores/appStore'
import { requestBlob, requestJson, requestRaw, requestText } from './httpClient'

const store = useAppStore()
const inFlightGetRequests = new Map()
const responseCache = new Map()
const CACHE_KEY_PREFIX = {
  JOB: 'job:',
  UPLOAD: 'upload:',
  HISTORY: 'history'
}
export const GET_CACHE_TTL_MS = {
  HISTORY: 30_000,
  JOB: 20_000,
  UPLOAD: 5_000
}

const cloneCachedPayload = (payload) => {
  if (typeof structuredClone === 'function') return structuredClone(payload)
  return JSON.parse(JSON.stringify(payload))
}

const buildAuthHeaders = (extraHeaders = {}) => {
  const headers = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...extraHeaders
  }
  if (store.state.token) {
    headers.Authorization = `Bearer ${store.state.token}`
  }
  return headers
}

const getModelPayload = () => ({
  provider: store.state.settings.provider,
  model: store.state.settings.model || undefined,
  api_key: store.state.settings.apiKey || undefined
})

const invalidateGetCaches = (...prefixes) => {
  if (!prefixes.length) {
    inFlightGetRequests.clear()
    responseCache.clear()
    return
  }
  for (const key of Array.from(responseCache.keys())) {
    if (prefixes.some(prefix => key.startsWith(prefix))) {
      responseCache.delete(key)
    }
  }
  for (const key of Array.from(inFlightGetRequests.keys())) {
    if (prefixes.some(prefix => key.startsWith(prefix))) {
      inFlightGetRequests.delete(key)
    }
  }
}

const postJson = (endpoint, payload, errorLabel, options = {}) =>
  requestJson(`${store.getBaseUrl()}${endpoint}`, {
    method: 'POST',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
    errorLabel,
    timeoutMs: options.timeoutMs ?? 30000,
    retries: options.retries ?? 0,
    signal: options.signal
  })

const patchJson = (endpoint, payload, errorLabel, options = {}) =>
  requestJson(`${store.getBaseUrl()}${endpoint}`, {
    method: 'PATCH',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
    errorLabel,
    timeoutMs: options.timeoutMs ?? 15000,
    retries: options.retries ?? 0,
    signal: options.signal
  })

const fetchGetJsonWithDedup = async (cacheKey, endpoint, errorLabel, options = {}) => {
  const ttlMs = Number.isFinite(options.cacheTtlMs) ? options.cacheTtlMs : 0
  if (ttlMs > 0 && responseCache.has(cacheKey)) {
    const entry = responseCache.get(cacheKey)
    if (Date.now() < entry.expiresAt) {
      return cloneCachedPayload(entry.payload)
    }
    responseCache.delete(cacheKey)
  }

  if (inFlightGetRequests.has(cacheKey)) {
    return inFlightGetRequests.get(cacheKey)
  }

  const requestPromise = requestJson(`${store.getBaseUrl()}${endpoint}`, {
    method: 'GET',
    headers: buildAuthHeaders(),
    errorLabel,
    timeoutMs: options.timeoutMs ?? 15000,
    retries: options.retries ?? 2,
    signal: options.signal
  })

  inFlightGetRequests.set(cacheKey, requestPromise)
  try {
    const payload = await requestPromise
    if (ttlMs > 0) {
      responseCache.set(cacheKey, {
        payload,
        expiresAt: Date.now() + ttlMs
      })
    }
    return payload
  } finally {
    inFlightGetRequests.delete(cacheKey)
  }
}

const buildDownloadEndpoint = (folderName, fileType, langPair = null) => {
  const endpoint = `/api/v1/download/${encodeURIComponent(folderName)}/${encodeURIComponent(fileType)}`
  return langPair ? `${endpoint}?lang_pair=${encodeURIComponent(langPair)}` : endpoint
}

const buildShareReadEndpoint = (shareId, token, sig) =>
  `/api/v1/share/${encodeURIComponent(shareId)}?token=${encodeURIComponent(token)}&sig=${encodeURIComponent(sig)}`

const DOWNLOAD_FILENAME_FALLBACKS = {
  audio: 'audio',
  summary_txt: 'summary.txt',
  summary_html: 'summary.html',
  image: 'visualization.png',
  transcript_txt: 'transcript.txt',
  transcript_json: 'transcript.json',
  flashcards_json: 'flashcards.json'
}

const extractFilenameFromDisposition = (contentDisposition, fallback) => {
  const utf8Match = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1])
  const quotedMatch = contentDisposition?.match(/filename="([^"]+)"/i)
  if (quotedMatch?.[1]) return quotedMatch[1]
  const plainMatch = contentDisposition?.match(/filename=([^;]+)/i)
  if (plainMatch?.[1]) return plainMatch[1].trim()
  return fallback
}

const triggerBlobDownload = (blob, filename) => {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}

export async function fetchDownloadText(folderName, fileType, options = {}) {
  const endpoint = buildDownloadEndpoint(folderName, fileType, options.langPair || null)
  return requestText(`${store.getBaseUrl()}${endpoint}`, {
    method: 'GET',
    headers: buildAuthHeaders({ Accept: 'text/plain' }),
    errorLabel: options.errorLabel || 'Download failed',
    timeoutMs: options.timeoutMs ?? 15000,
    retries: options.retries ?? 1,
    signal: options.signal
  })
}

export async function fetchDownloadJson(folderName, fileType, options = {}) {
  const endpoint = buildDownloadEndpoint(folderName, fileType, options.langPair || null)
  return requestJson(`${store.getBaseUrl()}${endpoint}`, {
    method: 'GET',
    headers: buildAuthHeaders({ Accept: 'application/json' }),
    errorLabel: options.errorLabel || 'Download failed',
    timeoutMs: options.timeoutMs ?? 15000,
    retries: options.retries ?? 1,
    signal: options.signal
  })
}

export async function fetchDownloadBlob(folderName, fileType, options = {}) {
  const endpoint = buildDownloadEndpoint(folderName, fileType, options.langPair || null)
  return requestBlob(`${store.getBaseUrl()}${endpoint}`, {
    method: 'GET',
    headers: buildAuthHeaders(),
    errorLabel: options.errorLabel || 'Download failed',
    timeoutMs: options.timeoutMs ?? 30000,
    retries: options.retries ?? 0,
    signal: options.signal
  })
}

export async function createDownloadObjectUrl(folderName, fileType, options = {}) {
  const endpoint = buildDownloadEndpoint(folderName, fileType, options.langPair || null)
  const response = await requestRaw(`${store.getBaseUrl()}${endpoint}`, {
    method: 'GET',
    headers: buildAuthHeaders(),
    errorLabel: options.errorLabel || 'Download failed',
    timeoutMs: options.timeoutMs ?? 30000,
    retries: options.retries ?? 0,
    signal: options.signal
  })
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

export async function downloadArtifact(folderName, fileType, options = {}) {
  const endpoint = buildDownloadEndpoint(folderName, fileType, options.langPair || null)
  const response = await requestRaw(`${store.getBaseUrl()}${endpoint}`, {
    method: 'GET',
    headers: buildAuthHeaders(),
    errorLabel: options.errorLabel || 'Download failed',
    timeoutMs: options.timeoutMs ?? 30000,
    retries: options.retries ?? 0,
    signal: options.signal
  })
  const blob = await response.blob()
  const fallbackName = options.filename || DOWNLOAD_FILENAME_FALLBACKS[fileType] || `${fileType}`
  const filename = extractFilenameFromDisposition(response.headers.get('content-disposition'), fallbackName)
  triggerBlobDownload(blob, filename)
}

/** Files larger than this threshold are sent via the chunked-upload API. */
export const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024 // 10 MB

/** Size of each individual chunk sent to /api/v1/upload/chunk. */
export const CHUNK_SIZE = 2 * 1024 * 1024 // 2 MB

/**
 * Upload an audio file and get back the job folder name.
 * POST /api/v1/transcribe
 */
export async function uploadAndTranscribe(file, options = {}) {
  const formData = new FormData()
  formData.append('file', file)

  return requestJson(`${store.getBaseUrl()}/api/v1/transcribe`, {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: formData,
    errorLabel: 'Transcription failed',
    timeoutMs: options.timeoutMs ?? 60000,
    signal: options.signal
  })
}

/**
 * Run summarization on an already-transcribed job.
 * POST /api/v1/summarize
 */
export async function summarizeJob(folderName, fileName, options = {}) {
  const result = await postJson('/api/v1/summarize', {
    folder_name: folderName,
    file_name: fileName,
    ...getModelPayload()
  }, 'Summarization failed', options)
  invalidateGetCaches(CACHE_KEY_PREFIX.HISTORY, `${CACHE_KEY_PREFIX.JOB}${folderName}`)
  return result
}

/**
 * Run visualization on a summarized job.
 * POST /api/v1/visualize
 */
export async function visualizeJob(folderName, fileName, options = {}) {
  const result = await postJson('/api/v1/visualize', {
    folder_name: folderName,
    file_name: fileName,
    ...getModelPayload()
  }, 'Visualization failed', options)
  invalidateGetCaches(CACHE_KEY_PREFIX.HISTORY, `${CACHE_KEY_PREFIX.JOB}${folderName}`)
  return result
}

/**
 * Fetch job details.
 * GET /api/v1/job/{folder_name}
 */
export async function getJob(folderName, options = {}) {
  return fetchGetJsonWithDedup(
    `${CACHE_KEY_PREFIX.JOB}${folderName}`,
    `/api/v1/job/${encodeURIComponent(folderName)}`,
    'Job fetch failed',
    options
  )
}

/**
 * Fetch all past jobs.
 * GET /api/v1/history
 */
export async function getHistory(options = {}) {
  const params = new URLSearchParams()
  if (Number.isFinite(options.page)) params.set('page', String(options.page))
  if (Number.isFinite(options.pageSize)) params.set('page_size', String(options.pageSize))
  const endpoint = `/api/v1/history${params.toString() ? `?${params.toString()}` : ''}`
  const cacheKey = `${CACHE_KEY_PREFIX.HISTORY}:${params.toString() || 'default'}`
  return fetchGetJsonWithDedup(cacheKey, endpoint, 'History fetch failed', options)
}

/**
 * Build a download URL for an artifact.
 * GET /api/v1/download/{folder_name}/{file_type}
 * @param {string} fileType - one of: 'audio', 'audio_denoised', 'summary_txt', 'summary_html', 'image', 'transcript_txt', 'transcript_json', 'flashcards_json', 'chatbot_json'
 * @param {string|null} [langPair] - optional translation key, e.g. 'indonesian_to_english'
 */
export function getDownloadUrl(folderName, fileType, langPair = null) {
  const endpoint = buildDownloadEndpoint(folderName, fileType, langPair)
  return `${store.getBaseUrl()}${endpoint}`
}

/**
 * Initialize a resumable chunked upload session.
 * POST /api/v1/upload/init
 */
export async function initChunkedUpload(filename, totalChunks, fileSize, transcribeLang, options = {}) {
  return postJson('/api/v1/upload/init', {
    filename,
    total_chunks: totalChunks,
    file_size: fileSize,
    transcribe_lang: transcribeLang || undefined
  }, 'Upload init failed', options)
}

/**
 * Upload one chunk of a resumable upload session.
 * POST /api/v1/upload/chunk
 */
export async function uploadChunk(uploadId, chunkIndex, chunkBlob, options = {}) {
  const formData = new FormData()
  formData.append('upload_id', uploadId)
  formData.append('chunk_index', String(chunkIndex))
  formData.append('file', chunkBlob, `chunk_${chunkIndex}`)

  return requestJson(`${store.getBaseUrl()}/api/v1/upload/chunk`, {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: formData,
    errorLabel: `Chunk ${chunkIndex} upload failed`,
    timeoutMs: options.timeoutMs ?? 30000,
    retries: options.retries ?? 0,
    signal: options.signal
  })
}

/**
 * Query which chunks have been received for an upload session.
 * GET /api/v1/upload/status/{upload_id}
 */
export async function getUploadStatus(uploadId, options = {}) {
  return fetchGetJsonWithDedup(
    `${CACHE_KEY_PREFIX.UPLOAD}${uploadId}`,
    `/api/v1/upload/status/${encodeURIComponent(uploadId)}`,
    'Upload status check failed',
    options
  )
}

/**
 * Assemble uploaded chunks and start transcription.
 * POST /api/v1/upload/complete
 */
export async function completeChunkedUpload(uploadId, transcribeLang, options = {}) {
  const result = await postJson('/api/v1/upload/complete', {
    upload_id: uploadId,
    transcribe_lang: transcribeLang || undefined
  }, 'Upload complete failed', options)
  invalidateGetCaches(CACHE_KEY_PREFIX.HISTORY)
  return result
}

/**
 * Re-run transcription on an already-uploaded job using its existing WAV.
 * POST /api/v1/retranscribe
 */
export async function retranscribeJob(folderName, fileName, transcribeLang, options = {}) {
  const result = await postJson('/api/v1/retranscribe', {
    folder_name: folderName,
    file_name: fileName,
    transcribe_lang: transcribeLang || undefined
  }, 'Re-transcription failed', options)
  invalidateGetCaches(CACHE_KEY_PREFIX.HISTORY, `${CACHE_KEY_PREFIX.JOB}${folderName}`)
  return result
}

/**
 * Permanently delete one or more job folders.
 * POST /api/v1/history/delete
 * @param {string[]} folderNames - list of folder names to delete
 */
export async function deleteJobs(folderNames, options = {}) {
  const result = await postJson('/api/v1/history/delete', {
    folder_names: folderNames
  }, 'Delete failed', options)
  invalidateGetCaches(CACHE_KEY_PREFIX.HISTORY)
  return result
}

export async function renameHistory(historyId, title, options = {}) {
  const result = await patchJson(`/api/v1/history/${encodeURIComponent(historyId)}/rename`, {
    title
  }, 'Rename failed', options)
  invalidateGetCaches(CACHE_KEY_PREFIX.HISTORY, `${CACHE_KEY_PREFIX.JOB}${historyId}`)
  return result
}

/**
 * Translate job artifacts into a target language.
 * POST /api/v1/translate
 * @param {string[]} [files] - subset of ['json', 'txt', 'summary_txt']; defaults to all three
 */
export async function translateJob(folderName, fileName, sourceLang, targetLang, files, options = {}) {
  const result = await postJson('/api/v1/translate', {
    folder_name: folderName,
    file_name: fileName,
    source_language: sourceLang,
    target_language: targetLang,
    files: files || undefined
  }, 'Translation failed', options)
  invalidateGetCaches(`${CACHE_KEY_PREFIX.JOB}${folderName}`)
  return result
}

/**
 * Persist edited interactive transcript data.
 * POST /api/v1/transcript/save
 * @param {Array<object>} transcriptData
 */
export async function saveTranscript(folderName, fileName, transcriptData, options = {}) {
  const result = await postJson('/api/v1/transcript/save', {
    folder_name: folderName,
    file_name: fileName,
    transcript_data: Array.isArray(transcriptData) ? transcriptData : []
  }, 'Transcript save failed', options)
  invalidateGetCaches(`${CACHE_KEY_PREFIX.JOB}${folderName}`)
  return result
}

/**
 * Generate flashcards from a transcribed job.
 * POST /api/v1/flashcards
 * @param {string} folderName - job folder name
 * @param {string} fileName - base file name for the job
 * @param {number} [count=10] - number of flashcards to generate (1-100)
 */
export async function generateFlashcards(folderName, fileName, count = 10, options = {}) {
  return postJson('/api/v1/flashcards', {
    folder_name: folderName,
    file_name: fileName,
    ...getModelPayload(),
    count
  }, 'Flashcards generation failed', options)
}

/**
 * Send a chat message about the transcript to the AI assistant.
 * POST /api/v1/chat
 * @param {string} folderName - job folder name
 * @param {string} fileName - base file name for the job
 * @param {string} question - user's question about the transcript
 * @param {{ role: string, content: string }[]} [history=[]] - previous conversation turns
 */
export async function sendChatMessage(folderName, fileName, question, history = [], options = {}) {
  return postJson('/api/v1/chat', {
    folder_name: folderName,
    file_name: fileName,
    question,
    ...getModelPayload(),
    history: history.length ? history : undefined
  }, 'Chat failed', options)
}

export async function createShareLink(folderName, options = {}) {
  return postJson('/api/v1/share/create', {
    folder_name: folderName,
    expires_in_hours: options.expiresInHours
  }, 'Share creation failed', options)
}

export async function getProcessingLockStatus(options = {}) {
  return requestJson(`${store.getBaseUrl()}/api/v1/processing-lock/status`, {
    method: 'GET',
    headers: buildAuthHeaders(),
    errorLabel: 'Processing lock status failed',
    timeoutMs: options.timeoutMs ?? 8000,
    retries: options.retries ?? 0,
    signal: options.signal
  })
}

export async function revokeShareLink(shareId, options = {}) {
  return requestJson(`${store.getBaseUrl()}/api/v1/share/${encodeURIComponent(shareId)}`, {
    method: 'DELETE',
    headers: buildAuthHeaders(),
    errorLabel: 'Share revoke failed',
    timeoutMs: options.timeoutMs ?? 15000,
    retries: options.retries ?? 0,
    signal: options.signal
  })
}

export async function getPublicShare(shareId, token, sig, options = {}) {
  return requestJson(`${store.getBaseUrl()}${buildShareReadEndpoint(shareId, token, sig)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    errorLabel: options.errorLabel || 'Shared detail fetch failed',
    timeoutMs: options.timeoutMs ?? 15000,
    retries: options.retries ?? 1,
    signal: options.signal
  })
}

export async function fetchHistoryArtifactsParallel(folderName, files, options = {}) {
  const artifacts = Array.isArray(files) ? files : []
  const total = artifacts.length || 1
  let completed = 0
  const progress = (name, status) => {
    completed += 1
    if (typeof options.onProgress === 'function') {
      options.onProgress({
        name,
        status,
        completed,
        total,
        percent: Math.round((completed / total) * 100)
      })
    }
  }

  const tasks = artifacts.map(({ name, type, langPair }) => {
    const handler = type === 'json' ? fetchDownloadJson : fetchDownloadText
    return handler(folderName, name, { ...options, langPair })
      .then((data) => {
        progress(name, 'fulfilled')
        return [name, { status: 'fulfilled', data }]
      })
      .catch((error) => {
        progress(name, 'rejected')
        return [name, { status: 'rejected', error: error?.message || String(error) }]
      })
  })
  const entries = await Promise.all(tasks)
  return Object.fromEntries(entries)
}
