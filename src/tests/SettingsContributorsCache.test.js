import { describe, it, expect, beforeEach } from 'vitest'

const CONTRIBUTORS_CACHE_KEY = 'record_app_contributors_cache_v1'
const CONTRIBUTORS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

function readContributorsCache() {
  try {
    const raw = localStorage.getItem(CONTRIBUTORS_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.data) || typeof parsed.fetchedAt !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

function normalizeContributors(data, unknownContributor = 'Unknown contributor') {
  return Array.isArray(data)
    ? data.map((contributor, index) => {
      const name = contributor.login || unknownContributor
      return {
        id: contributor.id ?? `contributor-${index}`,
        name,
        avatarUrl: contributor.avatar_url || '',
        profileUrl: contributor.html_url || '',
        fallbackInitial: name.charAt(0).toUpperCase()
      }
    })
    : []
}

function hasFreshCache(now = Date.now()) {
  const cached = readContributorsCache()
  if (!cached) return false
  return now - cached.fetchedAt <= CONTRIBUTORS_CACHE_TTL_MS
}

describe('Settings contributors cache helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null for malformed cache values', () => {
    localStorage.setItem(CONTRIBUTORS_CACHE_KEY, '{bad json')
    expect(readContributorsCache()).toBeNull()
  })

  it('normalizes contributor payload fields', () => {
    const normalized = normalizeContributors([{ id: 1, login: 'hadi', avatar_url: 'a', html_url: 'h' }])
    expect(normalized).toEqual([{
      id: 1,
      name: 'hadi',
      avatarUrl: 'a',
      profileUrl: 'h',
      fallbackInitial: 'H'
    }])
  })

  it('accepts fresh cache and rejects stale cache', () => {
    const now = Date.now()
    localStorage.setItem(CONTRIBUTORS_CACHE_KEY, JSON.stringify({
      fetchedAt: now - (2 * 24 * 60 * 60 * 1000),
      data: [{ login: 'recent' }]
    }))
    expect(hasFreshCache(now)).toBe(true)

    localStorage.setItem(CONTRIBUTORS_CACHE_KEY, JSON.stringify({
      fetchedAt: now - (8 * 24 * 60 * 60 * 1000),
      data: [{ login: 'stale' }]
    }))
    expect(hasFreshCache(now)).toBe(false)
  })
})
