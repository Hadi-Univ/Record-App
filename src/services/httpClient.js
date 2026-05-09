const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504])
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const parseResponseBody = async (response) => {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

const toErrorMessage = (payload, fallback) => {
  if (typeof payload === 'string' && payload.trim()) return payload
  if (payload && typeof payload === 'object') {
    return payload.detail || payload.message || payload.error || fallback
  }
  return fallback
}

export class HttpError extends Error {
  constructor(message, { status = 0, method = 'GET', url = '', payload = null } = {}) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.method = method
    this.url = url
    this.payload = payload
  }
}

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return null
  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort(new DOMException(`Request timed out after ${timeoutMs}ms`, 'TimeoutError'))
  }, timeoutMs)
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer)
  }
}

const mergeSignals = (...signals) => {
  const active = signals.filter(Boolean)
  if (!active.length) return null
  const controller = new AbortController()

  const onAbort = (event) => {
    const reason = event?.target?.reason
    controller.abort(reason || new DOMException('Request aborted', 'AbortError'))
  }

  for (const signal of active) {
    if (signal.aborted) {
      controller.abort(signal.reason || new DOMException('Request aborted', 'AbortError'))
      break
    }
    signal.addEventListener('abort', onAbort, { once: true })
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      for (const signal of active) {
        signal.removeEventListener('abort', onAbort)
      }
    }
  }
}

const shouldRetry = ({ attempt, retries, method, error, retryableStatusCodes }) => {
  if (attempt >= retries) return false
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') return false

  const isIdempotent = IDEMPOTENT_METHODS.has(method)
  if (!isIdempotent) return false

  if (!(error instanceof HttpError)) return true
  return retryableStatusCodes.has(error.status)
}

export async function requestRaw(url, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    signal,
    timeoutMs = 15000,
    retries = 0,
    retryDelayMs = 350,
    errorLabel = '',
    retryableStatusCodes = RETRYABLE_STATUS_CODES
  } = options

  const upperMethod = method.toUpperCase()
  let attempt = 0

  while (true) {
    const timeout = createTimeoutSignal(timeoutMs)
    const merged = mergeSignals(signal, timeout?.signal)
    const requestSignal = merged?.signal || signal || timeout?.signal

    try {
      const response = await fetch(url, {
        method: upperMethod,
        headers,
        body,
        signal: requestSignal
      })

      if (!response.ok) {
        const payload = await parseResponseBody(response)
        const fallback = `Request failed (${response.status})`
        const detail = toErrorMessage(payload, fallback)
        const labelPrefix = errorLabel ? `${errorLabel} (${response.status})` : null
        const message = labelPrefix ? `${labelPrefix}: ${detail}` : detail
        throw new HttpError(message, {
          status: response.status,
          method: upperMethod,
          url,
          payload
        })
      }

      return response
    } catch (error) {
      if (!shouldRetry({ attempt, retries, method: upperMethod, error, retryableStatusCodes })) {
        if (error?.name === 'TimeoutError' || /timed out/i.test(error?.message || '')) {
          const timeoutError = new HttpError('Request timed out.', { method: upperMethod, url })
          timeoutError.name = 'TimeoutError'
          throw timeoutError
        }
        if (error?.name === 'AbortError') {
          const abortError = new HttpError('Request was cancelled.', { method: upperMethod, url })
          abortError.name = 'AbortError'
          throw abortError
        }
        throw error
      }

      attempt += 1
      await delay(retryDelayMs * attempt)
    } finally {
      timeout?.clear?.()
      merged?.cleanup?.()
    }
  }
}

export async function requestJson(url, options = {}) {
  const response = await requestRaw(url, options)
  if (response.status === 204) return null
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    throw new HttpError('Response was not valid JSON.', {
      status: response.status,
      method: options.method || 'GET',
      url
    })
  }
}

export async function requestText(url, options = {}) {
  const response = await requestRaw(url, options)
  return response.text()
}

export function createRequestCanceller() {
  const controllers = new Map()

  return {
    nextSignal(key) {
      if (!key) return undefined
      controllers.get(key)?.abort()
      const controller = new AbortController()
      controllers.set(key, controller)
      return controller.signal
    },
    clear(key) {
      if (!key) return
      controllers.get(key)?.abort()
      controllers.delete(key)
    },
    clearAll() {
      for (const controller of controllers.values()) {
        controller.abort()
      }
      controllers.clear()
    }
  }
}
