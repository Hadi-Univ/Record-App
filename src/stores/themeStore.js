import { reactive } from 'vue'
import {
  THEME_KEY,
  THEME_OPTIONS,
  THEME_TOKENS,
  THEME_COLOR_SCHEMES,
  SYSTEM_THEME_MAP,
  LEGACY_THEME_ALIASES
} from '../theme/themeTokens'

const VALID_PREFERENCES = new Set(THEME_OPTIONS.map(option => option.value))
const normalizePreference = (value) => {
  const normalizedValue = LEGACY_THEME_ALIASES[value] || value
  return VALID_PREFERENCES.has(normalizedValue) ? normalizedValue : 'system'
}

const savedPreference = (() => {
  try {
    return normalizePreference(localStorage.getItem(THEME_KEY) || 'system')
  } catch {
    return 'system'
  }
})()

const state = reactive({
  preference: savedPreference,
  resolvedTheme: 'soft-aurora'
})

const systemTheme = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? SYSTEM_THEME_MAP.dark
    : SYSTEM_THEME_MAP.light

const resolveTheme = (preference) => {
  const normalized = normalizePreference(preference)
  return normalized === 'system' ? systemTheme() : normalized
}

const applyTheme = (preference = state.preference) => {
  const normalizedPreference = normalizePreference(preference)
  const resolved = resolveTheme(normalizedPreference)
  const tokens = THEME_TOKENS[resolved] || THEME_TOKENS['soft-aurora']
  const colorScheme = THEME_COLOR_SCHEMES[resolved] || 'light'
  state.preference = normalizedPreference
  state.resolvedTheme = resolved

  if (typeof document !== 'undefined') {
    const root = document.documentElement
    root.setAttribute('data-theme', resolved)
    root.setAttribute('data-theme-preference', normalizedPreference)
    root.setAttribute('data-theme-resolved', resolved)
    root.style.colorScheme = colorScheme
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
