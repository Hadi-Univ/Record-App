import { useAppStore } from '../stores/appStore'

/**
 * Returns true when running inside a Capacitor native app (Android / iOS).
 * Falls back to false in a regular browser.
 */
export function isCapacitorNative() {
  return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true
}

/**
 * Parse the error body from a failed fetch response.
 * Handles both JSON (`{ detail, message, error }`) and plain-text bodies.
 */
async function parseErrorBody(response) {
  const text = await response.text()
  try {
    const json = JSON.parse(text)
    return json.detail || json.message || json.error || text
  } catch {
    return text || `Request failed (${response.status})`
  }
}

// ---------------------------------------------------------------------------
// Google OAuth – native Capacitor path
// ---------------------------------------------------------------------------

/**
 * Sign in with Google using the native Capacitor plugin.
 * Should only be called when `isCapacitorNative()` is true.
 * Stores the ID token and user info in the app store.
 */
export async function signInWithGoogleNative() {
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

  const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth').catch(() => {
    throw new Error(
      'Google Sign-In is not available. Please ensure the Capacitor plugin is properly installed.'
    )
  })

  await GoogleAuth.initialize({
    clientId: GOOGLE_CLIENT_ID,
    scopes: ['profile', 'email'],
    grantOfflineAccess: false
  })

  const result = await GoogleAuth.signIn()

  const store = useAppStore()
  store.state.token = result.authentication.idToken
  store.state.user = {
    name: result.name || result.email || 'User',
    email: result.email || '',
    picture: result.imageUrl || ''
  }
  store.state.authMethod = 'oauth'
}

// ---------------------------------------------------------------------------
// Basic auth – email / password
// ---------------------------------------------------------------------------

/**
 * Log in with email and password.
 * Expects the backend to return `{ token, user? }` or `{ access_token, user? }`.
 */
export async function loginBasic(email, password) {
  const store = useAppStore()
  const url = `${store.getBaseUrl()}/api/v1/auth/login`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  if (!response.ok) {
    throw new Error(await parseErrorBody(response))
  }

  const data = await response.json()
  store.state.token = data.token || data.access_token || ''
  store.state.refreshToken = data.refresh_token || ''
  store.state.tokenExpiresAt = data.expires_in ? Date.now() + data.expires_in * 1000 : 0
  store.state.user = {
    name: data.user?.name || data.name || email,
    email: data.user?.email || data.email || email,
    picture: data.user?.picture || data.picture || ''
  }
  store.state.authMethod = 'basic'
}

/**
 * Log in by directly providing an API token.
 * Intended for personal/self-hosted usage where token issuance is managed externally.
 * API tokens have no expiry tracked client-side.
 */
export function loginWithApiToken(token, name = 'API User', email = '') {
  const store = useAppStore()
  const trimmedToken = (token || '').trim()
  if (!trimmedToken) {
    throw new Error('API token is required.')
  }

  store.state.token = trimmedToken
  store.state.refreshToken = ''
  store.state.tokenExpiresAt = 0
  store.state.user = {
    name: (name || '').trim() || 'API User',
    email: (email || '').trim(),
    picture: ''
  }
  store.state.authMethod = 'api'
}

/**
 * Register a new account with name, email and password.
 * If the backend returns a token the user is automatically logged in.
 */
export async function registerBasic(name, email, password) {
  const store = useAppStore()
  const url = `${store.getBaseUrl()}/api/v1/auth/register`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  })

  if (!response.ok) {
    throw new Error(await parseErrorBody(response))
  }

  const data = await response.json()
  const token = data.token || data.access_token
  if (token) {
    store.state.token = token
    store.state.refreshToken = data.refresh_token || ''
    store.state.tokenExpiresAt = data.expires_in ? Date.now() + data.expires_in * 1000 : 0
    store.state.user = {
      name: data.user?.name || name,
      email: data.user?.email || email,
      picture: data.user?.picture || ''
    }
    store.state.authMethod = 'basic'
  }
  return data
}

/**
 * Request a password-reset email for the given address.
 */
export async function forgotPassword(email) {
  const store = useAppStore()
  const url = `${store.getBaseUrl()}/api/v1/auth/forgot-password`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })

  if (!response.ok) {
    throw new Error(await parseErrorBody(response))
  }
}

/**
 * Complete a password reset using the token from the reset email.
 */
export async function resetPassword(token, newPassword) {
  const store = useAppStore()
  const url = `${store.getBaseUrl()}/api/v1/auth/reset-password`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, new_password: newPassword })
  })

  if (!response.ok) {
    throw new Error(await parseErrorBody(response))
  }
}

/**
 * Change the password for the currently authenticated user.
 * Requires `state.token` to be set (basic-auth users only).
 */
export async function changePassword(currentPassword, newPassword) {
  const store = useAppStore()
  const url = `${store.getBaseUrl()}/api/v1/auth/change-password`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${store.state.token}`
    },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
  })

  if (!response.ok) {
    throw new Error(await parseErrorBody(response))
  }
}

/**
 * Silently exchange the stored refresh token for a fresh access token + refresh token.
 * Updates the store on success.  Throws on network error or invalid refresh token.
 * Should only be called for `authMethod === 'basic'` sessions.
 */
export async function refreshAccessToken() {
  const store = useAppStore()
  if (!store.state.refreshToken) {
    throw new Error('No refresh token available.')
  }

  const url = `${store.getBaseUrl()}/api/v1/auth/refresh`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: store.state.refreshToken })
  })

  if (!response.ok) {
    throw new Error(await parseErrorBody(response))
  }

  const data = await response.json()
  const newToken = data.token || data.access_token
  if (!newToken) {
    throw new Error('Refresh response did not contain a new access token.')
  }
  store.state.token = newToken
  store.state.refreshToken = data.refresh_token || ''
  store.state.tokenExpiresAt = data.expires_in ? Date.now() + data.expires_in * 1000 : 0
}
