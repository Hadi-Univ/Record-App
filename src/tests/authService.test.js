import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// isCapacitorNative
// ---------------------------------------------------------------------------
describe('isCapacitorNative()', () => {
  afterEach(() => {
    delete window.Capacitor
  })

  it('returns false when window.Capacitor is absent', async () => {
    vi.resetModules()
    const { isCapacitorNative } = await import('../services/authService.js')
    expect(isCapacitorNative()).toBe(false)
  })

  it('returns true when Capacitor.isNativePlatform() returns true', async () => {
    window.Capacitor = { isNativePlatform: () => true }
    vi.resetModules()
    const { isCapacitorNative } = await import('../services/authService.js')
    expect(isCapacitorNative()).toBe(true)
  })

  it('returns false when Capacitor.isNativePlatform() returns false', async () => {
    window.Capacitor = { isNativePlatform: () => false }
    vi.resetModules()
    const { isCapacitorNative } = await import('../services/authService.js')
    expect(isCapacitorNative()).toBe(false)
  })
})

describe('isNativeOffline()', () => {
  afterEach(() => {
    delete window.Capacitor
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true })
  })

  it('returns true for native app when navigator is offline', async () => {
    window.Capacitor = { isNativePlatform: () => true }
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true })
    vi.resetModules()
    const { isNativeOffline } = await import('../services/authService.js')
    expect(isNativeOffline()).toBe(true)
  })

  it('returns false for web even if navigator is offline', async () => {
    window.Capacitor = { isNativePlatform: () => false }
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true })
    vi.resetModules()
    const { isNativeOffline } = await import('../services/authService.js')
    expect(isNativeOffline()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Helpers shared across basic-auth tests
// ---------------------------------------------------------------------------

function mockFetch(status, body) {
  const isJson = typeof body === 'object'
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (isJson ? JSON.stringify(body) : body),
    json: async () => (isJson ? body : JSON.parse(body))
  })
}

function makeResponse(status, body) {
  const isJson = typeof body === 'object'
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (isJson ? JSON.stringify(body) : body),
    json: async () => (isJson ? body : JSON.parse(body))
  }
}

async function freshStore() {
  localStorage.removeItem('audio_pipeline_state_v3')
  vi.resetModules()
  const mod = await import('../stores/appStore.js')
  return mod.useAppStore()
}

// ---------------------------------------------------------------------------
// loginBasic
// ---------------------------------------------------------------------------
describe('loginBasic()', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('sets token, user and authMethod on success', async () => {
    mockFetch(200, {
      token: 'jwt-abc',
      user: { name: 'Alice', email: 'alice@example.com', picture: 'https://pic' }
    })

    const store = await freshStore()
    const { loginBasic } = await import('../services/authService.js')
    await loginBasic('alice@example.com', 'pass123')

    expect(store.state.token).toBe('jwt-abc')
    expect(store.state.user.name).toBe('Alice')
    expect(store.state.user.email).toBe('alice@example.com')
    expect(store.state.authMethod).toBe('basic')
  })

  it('accepts access_token field as well', async () => {
    mockFetch(200, { access_token: 'tok-xyz', email: 'bob@example.com' })
    const store = await freshStore()
    const { loginBasic } = await import('../services/authService.js')
    await loginBasic('bob@example.com', 'pass')
    expect(store.state.token).toBe('tok-xyz')
    expect(store.state.authMethod).toBe('basic')
  })

  it('throws on non-ok response with JSON detail', async () => {
    mockFetch(401, { detail: 'Invalid credentials' })
    await freshStore()
    const { loginBasic } = await import('../services/authService.js')
    await expect(loginBasic('x@y.com', 'wrong')).rejects.toThrow('Invalid credentials')
  })

  it('throws on non-ok response with plain text', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error'
    })
    await freshStore()
    const { loginBasic } = await import('../services/authService.js')
    await expect(loginBasic('x@y.com', 'p')).rejects.toThrow('Internal Server Error')
  })
})

// ---------------------------------------------------------------------------
// loginWithApiToken
// ---------------------------------------------------------------------------
describe('loginWithApiToken()', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('sets token, user and authMethod for API token sign-in', async () => {
    const store = await freshStore()
    const { loginWithApiToken } = await import('../services/authService.js')

    loginWithApiToken('my-api-token', 'Personal API', 'me@example.com')

    expect(store.state.token).toBe('my-api-token')
    expect(store.state.user).toEqual({
      name: 'Personal API',
      email: 'me@example.com',
      picture: ''
    })
    expect(store.state.authMethod).toBe('api')
  })

  it('trims token and falls back to default name when blank', async () => {
    const store = await freshStore()
    const { loginWithApiToken } = await import('../services/authService.js')

    loginWithApiToken('  my-api-token  ', '   ', '  ')

    expect(store.state.token).toBe('my-api-token')
    expect(store.state.user.name).toBe('API User')
    expect(store.state.user.email).toBe('')
    expect(store.state.authMethod).toBe('api')
  })

  it('throws when token is empty', async () => {
    await freshStore()
    const { loginWithApiToken } = await import('../services/authService.js')

    expect(() => loginWithApiToken('   ')).toThrow('API token is required.')
  })
})

