import { describe, it, expect } from 'vitest'
import { isSecurityPayload, normalizeApiError, getSecurityMessage } from '../services/errorHandler'

describe('errorHandler security normalization', () => {
  it('detects structured backend security payload', () => {
    const payload = {
      detail: {
        success: false,
        error: {
          type: 'prompt_injection_detected',
          message: 'Potential unsafe prompt detected.'
        }
      }
    }
    expect(isSecurityPayload(payload)).toBe(true)
  })

  it('normalizes security payload to safe generic message', () => {
    const normalized = normalizeApiError({
      payload: {
        detail: {
          error: {
            type: 'prompt_injection_detected',
            message: 'Prompt injection pattern detected'
          }
        }
      },
      status: 422
    })
    expect(normalized.kind).toBe('security')
    expect(normalized.message).toBe(getSecurityMessage())
  })
})
