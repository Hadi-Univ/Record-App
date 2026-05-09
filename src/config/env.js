const normalizeBaseUrl = (value) => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

export const env = Object.freeze({
  apiBaseUrl: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || ''),
  googleClientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim(),
  siteUrl: normalizeBaseUrl(import.meta.env.VITE_SITE_URL || '')
})

export { normalizeBaseUrl }
