const SECURITY_MESSAGE = 'Potential unsafe prompt detected. Your request was blocked for security reasons.'

const SECURITY_TEXT_PATTERN = /(prompt injection|unsafe instruction|jailbreak|unsafe prompt|request was blocked)/i

export function isSecurityPayload(payload) {
  if (!payload || typeof payload !== 'object') return false
  const detail = payload.detail
  const error = payload.error
  const type = String(error?.type || detail?.error?.type || detail?.type || '').toLowerCase()
  const message = String(error?.message || detail?.error?.message || detail?.message || detail || payload.message || '').toLowerCase()
  return type.includes('prompt_injection') || SECURITY_TEXT_PATTERN.test(message)
}

export function normalizeApiError({ payload = null, status = 0, fallback = 'Request failed', originalMessage = '' } = {}) {
  if (isSecurityPayload(payload)) {
    return {
      kind: 'security',
      status,
      message: SECURITY_MESSAGE,
      safe: true,
    }
  }
  if (status === 0 && /timed out/i.test(originalMessage || '')) {
    return { kind: 'timeout', status, message: 'Request timed out.', safe: true }
  }
  if (status === 0 && /cancelled|aborted|aborterror/i.test(originalMessage || '')) {
    return { kind: 'cancelled', status, message: 'Request was cancelled.', safe: true }
  }
  const message = typeof payload === 'string'
    ? payload
    : (payload?.detail || payload?.message || payload?.error || fallback)
  return {
    kind: 'generic',
    status,
    message: String(message || fallback),
    safe: false,
  }
}

export const getSecurityMessage = () => SECURITY_MESSAGE
