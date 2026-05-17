import { reactive } from 'vue'
import { THEME_KEY, THEME_OPTIONS, THEME_TOKENS } from '../theme/themeTokens'

const VALID_PREFERENCES = new Set(THEME_OPTIONS.map(option => option.value))
const normalizePreference = (value) => (VALID_PREFERENCES.has(value) ? value : 'system')

const savedPreference = (() => {
  try {
    return normalizePreference(localStorage.getItem(THEME_KEY) || 'system')
  } catch {
    return 'system'
  }
})()

const state = reactive({
  preference: savedPreference,
  resolvedTheme: 'light'
})

const systemTheme = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'

const resolveTheme = (preference) => {
  const normalized = normalizePreference(preference)
  return normalized === 'system' ? systemTheme() : normalized
}

const applyTheme = (preference = state.preference) => {
  const normalizedPreference = normalizePreference(preference)
  const resolved = resolveTheme(normalizedPreference)
  const tokens = THEME_TOKENS[resolved] || THEME_TOKENS.light
  state.preference = normalizedPreference
  state.resolvedTheme = resolved

  if (typeof document !== 'undefined') {
    const root = document.documentElement
    root.setAttribute('data-theme', resolved)
    root.setAttribute('data-theme-preference', normalizedPreference)
    root.setAttribute('data-theme-resolved', resolved)
    root.style.colorScheme = resolved === 'light' ? 'light' : 'dark'
    Object.entries(tokens).forEach(([key, value]) => root.style.setProperty(key, value))
  }

  try {
    localStorage.setItem(THEME_KEY, normalizedPreference)
  } catch {
    // ignore storage failures
  }
}

const setPreference = (value) => {
  applyTheme(value || 'system')
}

const handleSystemThemeChange = () => {
  if (state.preference === 'system') applyTheme('system')
}

export const useThemeStore = () => ({
  state,
  applyTheme,
  setPreference,
  handleSystemThemeChange
})
