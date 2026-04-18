import { reactive, watch } from 'vue'

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
  user: savedState.user || null,
  authMethod: savedState.authMethod || '',
  historyCache: Array.isArray(savedState.historyCache) ? savedState.historyCache : [],
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
    lastError: savedState.pipeline?.lastError || ''
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
  state.user = null
  state.authMethod = ''
  state.historyCache = []
  state.pipeline = {
    currentStep: 1,
    status: 'idle',
    folderName: '',
    fileName: '',
    results: {},
    lastError: ''
  }
}

const clearPipeline = () => {
  state.pipeline = {
    currentStep: 1,
    status: 'idle',
    folderName: '',
    fileName: '',
    results: {},
    lastError: ''
  }
}

const getBaseUrl = () => {
  const url = state.settings.apiUrl.trim()
  return url.endsWith('/') ? url.slice(0, -1) : url
}

const getAuthUrl = (endpoint) => {
  const token = encodeURIComponent(state.token)
  const sep = endpoint.includes('?') ? '&' : '?'
  return `${getBaseUrl()}${endpoint}${sep}google_token=${token}`
}

export const useAppStore = () => ({ state, logout, clearPipeline, getBaseUrl, getAuthUrl })
