import { describe, it, expect } from 'vitest'

// ---------- handleCredentialResponse logic extracted from Login.vue ----------

// The function sets state.token and state.user from a Google JWT credential,
// then navigates to '/'. We test the pure credential-parsing logic.

function parseCredential(credential) {
  const parts = credential.split('.')
  if (parts.length !== 3) return null
  const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
  return {
    name: payload.name || payload.email || 'User',
    email: payload.email || '',
    picture: payload.picture || ''
  }
}

function buildFakeJwt(payloadObj) {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify(payloadObj))
  return `${header}.${payload}.fakesig`
}

describe('Login – credential parsing', () => {
  it('extracts name, email, and picture from valid JWT payload', () => {
    const jwt = buildFakeJwt({
      name: 'Alice Smith',
      email: 'alice@example.com',
      picture: 'https://example.com/pic.jpg'
    })
    const user = parseCredential(jwt)
    expect(user.name).toBe('Alice Smith')
    expect(user.email).toBe('alice@example.com')
    expect(user.picture).toBe('https://example.com/pic.jpg')
  })

  it('falls back to email when name is missing', () => {
    const jwt = buildFakeJwt({ email: 'bob@example.com' })
    const user = parseCredential(jwt)
    expect(user.name).toBe('bob@example.com')
    expect(user.email).toBe('bob@example.com')
  })

  it('falls back to "User" when both name and email are missing', () => {
    const jwt = buildFakeJwt({ sub: '12345' })
    const user = parseCredential(jwt)
    expect(user.name).toBe('User')
    expect(user.email).toBe('')
  })

  it('sets picture to empty string when missing from payload', () => {
    const jwt = buildFakeJwt({ name: 'Carol', email: 'carol@example.com' })
    const user = parseCredential(jwt)
    expect(user.picture).toBe('')
  })

  it('returns null for a credential that is not a valid JWT format', () => {
    expect(parseCredential('notajwt')).toBeNull()
    expect(parseCredential('only.two')).toBeNull()
  })

  it('handles URL-safe base64 characters in payload', () => {
    // Build a payload that contains characters replaced in URL-safe base64
    const payloadObj = { name: 'Test User', email: 'test@example.com', picture: '' }
    const payloadStr = JSON.stringify(payloadObj)
    // Convert to standard base64 then replace + with - and / with _ to simulate URL-safe encoding
    const urlSafePayload = btoa(payloadStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const header = btoa('{}')
    const jwt = `${header}.${urlSafePayload}.sig`
    const user = parseCredential(jwt)
    expect(user.name).toBe('Test User')
    expect(user.email).toBe('test@example.com')
  })
})
