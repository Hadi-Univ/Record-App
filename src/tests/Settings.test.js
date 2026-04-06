import { describe, it, expect } from 'vitest'

// ---------- modelPlaceholder logic extracted from Settings.vue ----------

function modelPlaceholder(provider) {
  const map = {
    ollama: 'e.g. llama3',
    openai: 'e.g. gpt-4o',
    claude: 'e.g. claude-3-5-sonnet-20241022',
    gemini: 'e.g. gemini-1.5-pro',
    groq: 'e.g. llama-3.1-70b-versatile'
  }
  return map[provider] || 'Model name'
}

describe('Settings – modelPlaceholder()', () => {
  it('returns ollama placeholder for "ollama"', () => {
    expect(modelPlaceholder('ollama')).toBe('e.g. llama3')
  })

  it('returns openai placeholder for "openai"', () => {
    expect(modelPlaceholder('openai')).toBe('e.g. gpt-4o')
  })

  it('returns claude placeholder for "claude"', () => {
    expect(modelPlaceholder('claude')).toBe('e.g. claude-3-5-sonnet-20241022')
  })

  it('returns gemini placeholder for "gemini"', () => {
    expect(modelPlaceholder('gemini')).toBe('e.g. gemini-1.5-pro')
  })

  it('returns groq placeholder for "groq"', () => {
    expect(modelPlaceholder('groq')).toBe('e.g. llama-3.1-70b-versatile')
  })

  it('returns generic fallback for unknown provider', () => {
    expect(modelPlaceholder('unknown')).toBe('Model name')
    expect(modelPlaceholder('')).toBe('Model name')
    expect(modelPlaceholder(undefined)).toBe('Model name')
  })
})

// ---------- testConnection logic extracted from Settings.vue ----------

async function testConnection(baseUrl, fetchFn = fetch) {
  try {
    const response = await fetchFn(`${baseUrl}/api/v1/health`, {
      signal: AbortSignal.timeout(5000)
    })
    if (response.ok) {
      return { ok: true, message: 'Connected successfully!' }
    }
    return { ok: false, message: `Server responded with status ${response.status}` }
  } catch (err) {
    return { ok: false, message: `Could not reach server: ${err.message}` }
  }
}

describe('Settings – testConnection()', () => {
  it('returns ok:true with success message when server responds 200', async () => {
    const mockFetch = () => Promise.resolve({ ok: true, status: 200 })
    const result = await testConnection('https://api.example.com', mockFetch)
    expect(result).toEqual({ ok: true, message: 'Connected successfully!' })
  })

  it('returns ok:false with status message when server responds non-2xx', async () => {
    const mockFetch = () => Promise.resolve({ ok: false, status: 503 })
    const result = await testConnection('https://api.example.com', mockFetch)
    expect(result).toEqual({ ok: false, message: 'Server responded with status 503' })
  })

  it('returns ok:false with error message when fetch throws', async () => {
    const mockFetch = () => Promise.reject(new Error('Network error'))
    const result = await testConnection('https://api.example.com', mockFetch)
    expect(result.ok).toBe(false)
    expect(result.message).toContain('Could not reach server')
    expect(result.message).toContain('Network error')
  })

  it('calls the correct health-check URL', async () => {
    let calledUrl
    const mockFetch = (url) => {
      calledUrl = url
      return Promise.resolve({ ok: true, status: 200 })
    }
    await testConnection('https://api.example.com', mockFetch)
    expect(calledUrl).toBe('https://api.example.com/api/v1/health')
  })
})