// ---------------------------------------------------------------------------
// registerBasic
// ---------------------------------------------------------------------------
describe('registerBasic()', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('sets store state when backend returns a token', async () => {
    mockFetch(201, {
      token: 'new-tok',
      user: { name: 'Carol', email: 'carol@example.com', picture: '' }
    })
    const store = await freshStore()
    const { registerBasic } = await import('../services/authService.js')
    const data = await registerBasic('Carol', 'carol@example.com', 'securepass')

    expect(data.token).toBe('new-tok')
    expect(store.state.token).toBe('new-tok')
    expect(store.state.user.name).toBe('Carol')
    expect(store.state.authMethod).toBe('basic')
  })

  it('does NOT set store state when backend returns no token', async () => {
    mockFetch(201, { message: 'Please verify your email' })
    const store = await freshStore()
    const { registerBasic } = await import('../services/authService.js')
    await registerBasic('Dave', 'dave@example.com', 'pass')

    expect(store.state.token).toBe('')
    expect(store.state.authMethod).toBe('')
  })

  it('throws on non-ok response', async () => {
    mockFetch(409, { detail: 'Email already registered' })
    await freshStore()
    const { registerBasic } = await import('../services/authService.js')
    await expect(registerBasic('X', 'dup@example.com', 'pass')).rejects.toThrow('Email already registered')
  })
})

// ---------------------------------------------------------------------------
// forgotPassword
// ---------------------------------------------------------------------------
describe('forgotPassword()', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('resolves on 200', async () => {
    mockFetch(200, {})
    await freshStore()
    const { forgotPassword } = await import('../services/authService.js')
    await expect(forgotPassword('user@example.com')).resolves.toBeUndefined()
  })

  it('throws on non-ok response', async () => {
    mockFetch(422, { detail: 'Invalid email' })
    await freshStore()
    const { forgotPassword } = await import('../services/authService.js')
    await expect(forgotPassword('bad')).rejects.toThrow('Invalid email')
  })
})

// ---------------------------------------------------------------------------
// resetPassword
// ---------------------------------------------------------------------------
describe('resetPassword()', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('resolves on 200', async () => {
    mockFetch(200, {})
    await freshStore()
    const { resetPassword } = await import('../services/authService.js')
    await expect(resetPassword('reset-tok', 'newpass123')).resolves.toBeUndefined()
  })

  it('sends token and new_password in request body', async () => {
    mockFetch(200, {})
    await freshStore()
    const { resetPassword } = await import('../services/authService.js')
    await resetPassword('tok123', 'myNewPass')
    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.token).toBe('tok123')
    expect(body.new_password).toBe('myNewPass')
  })

  it('throws on expired token error', async () => {
    mockFetch(400, { detail: 'Token expired' })
    await freshStore()
    const { resetPassword } = await import('../services/authService.js')
    await expect(resetPassword('old-tok', 'pass')).rejects.toThrow('Token expired')
  })
})

// ---------------------------------------------------------------------------
// changePassword
// ---------------------------------------------------------------------------
describe('changePassword()', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('resolves on 200', async () => {
    mockFetch(200, {})
    const store = await freshStore()
    store.state.token = 'auth-tok'
    const { changePassword } = await import('../services/authService.js')
    await expect(changePassword('oldPass', 'newPass')).resolves.toBeUndefined()
  })

  it('sends Authorization header with Bearer token', async () => {
    mockFetch(200, {})
    const store = await freshStore()
    store.state.token = 'my-jwt'
    const { changePassword } = await import('../services/authService.js')
    await changePassword('old', 'new')
    const headers = global.fetch.mock.calls[0][1].headers
    expect(headers.Authorization).toBe('Bearer my-jwt')
  })

  it('sends current_password and new_password in body', async () => {
    mockFetch(200, {})
    const store = await freshStore()
    store.state.token = 'tok'
    const { changePassword } = await import('../services/authService.js')
    await changePassword('oldPass', 'newPass')
    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.current_password).toBe('oldPass')
    expect(body.new_password).toBe('newPass')
  })

  it('throws on wrong current password', async () => {
    mockFetch(403, { detail: 'Current password is incorrect' })
    const store = await freshStore()
    store.state.token = 'tok'
    const { changePassword } = await import('../services/authService.js')
    await expect(changePassword('wrong', 'new')).rejects.toThrow('Current password is incorrect')
  })
})

// ---------------------------------------------------------------------------
// validateRuntimeCapabilities
// ---------------------------------------------------------------------------
describe('validateRuntimeCapabilities()', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('logs out automatically on 401 invalid token', async () => {
    mockFetch(401, { detail: 'Invalid or expired token.' })
    const store = await freshStore()
    store.state.token = 'bad-token'
    store.state.user = { name: 'User', email: 'user@example.com', picture: '' }
    store.state.authMethod = 'api'

    const { validateRuntimeCapabilities } = await import('../services/authService.js')
    await expect(validateRuntimeCapabilities()).rejects.toThrow('Invalid or expired token.')

    expect(store.state.token).toBe('')
    expect(store.state.user).toBeNull()
    expect(store.state.authMethod).toBe('')
  })
})

// ---------------------------------------------------------------------------
// waitForRuntimeCapabilities
// ---------------------------------------------------------------------------
describe('waitForRuntimeCapabilities()', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('retries while backend is not ready and resolves when ready', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(makeResponse(200, { ready: false, checks: [{ ok: false, message: 'warming up' }] }))
      .mockResolvedValueOnce(makeResponse(200, { ready: true, checks: [] }))

    await freshStore()
    const { waitForRuntimeCapabilities } = await import('../services/authService.js')
    const payload = await waitForRuntimeCapabilities({ maxAttempts: 5, intervalMs: 0 })

    expect(payload.ready).toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('does not retry on authentication errors', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse(401, { detail: 'Invalid or expired token.' }))
    const store = await freshStore()
    store.state.token = 'bad-token'
    store.state.user = { name: 'User', email: 'user@example.com', picture: '' }
    store.state.authMethod = 'api'

    const { waitForRuntimeCapabilities } = await import('../services/authService.js')
    await expect(waitForRuntimeCapabilities({ maxAttempts: 5, intervalMs: 0 })).rejects.toThrow('Invalid or expired token.')

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(store.state.token).toBe('')
  })
})
