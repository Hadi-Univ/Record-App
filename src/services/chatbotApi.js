import { useAppStore } from '../stores/appStore'
import { requestJson } from './httpClient'

const store = useAppStore()

const authHeaders = () => {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
  if (store.state.token) headers.Authorization = `Bearer ${store.state.token}`
  return headers
}

export async function sendChatbotMessage(historyId, payload, options = {}) {
  return requestJson(`${store.getBaseUrl()}/api/v1/chat/${encodeURIComponent(historyId)}/message`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      session_id: payload.sessionId || undefined,
      question: payload.question,
      provider: payload.provider || store.state.settings.provider,
      model: payload.model || store.state.settings.model || undefined,
      api_key: payload.apiKey || store.state.settings.apiKey || undefined,
      context_window_chars: payload.contextWindowChars || undefined
    }),
    timeoutMs: options.timeoutMs ?? 60000,
    retries: options.retries ?? 0,
    signal: options.signal,
    errorLabel: 'Chat request failed'
  })
}

export async function fetchChatbotSessions(historyId, options = {}) {
  return requestJson(`${store.getBaseUrl()}/api/v1/chat/${encodeURIComponent(historyId)}/sessions`, {
    method: 'GET',
    headers: authHeaders(),
    timeoutMs: options.timeoutMs ?? 15000,
    retries: options.retries ?? 1,
    signal: options.signal,
    errorLabel: 'Failed to load chat sessions'
  })
}

export async function createChatbotSession(historyId, payload = {}, options = {}) {
  return requestJson(`${store.getBaseUrl()}/api/v1/chat/${encodeURIComponent(historyId)}/session`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      title: payload.title || undefined
    }),
    timeoutMs: options.timeoutMs ?? 15000,
    retries: options.retries ?? 0,
    signal: options.signal,
    errorLabel: 'Failed to create chat session'
  })
}

export async function fetchChatbotSession(sessionId, options = {}) {
  const params = new URLSearchParams()
  if (Number.isFinite(options.offset)) params.set('offset', String(options.offset))
  if (Number.isFinite(options.limit)) params.set('limit', String(options.limit))
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return requestJson(`${store.getBaseUrl()}/api/v1/chat/session/${encodeURIComponent(sessionId)}${suffix}`, {
    method: 'GET',
    headers: authHeaders(),
    timeoutMs: options.timeoutMs ?? 15000,
    retries: options.retries ?? 1,
    signal: options.signal,
    errorLabel: 'Failed to load chat session'
  })
}

export async function deleteChatbotSession(sessionId, options = {}) {
  return requestJson(`${store.getBaseUrl()}/api/v1/chat/session/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
    timeoutMs: options.timeoutMs ?? 15000,
    retries: options.retries ?? 0,
    signal: options.signal,
    errorLabel: 'Failed to delete chat session'
  })
}
