import { vi } from 'vitest'

export function makeResponse(body, ok = true, status = 200) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body))
  }
}

export function mockFetchResponse(body, ok = true, status = 200) {
  global.fetch = vi.fn().mockResolvedValue(makeResponse(body, ok, status))
  return global.fetch
}
