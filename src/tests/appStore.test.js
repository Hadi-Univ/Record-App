import { describe, it, expect, beforeEach, vi } from 'vitest'

// Re-import the store module for each test suite so each test
// can start from a known state by directly resetting reactive properties.
// Because the store is a module-level singleton we simply manipulate state.
let useAppStore

beforeEach(() => {
  vi.unstubAllEnvs()
})

async function freshStore(savedState = null) {
  if (savedState !== null) {
    localStorage.setItem('audio_pipeline_state_v3', JSON.stringify(savedState))
  } else {
    localStorage.removeItem('audio_pipeline_state_v3')
  }
  vi.resetModules()
  const mod = await import('../stores/appStore.js')
  useAppStore = mod.useAppStore
  return useAppStore()
}

describe('appStore – initial state', () => {
  it('falls back to VITE_API_BASE_URL when persisted apiUrl is empty', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000')
    const { state, getBaseUrl } = await freshStore({ settings: { apiUrl: '' } })
    expect(state.settings.apiUrl).toBe('http://localhost:8000')
    expect(getBaseUrl()).toBe('http://localhost:8000')
  })

  it('uses defaults when localStorage is empty', async () => {
    const { state } = await freshStore()
    expect(state.token).toBe('')
    expect(state.user).toBeNull()
    expect(state.historyCache).toEqual([])
    expect(state.historySummaryCache).toEqual({
      totalJobs: 0,
      completedJobs: 0,
      pendingJobs: 0,
      recentJobs: []
    })
    expect(state.historyDetailCache).toEqual({})
    expect(state.settings.provider).toBe('ollama')
    expect(state.settings.model).toBe('')
    expect(state.settings.apiKey).toBe('')
    expect(state.pipeline.currentStep).toBe(1)
    expect(state.pipeline.status).toBe('idle')
    expect(state.pipeline.isProcessing).toBe(false)
    expect(state.pipeline.folderName).toBe('')
    expect(state.pipeline.fileName).toBe('')
    expect(state.pipeline.results).toEqual({})
    expect(state.pipeline.lastError).toBe('')
  })

  it('restores persisted state from localStorage', async () => {
    const saved = {
      token: 'my-token',
      user: { name: 'Alice', email: 'alice@example.com', picture: '' },
      settings: { provider: 'openai', model: 'gpt-4o', apiKey: 'sk-123', apiUrl: 'https://api.example.com' },
      historyCache: [{ folder_name: 'job_1' }],
      historyDetailCache: {
        job_1: {
          summary: 'cached summary',
          transcript: 'cached transcript',
          transcriptData: [{ speaker: 1, start: 0, end: 1, text: 'hello' }]
        }
      },
      pipeline: {
        currentStep: 3,
        status: 'idle',
        isProcessing: true,
        folderName: 'job_abc',
        fileName: 'audio.mp3',
        results: { transcription: 'Hello' },
        lastError: ''
      }
    }
    const { state } = await freshStore(saved)
    expect(state.token).toBe('my-token')
    expect(state.user.name).toBe('Alice')
    expect(state.settings.provider).toBe('openai')
    expect(state.settings.model).toBe('gpt-4o')
    expect(state.settings.apiKey).toBe('sk-123')
    expect(state.settings.apiUrl).toBe('https://api.example.com')
    expect(state.historyCache).toEqual([{ folder_name: 'job_1' }])
    expect(state.historyDetailCache.job_1.summary).toBe('cached summary')
    expect(state.pipeline.currentStep).toBe(3)
    expect(state.pipeline.isProcessing).toBe(true)
    expect(state.pipeline.folderName).toBe('job_abc')
    expect(state.pipeline.results.transcription).toBe('Hello')
  })

  it('preserves "running" pipeline status on reload', async () => {
    const saved = {
      pipeline: { currentStep: 2, status: 'running', folderName: 'f', fileName: 'f.mp3', results: {}, lastError: '' }
    }
    const { state } = await freshStore(saved)
    expect(state.pipeline.status).toBe('running')
    expect(state.pipeline.isProcessing).toBe(false)
  })

  it('preserves non-running pipeline status on reload', async () => {
    const saved = {
      pipeline: { currentStep: 4, status: 'done', folderName: 'f', fileName: 'f.mp3', results: {}, lastError: '' }
    }
    const { state } = await freshStore(saved)
    expect(state.pipeline.status).toBe('done')
  })

  it('handles corrupted localStorage JSON gracefully', async () => {
    localStorage.setItem('audio_pipeline_state_v3', '{bad json')
    vi.resetModules()
    const mod = await import('../stores/appStore.js')
    const { state } = mod.useAppStore()
    expect(state.token).toBe('')
    expect(state.pipeline.currentStep).toBe(1)
  })
})

