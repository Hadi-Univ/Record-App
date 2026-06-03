import { describe, it, expect, beforeEach, vi } from 'vitest'

const makeManifest = () => ({
  folder_name: 'job_1',
  file_name: 'audio.wav',
  updated_at: '2026-01-01T00:00:00.000Z',
  files: {
    summary_txt: true,
    transcript_txt: true,
    transcript_json: true,
    flashcards_json: true,
    chatbot_json: true,
    audio: true,
    timeline_png: true
  },
  translations: {
    indonesian_to_english: {
      summary_txt: true,
      transcript_txt: true,
      transcript_json: true
    }
  }
})

describe('offlineManifest service', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  it('syncs artifacts and serves cached offline detail', async () => {
    const offline = await import('../services/offlineManifest.js')

    await offline.syncHistoryOfflinePackage(makeManifest(), {
      fetchText: async (key, options = {}) => `${key}:${options.langPair || 'default'}`,
      fetchJson: async (key, options = {}) => [{ key, lang: options.langPair || 'default' }],
      fetchBlob: async (key) => new Blob([`${key}-blob`], { type: key === 'image' ? 'image/png' : 'audio/wav' })
    })

    const cached = await offline.getOfflineHistoryDetail('job_1')
    expect(cached.summary).toContain('summary_txt')
    expect(cached.transcript).toContain('transcript_txt')
    expect(cached.transcriptData.length).toBe(1)
    expect(cached.flashcards.length).toBe(1)
    expect(cached.chatMessages.length).toBe(1)

    const translated = await offline.getOfflineHistoryDetail('job_1', { langPair: 'indonesian_to_english' })
    expect(translated.summary).toContain('indonesian_to_english')

    const stats = await offline.getOfflineStorageStats()
    expect(stats.totalHistories).toBe(1)
    expect(stats.downloadedHistories).toBe(1)
    expect(stats.storageBytes).toBeGreaterThan(0)
  })

  it('skips duplicate downloads when version has not changed', async () => {
    const offline = await import('../services/offlineManifest.js')

    const fetchText = vi.fn(async () => 'text')
    const fetchJson = vi.fn(async () => [])
    const fetchBlob = vi.fn(async () => new Blob(['blob'], { type: 'audio/wav' }))

    const manifest = makeManifest()
    await offline.syncHistoryOfflinePackage(manifest, { fetchText, fetchJson, fetchBlob })
    const firstCallCount = fetchText.mock.calls.length + fetchJson.mock.calls.length + fetchBlob.mock.calls.length

    await offline.syncHistoryOfflinePackage(manifest, { fetchText, fetchJson, fetchBlob })
    const secondCallCount = fetchText.mock.calls.length + fetchJson.mock.calls.length + fetchBlob.mock.calls.length

    expect(secondCallCount).toBe(firstCallCount)
  })
})
