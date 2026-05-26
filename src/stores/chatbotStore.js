import { reactive } from 'vue'
import {
  sendChatbotMessage,
  fetchChatbotSessions,
  fetchChatbotSession,
  createChatbotSession,
  deleteChatbotSession
} from '../services/chatbotApi'
import { normalizeApiError, getSecurityMessage } from '../services/errorHandler'
import { useNotifications } from '../composables/useNotifications'

const { notifyWarning, notifyError } = useNotifications()

const state = reactive({
  byHistory: {}
})

const ensureHistoryState = (historyId) => {
  const key = String(historyId || '')
  if (!state.byHistory[key]) {
    state.byHistory[key] = {
      sessions: [],
      activeSessionId: '',
      messages: [],
      loadingSessions: false,
      loadingMessages: false,
      sending: false,
      error: '',
      securityWarning: ''
    }
  }
  return state.byHistory[key]
}

const setActiveSession = async (historyId, sessionId) => {
  const bucket = ensureHistoryState(historyId)
  bucket.activeSessionId = sessionId || ''
  bucket.securityWarning = ''
  if (!bucket.activeSessionId) {
    bucket.messages = []
    return
  }
  bucket.loadingMessages = true
  bucket.error = ''
  try {
    const detail = await fetchChatbotSession(bucket.activeSessionId)
    bucket.messages = Array.isArray(detail.messages) ? detail.messages : []
  } catch (error) {
    bucket.error = error.message || 'Failed to load chat messages.'
  } finally {
    bucket.loadingMessages = false
  }
}

const loadSessions = async (historyId, { autoSelect = true } = {}) => {
  const bucket = ensureHistoryState(historyId)
  bucket.loadingSessions = true
  bucket.error = ''
  bucket.securityWarning = ''
  try {
    const payload = await fetchChatbotSessions(historyId)
    bucket.sessions = Array.isArray(payload.sessions) ? payload.sessions : []
    if (autoSelect) {
      const nextId = bucket.activeSessionId || bucket.sessions[0]?.session_id || ''
      await setActiveSession(historyId, nextId)
    }
  } catch (error) {
    bucket.error = error.message || 'Failed to load chat sessions.'
  } finally {
    bucket.loadingSessions = false
  }
}

const sendMessage = async (historyId, question, options = {}) => {
  const bucket = ensureHistoryState(historyId)
  const trimmed = String(question || '').trim()
  if (!trimmed || bucket.sending) return null
  const optimisticMessage = {
    message_id: `temp-${Date.now()}`,
    role: 'user',
    content: trimmed,
    created_at: new Date().toISOString(),
    metadata: {}
  }
  bucket.messages = [...bucket.messages, optimisticMessage]
  bucket.sending = true
  bucket.error = ''
  bucket.securityWarning = ''
  try {
    const response = await sendChatbotMessage(historyId, {
      question: trimmed,
      sessionId: options.sessionId || bucket.activeSessionId,
      contextWindowChars: options.contextWindowChars
    })
    bucket.activeSessionId = response.session_id || bucket.activeSessionId
    const nextMessages = response?.session?.messages
    bucket.messages = Array.isArray(nextMessages) ? nextMessages : bucket.messages
    await loadSessions(historyId, { autoSelect: false })
    return response
  } catch (error) {
    bucket.messages = bucket.messages.filter((item) => item.message_id !== optimisticMessage.message_id)
    const normalized = normalizeApiError({
      payload: error?.payload || error?.detail || null,
      status: Number(error?.status || 0),
      fallback: 'Chat request failed.',
      originalMessage: error?.message || '',
    })
    if (normalized.kind === 'security') {
      bucket.securityWarning = getSecurityMessage()
      bucket.error = ''
      notifyWarning(bucket.securityWarning)
    } else {
      bucket.error = normalized.message || 'Chat request failed.'
      notifyError(bucket.error, { timeoutMs: 5000 })
    }
    throw error
  } finally {
    bucket.sending = false
  }
}

const removeSession = async (historyId, sessionId) => {
  const bucket = ensureHistoryState(historyId)
  await deleteChatbotSession(sessionId)
  if (bucket.activeSessionId === sessionId) {
    bucket.activeSessionId = ''
    bucket.messages = []
  }
  await loadSessions(historyId, { autoSelect: true })
}

const createSession = async (historyId, title = 'Conversation') => {
  const bucket = ensureHistoryState(historyId)
  const created = await createChatbotSession(historyId, { title })
  await loadSessions(historyId, { autoSelect: false })
  if (created?.session_id) {
    bucket.activeSessionId = created.session_id
    await setActiveSession(historyId, created.session_id)
  }
  return created
}

export const useChatbotStore = () => ({
  state,
  ensureHistoryState,
  loadSessions,
  setActiveSession,
  sendMessage,
  removeSession,
  createSession
})
