import { useAppStore } from '../stores/appStore'
import { requestJson } from './httpClient'
import { env } from '../config/env'

/**
 * Returns true when running inside a Capacitor native app (Android / iOS).
 * Falls back to false in a regular browser.
 */
export function isCapacitorNative() {
  return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true
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
 * Log in with email and password.
 * Expects the backend to return `{ token, user? }` or `{ access_token, user? }`.
 */
export async function loginBasic(email, password) {
  const store = useAppStore()
  const url = `${store.getBaseUrl()}/api/v1/auth/login`
  const data = await requestJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
    timeoutMs: 15000
  })

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
