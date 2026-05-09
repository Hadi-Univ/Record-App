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
  it('GETs /api/v1/job/{folderName} with Authorization header', async () => {
    const result = { folder_name: 'job_1', status: 'done' }
    global.fetch = vi.fn().mockResolvedValue(makeResponse(result))

    const data = await api.getJob('job_1')

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toContain('/api/v1/job/job_1')
    expect(url).not.toContain('google_token=')
    expect(opts.headers.Authorization).toBe('Bearer test-token')
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

  it('deduplicates in-flight duplicate GET calls for the same job', async () => {
    let resolveFetch
    const responsePromise = new Promise((resolve) => { resolveFetch = resolve })
    global.fetch = vi.fn().mockReturnValue(responsePromise)

    const first = api.getJob('job_1')
    const second = api.getJob('job_1')
    expect(global.fetch).toHaveBeenCalledOnce()

    resolveFetch(makeResponse({ folder_name: 'job_1', status: 'done' }))
    await expect(first).resolves.toEqual({ folder_name: 'job_1', status: 'done' })
    await expect(second).resolves.toEqual({ folder_name: 'job_1', status: 'done' })
  })
})

describe('getHistory', () => {
  it('GETs /api/v1/history with Authorization header', async () => {
    const result = [{ folder_name: 'job_1' }]
    global.fetch = vi.fn().mockResolvedValue(makeResponse(result))

    const data = await api.getHistory()

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toContain('/api/v1/history')
    expect(url).not.toContain('google_token=')
    expect(opts.headers.Authorization).toBe('Bearer test-token')
    expect(data).toEqual(result)
  })

  it('throws an error on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse('Forbidden', false, 403))
    await expect(api.getHistory()).rejects.toThrow('History fetch failed (403)')
  })
})

describe('getDownloadUrl', () => {
  it('builds a download URL with google_token for a given folder and file type', async () => {
    const url = api.getDownloadUrl('job_1', 'transcript_txt')
    expect(url).toContain('/api/v1/download/job_1/transcript_txt')
    expect(url).toContain('google_token=test-token')
  })

  it('URL-encodes special characters in folder names', async () => {
    const url = api.getDownloadUrl('job/1', 'audio')
    expect(url).toContain('job%2F1')
    expect(url).toContain('/audio')
  })

  it('appends lang_pair query param when provided', async () => {
    const url = api.getDownloadUrl('job_1', 'summary_txt', 'indonesian_to_english')
    expect(url).toContain('/api/v1/download/job_1/summary_txt')
    expect(url).toContain('lang_pair=indonesian_to_english')
    expect(url).toContain('google_token=test-token')
  })

  it('does not append lang_pair when null', async () => {
    const url = api.getDownloadUrl('job_1', 'summary_txt', null)
    expect(url).not.toContain('lang_pair')
  })
})

describe('initChunkedUpload', () => {
  it('POSTs to /api/v1/upload/init with correct JSON body', async () => {
    const result = { upload_id: 'up_abc123', total_chunks: 5, received_chunks: [] }
    global.fetch = vi.fn().mockResolvedValue(makeResponse(result))

    const data = await api.initChunkedUpload('audio.mp3', 5, 10485760, 'id')

    expect(global.fetch).toHaveBeenCalledOnce()
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.example.com/api/v1/upload/init')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body.google_token).toBe('test-token')
    expect(body.filename).toBe('audio.mp3')
    expect(body.total_chunks).toBe(5)
    expect(body.file_size).toBe(10485760)
    expect(body.transcribe_lang).toBe('id')
    expect(data).toEqual(result)
  })

  it('omits transcribe_lang when not provided', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse({ upload_id: 'up_xyz' }))
    await api.initChunkedUpload('audio.mp3', 3, 1024)
    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.transcribe_lang).toBeUndefined()
  })

  it('throws an error on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse('Bad request', false, 400))
    await expect(api.initChunkedUpload('audio.mp3', 5, 1024)).rejects.toThrow('Upload init failed (400)')
  })
})

describe('uploadChunk', () => {
  it('POSTs to /api/v1/upload/chunk as FormData', async () => {
    const result = { upload_id: 'up_abc', chunk_index: 0, received_chunks: [0] }
    global.fetch = vi.fn().mockResolvedValue(makeResponse(result))

    const blob = new Blob(['chunk data'], { type: 'application/octet-stream' })
    const data = await api.uploadChunk('up_abc', 0, blob)

    expect(global.fetch).toHaveBeenCalledOnce()
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.example.com/api/v1/upload/chunk')
    expect(opts.method).toBe('POST')
    expect(opts.body).toBeInstanceOf(FormData)
    expect(data).toEqual(result)
  })

  it('throws an error with chunk index on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse('Server error', false, 500))
    const blob = new Blob(['x'])
    await expect(api.uploadChunk('up_abc', 2, blob)).rejects.toThrow('Chunk 2 upload failed (500)')
  })
})

