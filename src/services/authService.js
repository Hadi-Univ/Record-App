import { useAppStore } from '../stores/appStore'
import { requestJson } from './httpClient'
import { env } from '../config/env'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Returns true when running inside a Capacitor native app (Android / iOS).
 * Falls back to false in a regular browser.
 */
export function isCapacitorNative() {
  return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true
}

/**
 * Returns true when running inside a native app and the device is currently offline.
 */
export function isNativeOffline() {
  return isCapacitorNative() && typeof navigator !== 'undefined' && navigator.onLine === false
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
  const GOOGLE_CLIENT_ID = env.googleClientId

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
 * Log in with email/username and password.
 * Expects the backend to return `{ token, user? }` or `{ access_token, user? }`.
 */
export async function loginBasic(identifier, password) {
  const store = useAppStore()
  const url = `${store.getBaseUrl()}/api/v1/auth/login`
  const cleanIdentifier = (identifier || '').trim()
  const data = await requestJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ identifier: cleanIdentifier, password }),
    timeoutMs: 15000
  })

  store.state.token = data.token || data.access_token || ''
  store.state.refreshToken = data.refresh_token || ''
  store.state.tokenExpiresAt = data.expires_in ? Date.now() + data.expires_in * 1000 : 0
  store.state.user = {
    name: data.user?.name || data.name || cleanIdentifier,
    email: data.user?.email || data.email || '',
    username: data.user?.username || data.username || '',
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
  const data = await requestJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ name, email, password }),
    timeoutMs: 15000
  })

  const token = data.token || data.access_token
  if (token) {
    store.state.token = token
    store.state.refreshToken = data.refresh_token || ''
    store.state.tokenExpiresAt = data.expires_in ? Date.now() + data.expires_in * 1000 : 0
    store.state.user = {
      name: data.user?.name || name,
      email: data.user?.email || email,
      username: data.user?.username || data.username || '',
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
  await requestJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email }),
    timeoutMs: 15000
  })
}

/**
 * Complete a password reset using the token from the reset email.
 */
export async function resetPassword(token, newPassword) {
  const store = useAppStore()
  const url = `${store.getBaseUrl()}/api/v1/auth/reset-password`
  await requestJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ token, new_password: newPassword }),
    timeoutMs: 15000
  })
}

/**
 * Change the password for the currently authenticated user.
 * Requires `state.token` to be set (basic-auth users only).
 */
export async function changePassword(currentPassword, newPassword) {
  const store = useAppStore()
  const url = `${store.getBaseUrl()}/api/v1/auth/change-password`
  await requestJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${store.state.token}`
    },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    timeoutMs: 15000
  })
}

export async function deleteAccount(password) {
  const store = useAppStore()
  const url = `${store.getBaseUrl()}/api/v1/auth/delete-account`
  await requestJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${store.state.token}`
    },
    body: JSON.stringify({ password }),
    timeoutMs: 15000
  })
}

/**
 * Update profile fields for the currently authenticated basic-auth user.
 * Supports email and username updates.
 */
export async function updateBasicProfile({ email, username }) {
  const store = useAppStore()
  const url = `${store.getBaseUrl()}/api/v1/auth/profile`
  const data = await requestJson(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${store.state.token}`
    },
    body: JSON.stringify({ email, username }),
    timeoutMs: 15000
  })

  store.state.user = {
    ...(store.state.user || {}),
    name: data.user?.name || store.state.user?.name || '',
    email: data.user?.email || email || store.state.user?.email || '',
    username: data.user?.username || username || store.state.user?.username || '',
    picture: data.user?.picture || store.state.user?.picture || ''
  }
  return data
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
  const data = await requestJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refresh_token: store.state.refreshToken }),
    timeoutMs: 15000
  })

  const newToken = data.token || data.access_token
  if (!newToken) {
    throw new Error('Refresh response did not contain a new access token.')
  }
  store.state.token = newToken
  store.state.refreshToken = data.refresh_token || ''
  store.state.tokenExpiresAt = data.expires_in ? Date.now() + data.expires_in * 1000 : 0
}

export async function validateRuntimeCapabilities() {
  const store = useAppStore()
  const url = `${store.getBaseUrl()}/api/v1/capabilities/validate`
  let data
  try {
    data = await requestJson(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: store.state.token ? `Bearer ${store.state.token}` : undefined
      },
      timeoutMs: 10000
    })
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      store.logout()
      store.state.capabilities.error = error?.message || 'Authentication failed. Please sign in again.'
    }
    throw error
  }
  store.state.capabilities.ready = Boolean(data?.ready)
  store.state.capabilities.checkedAt = Date.now()
  store.state.capabilities.error = data?.ready ? '' : (data?.checks || []).filter(c => !c.ok).map(c => c.message).join(' ')
  store.state.capabilities.checks = Array.isArray(data?.checks) ? data.checks : []
  store.state.capabilities.deviceProfile = data?.device_profile || null
  if (data?.processing_lock) {
    store.state.processingLock = {
      locked: Boolean(data.processing_lock.locked),
      job_type: data.processing_lock.job_type || null
    }
  }
  return data
}

export async function waitForRuntimeCapabilities({
  maxAttempts = 20,
  intervalMs = 1500,
  onAttempt = null
} = {}) {
  let lastPayload = null
  let lastError = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (typeof onAttempt === 'function') {
      onAttempt({ attempt, maxAttempts })
    }

    try {
      const payload = await validateRuntimeCapabilities()
      lastPayload = payload
      if (payload?.ready) {
        return payload
      }
    } catch (error) {
      lastError = error
      if (error?.status === 401 || error?.status === 403) {
        throw error
      }
    }

    if (attempt < maxAttempts) {
      await sleep(intervalMs)
    }
  }

  if (lastPayload) {
    return lastPayload
  }
  if (lastError) {
    throw lastError
  }
  return { ready: false }
}