describe('appStore – logout()', () => {
  it('clears token, user, and resets pipeline', async () => {
    const { state, logout } = await freshStore()
    state.token = 'tok'
    state.user = { name: 'Bob', email: 'bob@example.com', picture: '' }
    state.historyCache = [{ folder_name: 'job_xyz' }]
    state.historyDetailCache = { job_xyz: { summary: 'cached' } }
    state.pipeline.currentStep = 3
    state.pipeline.folderName = 'job_xyz'
    state.pipeline.status = 'done'
    state.pipeline.results = { transcription: 'hi' }

    logout()

    expect(state.token).toBe('')
    expect(state.user).toBeNull()
    expect(state.historyCache).toEqual([])
    expect(state.historyDetailCache).toEqual({})
    expect(state.pipeline.currentStep).toBe(1)
    expect(state.pipeline.status).toBe('idle')
    expect(state.pipeline.isProcessing).toBe(false)
    expect(state.pipeline.folderName).toBe('')
    expect(state.pipeline.fileName).toBe('')
    expect(state.pipeline.results).toEqual({})
    expect(state.pipeline.lastError).toBe('')
  })
})

describe('appStore – clearPipeline()', () => {
  it('resets pipeline to initial values without touching token/user', async () => {
    const { state, clearPipeline } = await freshStore()
    state.token = 'tok'
    state.user = { name: 'Carol', email: 'carol@example.com', picture: '' }
    state.pipeline.currentStep = 4
    state.pipeline.status = 'done'
    state.pipeline.isProcessing = true
    state.pipeline.folderName = 'job_123'
    state.pipeline.results = { summary: 'text' }

    clearPipeline()

    expect(state.token).toBe('tok')
    expect(state.user).not.toBeNull()
    expect(state.pipeline.currentStep).toBe(1)
    expect(state.pipeline.status).toBe('idle')
    expect(state.pipeline.isProcessing).toBe(false)
    expect(state.pipeline.folderName).toBe('')
    expect(state.pipeline.fileName).toBe('')
    expect(state.pipeline.results).toEqual({})
    expect(state.pipeline.lastError).toBe('')
  })
})

describe('appStore – pipeline modal state', () => {
  it('opens, minimizes, and closes modal state', async () => {
    const { state, openPipelineModal, togglePipelineMinimized, closePipelineModal } = await freshStore()
    openPipelineModal()
    expect(state.pipelineUi.isOpen).toBe(true)
    expect(state.pipelineUi.isMinimized).toBe(false)
    togglePipelineMinimized()
    expect(state.pipelineUi.isMinimized).toBe(true)
    closePipelineModal()
    expect(state.pipelineUi.isOpen).toBe(false)
    expect(state.pipelineUi.isMinimized).toBe(false)
  })
})

describe('appStore – getBaseUrl()', () => {
  it('returns trimmed URL without trailing slash', async () => {
    const { state, getBaseUrl } = await freshStore()
    state.settings.apiUrl = 'https://api.example.com/'
    expect(getBaseUrl()).toBe('https://api.example.com')
  })

  it('returns URL unchanged when no trailing slash', async () => {
    const { state, getBaseUrl } = await freshStore()
    state.settings.apiUrl = 'https://api.example.com'
    expect(getBaseUrl()).toBe('https://api.example.com')
  })

  it('trims whitespace before removing trailing slash', async () => {
    const { state, getBaseUrl } = await freshStore()
    state.settings.apiUrl = '  https://api.example.com/  '
    expect(getBaseUrl()).toBe('https://api.example.com')
  })

  it('returns empty string for empty apiUrl', async () => {
    const { state, getBaseUrl } = await freshStore()
    state.settings.apiUrl = ''
    expect(getBaseUrl()).toBe('')
  })

  it('falls back to VITE_API_BASE_URL when apiUrl is blank at runtime', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000')
    const { state, getBaseUrl } = await freshStore()
    state.settings.apiUrl = '   '
    expect(getBaseUrl()).toBe('http://localhost:8000')
  })
})

describe('appStore – localStorage persistence', () => {
  it('persists state changes to localStorage reactively', async () => {
    const { state } = await freshStore()

    // Trigger reactivity by changing a value
    state.token = 'new-token'

    // Wait for the watcher (deep watch) to flush
    await new Promise(resolve => setTimeout(resolve, 50))

    const saved = JSON.parse(localStorage.getItem('audio_pipeline_state_v3'))
    expect(saved.token).toBe('new-token')
  })
})

describe('appStore – backend bootstrap state', () => {
  it('tracks and clears the home bootstrap modal state', async () => {
    const { state, beginBackendBootstrap, updateBackendBootstrap, finishBackendBootstrap } = await freshStore()

    beginBackendBootstrap({
      title: 'Preparing workspace',
      message: 'Attempt 1',
      attempt: 1,
      maxAttempts: 20
    })
    expect(state.backendBootstrap).toEqual({
      active: true,
      title: 'Preparing workspace',
      message: 'Attempt 1',
      attempt: 1,
      maxAttempts: 20
    })

    updateBackendBootstrap({ message: 'Attempt 2', attempt: 2 })
    expect(state.backendBootstrap.message).toBe('Attempt 2')
    expect(state.backendBootstrap.attempt).toBe(2)
    expect(state.backendBootstrap.maxAttempts).toBe(20)

    finishBackendBootstrap()
    expect(state.backendBootstrap).toEqual({
      active: false,
      title: '',
      message: '',
      attempt: 0,
      maxAttempts: 0
    })
  })
})