describe('getUploadStatus', () => {
  it('GETs /api/v1/upload/status/{upload_id} with Authorization header', async () => {
    const result = { upload_id: 'up_abc', total_chunks: 5, received_chunks: [0, 1], missing_chunks: [2, 3, 4] }
    global.fetch = vi.fn().mockResolvedValue(makeResponse(result))

    const data = await api.getUploadStatus('up_abc')

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toContain('/api/v1/upload/status/up_abc')
    expect(url).not.toContain('google_token=')
    expect(opts.headers.Authorization).toBe('Bearer test-token')
    expect(data).toEqual(result)
  })

  it('throws an error on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse('Not found', false, 404))
    await expect(api.getUploadStatus('up_missing')).rejects.toThrow('Upload status check failed (404)')
  })
})

describe('completeChunkedUpload', () => {
  it('POSTs to /api/v1/upload/complete with correct JSON body', async () => {
    const result = { folder_name: 'job_1', file_name: 'audio', transcript: 'Hello' }
    global.fetch = vi.fn().mockResolvedValue(makeResponse(result))

    const data = await api.completeChunkedUpload('up_abc', 'en')

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.example.com/api/v1/upload/complete')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body.google_token).toBe('test-token')
    expect(body.upload_id).toBe('up_abc')
    expect(body.transcribe_lang).toBe('en')
    expect(data).toEqual(result)
  })

  it('omits transcribe_lang when not provided', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse({ folder_name: 'job_1' }))
    await api.completeChunkedUpload('up_abc')
    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.transcribe_lang).toBeUndefined()
  })

  it('throws an error on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse('Incomplete', false, 400))
    await expect(api.completeChunkedUpload('up_abc')).rejects.toThrow('Upload complete failed (400)')
  })
})

describe('deleteJobs', () => {
  it('POSTs to /api/v1/history/delete with correct JSON body', async () => {
    const result = { deleted: ['job_1', 'job_2'], not_found: [] }
    global.fetch = vi.fn().mockResolvedValue(makeResponse(result))

    const data = await api.deleteJobs(['job_1', 'job_2'])

    expect(global.fetch).toHaveBeenCalledOnce()
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.example.com/api/v1/history/delete')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body.google_token).toBe('test-token')
    expect(body.folder_names).toEqual(['job_1', 'job_2'])
    expect(data).toEqual(result)
  })

  it('sends a single folder name correctly', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse({ deleted: ['job_1'], not_found: [] }))
    await api.deleteJobs(['job_1'])
    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.folder_names).toEqual(['job_1'])
  })

  it('throws an error on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse('Forbidden', false, 403))
    await expect(api.deleteJobs(['job_1'])).rejects.toThrow('Delete failed (403)')
  })
})

describe('retranscribeJob', () => {
  it('POSTs to /api/v1/retranscribe with correct JSON body', async () => {
    const result = { message: 'Re-transcription complete', folder_name: 'job_1', file_name: 'audio', transcript: 'Hello world' }
    global.fetch = vi.fn().mockResolvedValue(makeResponse(result))

    const data = await api.retranscribeJob('job_1', 'audio', 'en')

    expect(global.fetch).toHaveBeenCalledOnce()
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.example.com/api/v1/retranscribe')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body.google_token).toBe('test-token')
    expect(body.folder_name).toBe('job_1')
    expect(body.file_name).toBe('audio')
    expect(body.transcribe_lang).toBe('en')
    expect(data).toEqual(result)
  })

  it('omits transcribe_lang when not provided', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse({ folder_name: 'job_1' }))
    await api.retranscribeJob('job_1', 'audio')
    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.transcribe_lang).toBeUndefined()
  })

  it('throws an error on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse('Not found', false, 404))
    await expect(api.retranscribeJob('job_1', 'audio')).rejects.toThrow('Re-transcription failed (404)')
  })
})

