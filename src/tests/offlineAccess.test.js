import { describe, it, expect } from 'vitest'
import { canBypassCapabilityCheck, isHistoryPath } from '../router/offlineAccess.js'

describe('offline access route helpers', () => {
  it('detects history routes', () => {
    expect(isHistoryPath('/history')).toBe(true)
    expect(isHistoryPath('/history/job_123')).toBe(true)
    expect(isHistoryPath('/pipeline')).toBe(false)
  })

  it('only bypasses capability check for offline native history routes', () => {
    expect(canBypassCapabilityCheck('/history', true)).toBe(true)
    expect(canBypassCapabilityCheck('/history/job_123', true)).toBe(true)
    expect(canBypassCapabilityCheck('/history', false)).toBe(false)
    expect(canBypassCapabilityCheck('/pipeline', true)).toBe(false)
  })
})
