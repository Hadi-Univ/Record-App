import { useAppStore } from '../stores/appStore'

const store = useAppStore()
const inFlightGetRequests = new Map()
const CACHE_KEY_PREFIX = {
  JOB: 'job:',
  UPLOAD: 'upload:',
  HISTORY: 'history'
}

const buildAuthHeaders = (extraHeaders = {}) => {
  const headers = { ...extraHeaders }
  if (store.state.token) {
    headers.Authorization = `Bearer ${store.state.token}`
  }
  return headers
}

const invalidateGetCaches = (...prefixes) => {
  if (!prefixes.length) {
    inFlightGetRequests.clear()
    return
  }
  for (const key of Array.from(inFlightGetRequests.keys())) {
    if (prefixes.some(prefix => key.startsWith(prefix))) {
      inFlightGetRequests.delete(key)
    }
  }
}

const fetchGetJsonWithDedup = async (cacheKey, endpoint, errorLabel) => {
  if (inFlightGetRequests.has(cacheKey)) {
    return inFlightGetRequests.get(cacheKey)
  }

  const requestPromise = (async () => {
    const url = `${store.getBaseUrl()}${endpoint}`
    const response = await fetch(url, { headers: buildAuthHeaders() })
    if (!response.ok) {
      const err = await response.text()
      throw new Error(`${errorLabel} (${response.status}): ${err}`)
    }
    return response.json()
  })()

  inFlightGetRequests.set(cacheKey, requestPromise)
  try {
    return await requestPromise
  } finally {
    inFlightGetRequests.delete(cacheKey)
  }
}

/** Files larger than this threshold are sent via the chunked-upload API. */
export const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024 // 10 MB

/** Size of each individual chunk sent to /api/v1/upload/chunk. */
export const CHUNK_SIZE = 2 * 1024 * 1024 // 2 MB

/**
 * Upload an audio file and get back the job folder name.
 * POST /api/v1/transcribe
 */
export async function uploadAndTranscribe(file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('google_token', store.state.token)

  const url = `${store.getBaseUrl()}/api/v1/transcribe`
  const response = await fetch(url, {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: formData
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Transcription failed (${response.status}): ${err}`)
  }

  return response.json()
}

/**
 * Run summarization on an already-transcribed job.
 * POST /api/v1/summarize
 */
export async function summarizeJob(folderName, fileName) {
  const url = `${store.getBaseUrl()}/api/v1/summarize`
  const response = await fetch(url, {
    method: 'POST',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      google_token:store.state.token,
      folder_name: folderName,
      file_name: fileName,
      provider: store.state.settings.provider,
      model: store.state.settings.model || undefined,
      api_key: store.state.settings.apiKey || undefined
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Summarization failed (${response.status}): ${err}`)
  }
  const result = await response.json()
  invalidateGetCaches(CACHE_KEY_PREFIX.HISTORY, `${CACHE_KEY_PREFIX.JOB}${folderName}`)
  return result
}

/**
 * Run visualization on a summarized job.
 * POST /api/v1/visualize
 */
export async function visualizeJob(folderName, fileName) {
  const url = `${store.getBaseUrl()}/api/v1/visualize`
  const response = await fetch(url, {
    method: 'POST',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      google_token:store.state.token,
      folder_name: folderName,
      file_name: fileName,
      provider: store.state.settings.provider,
      model: store.state.settings.model || undefined,
      api_key: store.state.settings.apiKey || undefined
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Visualization failed (${response.status}): ${err}`)
  }
  const result = await response.json()
  invalidateGetCaches(CACHE_KEY_PREFIX.HISTORY, `${CACHE_KEY_PREFIX.JOB}${folderName}`)
  return result
}

/**
 * Fetch job details.
 * GET /api/v1/job/{folder_name}
 */
export async function getJob(folderName) {
  return fetchGetJsonWithDedup(
    `${CACHE_KEY_PREFIX.JOB}${folderName}`,
    `/api/v1/job/${encodeURIComponent(folderName)}`,
    'Job fetch failed'
  )
}

/**
 * Fetch all past jobs.
 * GET /api/v1/history
 */
export async function getHistory() {
  return fetchGetJsonWithDedup(CACHE_KEY_PREFIX.HISTORY, '/api/v1/history', 'History fetch failed')
}

/**
 * Build a download URL for an artifact.
 * GET /api/v1/download/{folder_name}/{file_type}
 * @param {string} fileType - one of: 'audio', 'summary_txt', 'summary_html', 'image', 'transcript_txt', 'transcript_json'
 * @param {string|null} [langPair] - optional translation key, e.g. 'indonesian_to_english'
 */
export function getDownloadUrl(folderName, fileType, langPair = null) {
  const endpoint = `/api/v1/download/${encodeURIComponent(folderName)}/${encodeURIComponent(fileType)}`
  const withLang = langPair ? `${endpoint}?lang_pair=${encodeURIComponent(langPair)}` : endpoint
  return store.getAuthUrl(withLang)
}

/**
 * Initialize a resumable chunked upload session.
 * POST /api/v1/upload/init
 */
export async function initChunkedUpload(filename, totalChunks, fileSize, transcribeLang) {
  const url = `${store.getBaseUrl()}/api/v1/upload/init`
  const response = await fetch(url, {
    method: 'POST',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      google_token: store.state.token,
      filename,
      total_chunks: totalChunks,
      file_size: fileSize,
      transcribe_lang: transcribeLang || undefined
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Upload init failed (${response.status}): ${err}`)
  }

  return response.json()
}

/**
 * Upload one chunk of a resumable upload session.
 * POST /api/v1/upload/chunk
 */
