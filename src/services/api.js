import { useAppStore } from '../stores/appStore'

const store = useAppStore()

/**
 * Upload an audio file and get back the job folder name.
 * POST /api/v1/transcribe
 */
export async function uploadAndTranscribe(file) {
  const formData = new FormData()
  formData.append('file', file)

  const url = store.getAuthUrl('/api/v1/transcribe')
  const response = await fetch(url, {
    method: 'POST',
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
export async function summarizeJob(folderName) {
  const url = store.getAuthUrl('/api/v1/summarize')
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      folder_name: folderName,
      provider: store.state.settings.provider,
      model: store.state.settings.model || undefined,
      api_key: store.state.settings.apiKey || undefined
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Summarization failed (${response.status}): ${err}`)
  }

  return response.json()
}

/**
 * Run visualization on a summarized job.
 * POST /api/v1/visualize
 */
export async function visualizeJob(folderName) {
  const url = store.getAuthUrl('/api/v1/visualize')
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      folder_name: folderName,
      provider: store.state.settings.provider,
      model: store.state.settings.model || undefined,
      api_key: store.state.settings.apiKey || undefined
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Visualization failed (${response.status}): ${err}`)
  }

  return response.json()
}

/**
 * Fetch job details.
 * GET /api/v1/job/{folder_name}
 */
export async function getJob(folderName) {
  const url = store.getAuthUrl(`/api/v1/job/${encodeURIComponent(folderName)}`)
  const response = await fetch(url)

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Job fetch failed (${response.status}): ${err}`)
  }

  return response.json()
}

/**
 * Fetch all past jobs.
 * GET /api/v1/history
 */
export async function getHistory() {
  const url = store.getAuthUrl('/api/v1/history')
  const response = await fetch(url)

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`History fetch failed (${response.status}): ${err}`)
  }

  return response.json()
}

/**
 * Build a download URL for an artifact.
 * GET /api/v1/download/{folder_name}/{filename}
 */
export function getDownloadUrl(folderName, filename) {
  return store.getAuthUrl(`/api/v1/download/${encodeURIComponent(folderName)}/${encodeURIComponent(filename)}`)
}
