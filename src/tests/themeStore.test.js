import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('themeStore', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('applies explicit theme preference', async () => {
    const { useThemeStore } = await import('../stores/themeStore.js')
    const theme = useThemeStore()
    theme.setPreference('midnight-neon')
    expect(theme.state.preference).toBe('midnight-neon')
    expect(theme.state.resolvedTheme).toBe('midnight-neon')
  })

  it('resolves system preference using media query', async () => {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      })),
      configurable: true
    })
    const { useThemeStore } = await import('../stores/themeStore.js')
    const theme = useThemeStore()
    theme.setPreference('system')
    expect(theme.state.resolvedTheme).toBe('midnight-neon')
  })

  it('maps legacy theme preference values to new themes', async () => {
    const { useThemeStore } = await import('../stores/themeStore.js')
    const theme = useThemeStore()
    theme.setPreference('light')
    expect(theme.state.preference).toBe('soft-aurora')
    expect(theme.state.resolvedTheme).toBe('soft-aurora')
  })
})