describe('translateJob', () => {
  it('POSTs to /api/v1/translate with correct JSON body', async () => {
    const result = { message: 'Translation complete', folder_name: 'job_1', files: {} }
    global.fetch = vi.fn().mockResolvedValue(makeResponse(result))

    const data = await api.translateJob('job_1', 'audio', 'Indonesian', 'English', ['json', 'txt'])

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.example.com/api/v1/translate')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body.google_token).toBe('test-token')
    expect(body.folder_name).toBe('job_1')
    expect(body.file_name).toBe('audio')
    expect(body.source_language).toBe('Indonesian')
    expect(body.target_language).toBe('English')
    expect(body.files).toEqual(['json', 'txt'])
    expect(data).toEqual(result)
  })

  it('omits files when not provided', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse({ message: 'ok' }))
    await api.translateJob('job_1', 'audio', 'id', 'en')
    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.files).toBeUndefined()
  })

  it('throws an error on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse('Bad language', false, 400))
    await expect(api.translateJob('job_1', 'audio', 'id', 'en')).rejects.toThrow('Translation failed (400)')
  })
})

describe('saveTranscript', () => {
  it('POSTs to /api/v1/transcript/save with transcript_data', async () => {
    const result = { message: 'Transcript saved', segment_count: 2 }
    global.fetch = vi.fn().mockResolvedValue(makeResponse(result))
    const transcriptData = [
      { speaker: 0, start: 0, end: 2, text: 'hello' },
      { speaker: 1, start: 2, end: 4, text: 'world' }
    ]

    const data = await api.saveTranscript('job_1', 'audio', transcriptData)

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.example.com/api/v1/transcript/save')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body.google_token).toBe('test-token')
    expect(body.folder_name).toBe('job_1')
    expect(body.file_name).toBe('audio')
    expect(body.transcript_data).toEqual(transcriptData)
    expect(data).toEqual(result)
  })

  it('sends empty array when transcriptData is not an array', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse({ message: 'ok' }))
    await api.saveTranscript('job_1', 'audio', null)
    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.transcript_data).toEqual([])
  })

  it('throws an error on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse('Bad request', false, 400))
    await expect(api.saveTranscript('job_1', 'audio', [])).rejects.toThrow('Transcript save failed (400)')
  })
})

describe('generateFlashcards', () => {
  it('POSTs to /api/v1/flashcards with correct JSON body', async () => {
    const result = { message: 'Flashcards generated', file_name: 'audio', flashcards: [{ front: 'Q1', back: 'A1', type: 'qa', timestamp: '00:01:00' }] }
    global.fetch = vi.fn().mockResolvedValue(makeResponse(result))

    const data = await api.generateFlashcards('job_1', 'audio', 5)

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.example.com/api/v1/flashcards')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body.google_token).toBe('test-token')
    expect(body.folder_name).toBe('job_1')
    expect(body.file_name).toBe('audio')
    expect(body.count).toBe(5)
    expect(body.provider).toBe('ollama')
    expect(data).toEqual(result)
  })

  it('defaults count to 10 when not provided', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse({ flashcards: [] }))
    await api.generateFlashcards('job_1', 'audio')
    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.count).toBe(10)
  })

  it('omits model and api_key when they are empty strings', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse({ flashcards: [] }))
    await api.generateFlashcards('job_1', 'audio')
    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.model).toBeUndefined()
    expect(body.api_key).toBeUndefined()
  })

  it('throws an error on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse('Not found', false, 404))
    await expect(api.generateFlashcards('job_1', 'audio')).rejects.toThrow('Flashcards generation failed (404)')
  })
})

describe('sendChatMessage', () => {
  it('POSTs to /api/v1/chat with correct JSON body', async () => {
    const result = { question: 'What is discussed?', answer: 'They discussed X.' }
    global.fetch = vi.fn().mockResolvedValue(makeResponse(result))

    const history = [{ role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Hi!' }]
    const data = await api.sendChatMessage('job_1', 'audio', 'What is discussed?', history)

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.example.com/api/v1/chat')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body.google_token).toBe('test-token')
    expect(body.folder_name).toBe('job_1')
    expect(body.file_name).toBe('audio')
    expect(body.question).toBe('What is discussed?')
    expect(body.history).toEqual(history)
    expect(data).toEqual(result)
  })

  it('omits history when empty', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse({ question: 'q', answer: 'a' }))
    await api.sendChatMessage('job_1', 'audio', 'q')
    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.history).toBeUndefined()
  })

  it('omits model and api_key when they are empty strings', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse({ question: 'q', answer: 'a' }))
    await api.sendChatMessage('job_1', 'audio', 'q')
    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.model).toBeUndefined()
    expect(body.api_key).toBeUndefined()
  })

  it('throws an error on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse('Server error', false, 500))
    await expect(api.sendChatMessage('job_1', 'audio', 'q')).rejects.toThrow('Chat failed (500)')
  })
})
