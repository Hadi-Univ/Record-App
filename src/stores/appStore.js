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

const resolveInitialApiUrl = () => {
  const persistedApiUrl = normalizeBaseUrl(savedState.settings?.apiUrl)
  return persistedApiUrl || env.apiBaseUrl
}

const state = reactive({
  token: savedState.token || '',
  refreshToken: savedState.refreshToken || '',
  tokenExpiresAt: savedState.tokenExpiresAt || 0,
  user: savedState.user || null,
  authMethod: savedState.authMethod || '',
  historyCache: Array.isArray(savedState.historyCache) ? savedState.historyCache : [],
  historySummaryCache:
    savedState.historySummaryCache && typeof savedState.historySummaryCache === 'object'
      ? {
          totalJobs: Number(savedState.historySummaryCache.totalJobs) || 0,
          completedJobs: Number(savedState.historySummaryCache.completedJobs) || 0,
          pendingJobs: Number(savedState.historySummaryCache.pendingJobs) || 0,
          recentJobs: Array.isArray(savedState.historySummaryCache.recentJobs)
            ? savedState.historySummaryCache.recentJobs
            : []
        }
      : {
          totalJobs: 0,
          completedJobs: 0,
          pendingJobs: 0,
          recentJobs: []
        },
  historyDetailCache:
    savedState.historyDetailCache && typeof savedState.historyDetailCache === 'object'
      ? savedState.historyDetailCache
      : {},
  backendBootstrap: {
    active: false,
    title: '',
    message: '',
    attempt: 0,
    maxAttempts: 0
  },
  settings: {
    provider: savedState.settings?.provider || 'ollama',
    model: savedState.settings?.model || '',
    apiKey: savedState.settings?.apiKey || '',
    configAdminToken: savedState.settings?.configAdminToken || '',
    apiUrl: resolveInitialApiUrl()
  },
  pipelineUi: {
    isOpen: Boolean(savedState.pipelineUi?.isOpen),
    isMinimized: Boolean(savedState.pipelineUi?.isMinimized)
  },
  pipeline: {
    currentStep: savedState.pipeline?.currentStep || 1,
    status: savedState.pipeline?.status || 'idle',
    isProcessing: Boolean(savedState.pipeline?.isProcessing),
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
  },
  capabilities: {
    ready: Boolean(savedState.capabilities?.ready),
    checkedAt: savedState.capabilities?.checkedAt || 0,
    error: savedState.capabilities?.error || '',
    checks: Array.isArray(savedState.capabilities?.checks) ? savedState.capabilities.checks : [],
    deviceProfile: savedState.capabilities?.deviceProfile || null
  },
  processingLock: {
    locked: Boolean(savedState.processingLock?.locked),
    job_type: savedState.processingLock?.job_type || null
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
  state.historySummaryCache = {
    totalJobs: 0,
    completedJobs: 0,
    pendingJobs: 0,
    recentJobs: []
  }
  state.historyDetailCache = {}
  state.backendBootstrap = {
    active: false,
    title: '',
    message: '',
    attempt: 0,
    maxAttempts: 0
  }
  state.pipelineUi = {
    isOpen: false,
    isMinimized: false
  }
  state.pipeline = {
    currentStep: 1,
    status: 'idle',
    isProcessing: false,
    folderName: '',
    fileName: '',
    results: {},
    lastError: '',
    currentSubStep: '',
    startedAt: null,
    completedAt: null,
    stageTimings: {}
  }
  state.capabilities = {
    ready: false,
    checkedAt: 0,
    error: '',
    checks: [],
    deviceProfile: null
  }
  state.processingLock = {
    locked: false,
    job_type: null
  }
}

const clearPipeline = () => {
  state.pipeline = {
    currentStep: 1,
    status: 'idle',
    isProcessing: false,
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

const beginBackendBootstrap = ({ title = '', message = '', attempt = 0, maxAttempts = 0 } = {}) => {
  state.backendBootstrap = {
    active: true,
    title,
    message,
    attempt,
    maxAttempts
  }
}

const updateBackendBootstrap = ({ title, message, attempt, maxAttempts } = {}) => {
  state.backendBootstrap = {
    ...state.backendBootstrap,
    active: true,
    title: title ?? state.backendBootstrap.title,
    message: message ?? state.backendBootstrap.message,
    attempt: attempt ?? state.backendBootstrap.attempt,
    maxAttempts: maxAttempts ?? state.backendBootstrap.maxAttempts
  }
}

const finishBackendBootstrap = () => {
  state.backendBootstrap = {
    active: false,
    title: '',
    message: '',
    attempt: 0,
    maxAttempts: 0
  }
}

const openPipelineModal = () => {
  state.pipelineUi.isOpen = true
  state.pipelineUi.isMinimized = false
}

const closePipelineModal = () => {
  state.pipelineUi.isOpen = false
  state.pipelineUi.isMinimized = false
}

const togglePipelineMinimized = () => {
  if (!state.pipelineUi.isOpen) return
  state.pipelineUi.isMinimized = !state.pipelineUi.isMinimized
}

const getBaseUrl = () => {
  return normalizeBaseUrl(state.settings.apiUrl) || env.apiBaseUrl
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

export const useAppStore = () => ({
  state,
  logout,
  clearPipeline,
  beginBackendBootstrap,
  updateBackendBootstrap,
  finishBackendBootstrap,
  openPipelineModal,
  closePipelineModal,
  togglePipelineMinimized,
  getBaseUrl,
  isTokenExpired,
  isTokenNearExpiry
})
