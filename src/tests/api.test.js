import { describe, it, expect, vi } from 'vitest'

// ---------- helpers ----------

function makeResponse(body, ok = true, status = 200) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body))
  }
}

// Mock store module so api.js picks up a controllable store singleton.
// model and apiKey are empty by default to test the "omit when falsy" branch.
vi.mock('../stores/appStore.js', () => {
  const state = {
    token: 'test-token',
    settings: {
      apiUrl: 'https://api.example.com',
      provider: 'ollama',
      model: '',
      apiKey: ''
    }
  }
  return {
    useAppStore: () => ({
      state,
      getBaseUrl: () => {
        const url = state.settings.apiUrl.trim()
        return url.endsWith('/') ? url.slice(0, -1) : url
      },
      getAuthUrl: (endpoint) => {
        const base = state.settings.apiUrl.trim().replace(/\/$/, '')
        const token = encodeURIComponent(state.token)
        const sep = endpoint.includes('?') ? '&' : '?'
        return `${base}${endpoint}${sep}google_token=${token}`
      }
    })
  }
})

const api = await import('../services/api.js')

describe('uploadAndTranscribe', () => {
  it('POSTs to /api/v1/transcribe and returns JSON on success', async () => {
    const result = { folder_name: 'job_1', transcript: 'Hello world' }
    global.fetch = vi.fn().mockResolvedValue(makeResponse(result))

    const file = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })
    const data = await api.uploadAndTranscribe(file)

    expect(global.fetch).toHaveBeenCalledOnce()
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.example.com/api/v1/transcribe')
    expect(opts.method).toBe('POST')
    expect(opts.body).toBeInstanceOf(FormData)
    expect(data).toEqual(result)
  })

  it('throws an error with status code when response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse('Unauthorized', false, 401))

    const file = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })
    await expect(api.uploadAndTranscribe(file)).rejects.toThrow('Transcription failed (401)')
  })
})

describe('summarizeJob', () => {
  it('POSTs to /api/v1/summarize with correct JSON body', async () => {
    const result = { summary: 'A summary', keywords: ['key1', 'key2'] }
    global.fetch = vi.fn().mockResolvedValue(makeResponse(result))

    const data = await api.summarizeJob('job_1', 'audio.mp3')

    expect(global.fetch).toHaveBeenCalledOnce()
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.example.com/api/v1/summarize')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body.google_token).toBe('test-token')
    expect(body.folder_name).toBe('job_1')
    expect(body.file_name).toBe('audio.mp3')
    expect(body.provider).toBe('ollama')
    expect(data).toEqual(result)
  })

  it('omits model and api_key when they are empty strings', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse({ summary: '' }))

    await api.summarizeJob('job_1', 'audio.mp3')

    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.model).toBeUndefined()
    expect(body.api_key).toBeUndefined()
  })

  it('throws an error on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse('Server error', false, 500))
    await expect(api.summarizeJob('job_1', 'audio.mp3')).rejects.toThrow('Summarization failed (500)')
  })
})

describe('visualizeJob', () => {
  it('POSTs to /api/v1/visualize with correct JSON body', async () => {
    const result = { svg: '<svg/>', html: '<html/>' }
    global.fetch = vi.fn().mockResolvedValue(makeResponse(result))

    const data = await api.visualizeJob('job_1', 'audio.mp3')

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.example.com/api/v1/visualize')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body.folder_name).toBe('job_1')
    expect(body.file_name).toBe('audio.mp3')
    expect(data).toEqual(result)
  })

  it('throws an error on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse('Bad request', false, 400))
    await expect(api.visualizeJob('job_1', 'audio.mp3')).rejects.toThrow('Visualization failed (400)')
  })
})

describe('getJob', () => {
  it('GETs /api/v1/job/{folderName} with google_token query param', async () => {
    const result = { folder_name: 'job_1', status: 'done' }
    global.fetch = vi.fn().mockResolvedValue(makeResponse(result))

    const data = await api.getJob('job_1')

    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('/api/v1/job/job_1')
    expect(url).toContain('google_token=test-token')
    expect(data).toEqual(result)
  })

  it('URL-encodes special characters in folder name', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse({}))
    await api.getJob('job/with spaces')
    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('job%2Fwith%20spaces')
  })

  it('throws an error on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse('Not found', false, 404))
    await expect(api.getJob('job_1')).rejects.toThrow('Job fetch failed (404)')
  })
})

describe('getHistory', () => {
  it('GETs /api/v1/history with google_token query param', async () => {
    const result = [{ folder_name: 'job_1' }]
    global.fetch = vi.fn().mockResolvedValue(makeResponse(result))

    const data = await api.getHistory()

    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('/api/v1/history')
    expect(url).toContain('google_token=test-token')
    expect(data).toEqual(result)
  })

  it('throws an error on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse('Forbidden', false, 403))
    await expect(api.getHistory()).rejects.toThrow('History fetch failed (403)')
  })
})

describe('getDownloadUrl', () => {
  it('builds a download URL with google_token for a given folder and file', async () => {
    const url = api.getDownloadUrl('job_1', 'transcript')
    expect(url).toContain('/api/v1/download/job_1/transcript')
    expect(url).toContain('google_token=test-token')
  })

  it('URL-encodes special characters in folder and file names', async () => {
    const url = api.getDownloadUrl('job/1', 'my file.txt')
    expect(url).toContain('job%2F1')
    expect(url).toContain('my%20file.txt')
  })
})
