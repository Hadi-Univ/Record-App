/**
 * Lightweight i18n composable for Record Note.
 *
 * Features:
 *  - Browser-language auto-detection on first visit
 *  - Persistent locale stored in localStorage
 *  - RTL support for Arabic (sets document <html dir="rtl">)
 *  - Simple {placeholder} interpolation in translation strings
 *  - Dot-notation key lookup with safe fallback to the key itself
 */

import { ref, watch } from 'vue'
import en from './locales/en.js'
import fr from './locales/fr.js'
import es from './locales/es.js'
import ar from './locales/ar.js'
import de from './locales/de.js'
import id from './locales/id.js'

/** All supported locales with their display names and text direction. */
export const LOCALES = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'es', label: 'Español', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'de', label: 'Deutsch', dir: 'ltr' },
  { code: 'id', label: 'Bahasa Indonesia', dir: 'ltr' }
]

const MESSAGES = { en, fr, es, ar, de, id }
const STORAGE_KEY = 'i18n_locale'
const normalizeLocaleCode = (code) => String(code || '').toLowerCase().split('-')[0]

/**
 * Detect the best matching supported locale from the browser's language
 * preferences. Falls back to 'en' when no match is found.
 */
export function detectBrowserLocale() {
  if (typeof navigator === 'undefined') return 'en'
  const candidates = navigator.languages?.length
    ? navigator.languages
    : [navigator.language || 'en']

  for (const lang of candidates) {
    const code = normalizeLocaleCode(lang)
    if (MESSAGES[code]) return code
  }
  return 'en'
}

/** Read the persisted locale from localStorage (returns null when absent). */
function readPersistedLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const normalized = normalizeLocaleCode(stored)
    if (normalized && MESSAGES[normalized]) return normalized
  } catch {
    // localStorage unavailable
  }
  return null
}

/** Persist the locale to localStorage. */
function writePersistedLocale(code) {
  const normalized = normalizeLocaleCode(code)
  if (!MESSAGES[normalized]) return
  try {
    localStorage.setItem(STORAGE_KEY, normalized)
  } catch {
    // localStorage unavailable
  }
}

/** Apply the locale's text direction to the root <html> element. */
function applyDir(code) {
  const normalized = normalizeLocaleCode(code)
  const locale = LOCALES.find(l => l.code === normalized)
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('dir', locale?.dir ?? 'ltr')
    document.documentElement.setAttribute('lang', normalized || 'en')
  }
}

// ─── Shared reactive state ────────────────────────────────────────────────────

const _initialLocale = readPersistedLocale() ?? detectBrowserLocale()
applyDir(_initialLocale)

const _locale = ref(_initialLocale)

watch(_locale, (code) => {
  const normalized = normalizeLocaleCode(code)
  writePersistedLocale(normalized)
  applyDir(normalized)
})

// ─── Core translation helper ──────────────────────────────────────────────────

/**
 * Resolve a dot-notation key against a messages object.
 * Returns the value (string) or null when not found.
 */
function resolve(messages, key) {
  const parts = key.split('.')
  let node = messages
  for (const part of parts) {
    if (node == null || typeof node !== 'object') return null
    node = node[part]
  }
  return typeof node === 'string' ? node : null
}

/**
 * Interpolate {placeholder} tokens in a string.
 * e.g. interpolate('Hello {name}!', { name: 'World' }) → 'Hello World!'
 */
function interpolate(str, params) {
  if (!params || typeof params !== 'object') return str
  return str.replace(/\{(\w+)\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : `{${key}}`
  )
}

// ─── Public composable ────────────────────────────────────────────────────────

/**
 * useI18n() — call inside any Vue component or composable.
 *
 * Returns:
 *  - locale          reactive ref with the current locale code
 *  - availableLocales array of { code, label, dir }
 *  - setLocale(code) change the active locale
 *  - t(key, params?) translate a dot-notation key with optional interpolation
 */
export function useI18n() {
  /**
   * Translate a dot-notation key with optional named params.
   * Falls back to the English string, then to the raw key.
   *
   * @param {string} key    - e.g. 'nav.home' or 'home.welcomeBackName'
   * @param {object} [params] - e.g. { name: 'Alice' }
   * @returns {string}
   */
  function t(key, params) {
    const messages = MESSAGES[_locale.value]
    const raw = resolve(messages, key) ?? resolve(MESSAGES.en, key) ?? key
    return interpolate(raw, params)
  }

  function setLocale(code) {
    const normalized = normalizeLocaleCode(code)
    if (MESSAGES[normalized]) {
      _locale.value = normalized
    }
  }

  return {
    locale: _locale,
    availableLocales: LOCALES,
    setLocale,
    t
  }
}
