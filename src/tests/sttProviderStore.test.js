import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/sttApi', () => ({
  getSttProviders: vi.fn(async () => ({ providers: [{ provider: 'faster_whisper', is_local: true }] })),
  getSttProviderConfig: vi.fn(async () => ({ active_provider: 'faster_whisper', fallback_providers: [] })),
  getSttProviderHealth: vi.fn(async () => ({ active_provider: 'faster_whisper', providers: [] })),
  updateSttProviderConfig: vi.fn(async (payload) => ({ ...payload })),
  testSttProvider: vi.fn(async (provider) => ({ provider, ok: true, message: 'ok' }))
}))

describe('sttProviderStore', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('loads providers/config/health', async () => {
    const { useSttProviderStore } = await import('../stores/sttProviderStore')
    const store = useSttProviderStore()
    await store.load()
    expect(store.state.providers.length).toBe(1)
    expect(store.state.config.active_provider).toBe('faster_whisper')
  })

  it('saves config patch', async () => {
    const { useSttProviderStore } = await import('../stores/sttProviderStore')
    const store = useSttProviderStore()
    const updated = await store.save({ active_provider: 'openai' })
    expect(updated.active_provider).toBe('openai')
  })

  it('tests provider', async () => {
    const { useSttProviderStore } = await import('../stores/sttProviderStore')
    const store = useSttProviderStore()
    const result = await store.runTest('faster_whisper')
    expect(result.ok).toBe(true)
  })
})
