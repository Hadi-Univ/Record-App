import { reactive, watch } from 'vue'
import { env, normalizeBaseUrl } from '../config/env'

const STATE_KEY = 'audio_pipeline_state_v3'

const savedState = (() => {
  try {
    return JSON.parse(localStorage.getItem(STATE_KEY)) || {}
  } catch {
    return {}
  }
})()

const state = reactive({
  token: savedState.token || '',
  refreshToken: savedState.refreshToken || '',
  tokenExpiresAt: savedState.tokenExpiresAt || 0,
  user: savedState.user || null,
  authMethod: savedState.authMethod || '',
  historyCache: Array.isArray(savedState.historyCache) ? savedState.historyCache : [],
  historyDetailCache:
    savedState.historyDetailCache && typeof savedState.historyDetailCache === 'object'
      ? savedState.historyDetailCache
      : {},
  settings: {
    provider: savedState.settings?.provider || 'ollama',
    model: savedState.settings?.model || '',
    apiKey: savedState.settings?.apiKey || '',
    apiUrl: savedState.settings?.apiUrl !== undefined
      ? savedState.settings.apiUrl
      : env.apiBaseUrl
  },
  pipeline: {
    currentStep: savedState.pipeline?.currentStep || 1,
    status: savedState.pipeline?.status || 'idle',
    folderName: savedState.pipeline?.folderName || '',
    fileName: savedState.pipeline?.fileName || '',
    results: savedState.pipeline?.results || {},
    lastError: savedState.pipeline?.lastError || '',
    currentSubStep: savedState.pipeline?.currentSubStep || '',
    startedAt: savedState.pipeline?.startedAt || null,
    completedAt: savedState.pipeline?.completedAt || null,
    stageTimings: savedState.pipeline?.stageTimings && typeof savedState.pipeline.stageTimings === 'object'
      ? savedState.pipeline.stageTimings
      : {}
  }
})

watch(
  state,
  (newState) => {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(newState))
    } catch {
      // localStorage unavailable
    }
  },
  { deep: true }
)

const logout = () => {
  state.token = ''
  state.refreshToken = ''
  state.tokenExpiresAt = 0
  state.user = null
  state.authMethod = ''
  state.historyCache = []
  state.historyDetailCache = {}
  state.pipeline = {
    currentStep: 1,
    status: 'idle',
    folderName: '',
    fileName: '',
    results: {},
    lastError: '',
    currentSubStep: '',
    startedAt: null,
    completedAt: null,
    stageTimings: {}
  }
}

const clearPipeline = () => {
  state.pipeline = {
    currentStep: 1,
    status: 'idle',
    folderName: '',
    fileName: '',
    results: {},
    lastError: '',
    currentSubStep: '',
    startedAt: null,
    completedAt: null,
    stageTimings: {}
  }
}

const getBaseUrl = () => {
  return normalizeBaseUrl(state.settings.apiUrl)
}

/** Returns true when the stored access token has passed its expiry timestamp.
 *  Returns false when tokenExpiresAt is 0 (API tokens have no tracked expiry). */
const isTokenExpired = () => {
  if (!state.tokenExpiresAt) return false
  return Date.now() >= state.tokenExpiresAt
}

/**
 * Returns true when the access token will expire within `withinMs` milliseconds.
 * Defaults to 7 days, giving a comfortable window to refresh while still online.
 */
const isTokenNearExpiry = (withinMs = 7 * 24 * 60 * 60 * 1000) => {
  if (!state.tokenExpiresAt) return false
  return Date.now() >= state.tokenExpiresAt - withinMs
}

const getAuthUrl = (endpoint) => {
  const token = encodeURIComponent(state.token)
  const sep = endpoint.includes('?') ? '&' : '?'
  return `${getBaseUrl()}${endpoint}${sep}google_token=${token}`
}

export const useAppStore = () => ({ state, logout, clearPipeline, getBaseUrl, getAuthUrl, isTokenExpired, isTokenNearExpiry })
