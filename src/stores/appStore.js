import { reactive, watch } from 'vue'
import {
  loadSecureAuthState,
  saveSecureAuthState,
  clearSecureAuthState
} from '../services/secureAuthStorage'

const STATE_KEY = 'audio_pipeline_state_v3'

const savedState = (() => {
  try {
    return JSON.parse(localStorage.getItem(STATE_KEY)) || {}
  } catch {
    return {}
  }
})()

const state = reactive({
  token: '',
  refreshToken: '',
  tokenExpiresAt: 0,
  user: null,
  authMethod: '',
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
      : (import.meta.env.VITE_API_BASE_URL || '')
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
      const rest = {
        historyCache: newState.historyCache,
        historyDetailCache: newState.historyDetailCache,
        settings: newState.settings,
        pipeline: newState.pipeline
      }
      localStorage.setItem(STATE_KEY, JSON.stringify(rest))
    } catch {
      // localStorage unavailable
    }
  },
  { deep: true }
)

watch(
  () => [state.token, state.refreshToken, state.tokenExpiresAt, state.authMethod, JSON.stringify(state.user || null)],
  () => {
    saveSecureAuthState({
      token: state.token || '',
      refreshToken: state.refreshToken || '',
      tokenExpiresAt: state.tokenExpiresAt || 0,
      user: state.user || null,
      authMethod: state.authMethod || ''
    }).catch(() => {})
  }
)

const hydrateAuthState = async () => {
  const secureState = await loadSecureAuthState().catch(() => null)

  if (secureState && typeof secureState === 'object') {
    state.token = secureState.token || ''
    state.refreshToken = secureState.refreshToken || ''
    state.tokenExpiresAt = secureState.tokenExpiresAt || 0
    state.user = secureState.user || null
    state.authMethod = secureState.authMethod || ''
    return
  }

  // One-time compatibility migration from legacy localStorage auth fields.
  if (savedState.token || savedState.refreshToken) {
    state.token = savedState.token || ''
    state.refreshToken = savedState.refreshToken || ''
    state.tokenExpiresAt = savedState.tokenExpiresAt || 0
    state.user = savedState.user || null
    state.authMethod = savedState.authMethod || ''
  }
}

const logout = () => {
  state.token = ''
  state.refreshToken = ''
  state.tokenExpiresAt = 0
  state.user = null
  state.authMethod = ''
  state.historyCache = []
  state.historyDetailCache = {}
  clearSecureAuthState().catch(() => {})
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
  const url = state.settings.apiUrl.trim()
  return url.endsWith('/') ? url.slice(0, -1) : url
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

export const useAppStore = () => ({
  state,
  logout,
  clearPipeline,
  getBaseUrl,
  getAuthUrl,
  isTokenExpired,
  isTokenNearExpiry,
  hydrateAuthState
})