export async function uploadChunk(uploadId, chunkIndex, chunkBlob) {
  const formData = new FormData()
  formData.append('google_token', store.state.token)
  formData.append('upload_id', uploadId)
  formData.append('chunk_index', String(chunkIndex))
  formData.append('file', chunkBlob, `chunk_${chunkIndex}`)

  const url = `${store.getBaseUrl()}/api/v1/upload/chunk`
  const response = await fetch(url, {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: formData
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Chunk ${chunkIndex} upload failed (${response.status}): ${err}`)
  }

  return response.json()
}

/**
 * Query which chunks have been received for an upload session.
 * GET /api/v1/upload/status/{upload_id}
 */
export async function getUploadStatus(uploadId) {
  return fetchGetJsonWithDedup(
    `${CACHE_KEY_PREFIX.UPLOAD}${uploadId}`,
    `/api/v1/upload/status/${encodeURIComponent(uploadId)}`,
    'Upload status check failed'
  )
}

/**
 * Assemble uploaded chunks and start transcription.
 * POST /api/v1/upload/complete
 */
export async function completeChunkedUpload(uploadId, transcribeLang) {
  const url = `${store.getBaseUrl()}/api/v1/upload/complete`
  const response = await fetch(url, {
    method: 'POST',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      google_token: store.state.token,
      upload_id: uploadId,
      transcribe_lang: transcribeLang || undefined
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Upload complete failed (${response.status}): ${err}`)
  }
  const result = await response.json()
  invalidateGetCaches(CACHE_KEY_PREFIX.HISTORY)
  return result
}

/**
 * Re-run transcription on an already-uploaded job using its existing WAV.
 * POST /api/v1/retranscribe
 */
export async function retranscribeJob(folderName, fileName, transcribeLang) {
  const url = `${store.getBaseUrl()}/api/v1/retranscribe`
  const response = await fetch(url, {
    method: 'POST',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      google_token: store.state.token,
      folder_name: folderName,
      file_name: fileName,
      transcribe_lang: transcribeLang || undefined
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Re-transcription failed (${response.status}): ${err}`)
  }
  const result = await response.json()
  invalidateGetCaches(CACHE_KEY_PREFIX.HISTORY, `${CACHE_KEY_PREFIX.JOB}${folderName}`)
  return result
}

/**
 * Permanently delete one or more job folders.
 * POST /api/v1/history/delete
 * @param {string[]} folderNames - list of folder names to delete
 */
export async function deleteJobs(folderNames) {
  const url = `${store.getBaseUrl()}/api/v1/history/delete`
  const response = await fetch(url, {
    method: 'POST',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      google_token: store.state.token,
      folder_names: folderNames
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Delete failed (${response.status}): ${err}`)
  }

  const result = await response.json()
  invalidateGetCaches(CACHE_KEY_PREFIX.HISTORY)
  return result
}

/**
 * Translate job artifacts into a target language.
 * POST /api/v1/translate
 * @param {string[]} [files] - subset of ['json', 'txt', 'summary_txt']; defaults to all three
 */
export async function translateJob(folderName, fileName, sourceLang, targetLang, files) {
  const url = `${store.getBaseUrl()}/api/v1/translate`
  const response = await fetch(url, {
    method: 'POST',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      google_token: store.state.token,
      folder_name: folderName,
      file_name: fileName,
      source_language: sourceLang,
      target_language: targetLang,
      files: files || undefined
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Translation failed (${response.status}): ${err}`)
  }

  const result = await response.json()
  invalidateGetCaches(`${CACHE_KEY_PREFIX.JOB}${folderName}`)
  return result
}

/**
 * Persist edited interactive transcript data.
 * POST /api/v1/transcript/save
 * @param {Array<object>} transcriptData
 */
export async function saveTranscript(folderName, fileName, transcriptData) {
  const url = `${store.getBaseUrl()}/api/v1/transcript/save`
  const response = await fetch(url, {
    method: 'POST',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      google_token: store.state.token,
      folder_name: folderName,
      file_name: fileName,
      transcript_data: Array.isArray(transcriptData) ? transcriptData : []
    })
  })

  if (!response.ok) {
    throw new Error(`Transcript save failed (${response.status})`)
  }

  const result = await response.json()
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
export async function generateFlashcards(folderName, fileName, count = 10) {
  const url = `${store.getBaseUrl()}/api/v1/flashcards`
  const response = await fetch(url, {
    method: 'POST',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      google_token: store.state.token,
      folder_name: folderName,
      file_name: fileName,
      provider: store.state.settings.provider,
      model: store.state.settings.model || undefined,
      api_key: store.state.settings.apiKey || undefined,
      count
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Flashcards generation failed (${response.status}): ${err}`)
  }

  return response.json()
}

/**
 * Send a chat message about the transcript to the AI assistant.
 * POST /api/v1/chat
 * @param {string} folderName - job folder name
 * @param {string} fileName - base file name for the job
 * @param {string} question - user's question about the transcript
 * @param {{ role: string, content: string }[]} [history=[]] - previous conversation turns
 */
export async function sendChatMessage(folderName, fileName, question, history = []) {
  const url = `${store.getBaseUrl()}/api/v1/chat`
  const response = await fetch(url, {
    method: 'POST',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      google_token: store.state.token,
      folder_name: folderName,
      file_name: fileName,
      question,
      provider: store.state.settings.provider,
      model: store.state.settings.model || undefined,
      api_key: store.state.settings.apiKey || undefined,
      history: history.length ? history : undefined
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Chat failed (${response.status}): ${err}`)
  }

  return response.json()
}
