const WEB_PREFIX = 'record_app_mobile_'

function isNative() {
  return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true
}

async function getPreferences() {
  try {
    const mod = await import('@capacitor/preferences')
    return mod.Preferences
  } catch {
    return null
  }
}

export async function setJsonItem(key, value) {
  const payload = JSON.stringify(value)
  if (!isNative()) {
    localStorage.setItem(`${WEB_PREFIX}${key}`, payload)
    return
  }
  const Preferences = await getPreferences()
  if (!Preferences) {
    localStorage.setItem(`${WEB_PREFIX}${key}`, payload)
    return
  }
  await Preferences.set({ key, value: payload })
}

export async function getJsonItem(key) {
  if (!isNative()) {
    const raw = localStorage.getItem(`${WEB_PREFIX}${key}`)
    return raw ? JSON.parse(raw) : null
  }
  const Preferences = await getPreferences()
  if (!Preferences) {
    const raw = localStorage.getItem(`${WEB_PREFIX}${key}`)
    return raw ? JSON.parse(raw) : null
  }
  const { value } = await Preferences.get({ key })
  return value ? JSON.parse(value) : null
}

export async function removeItem(key) {
  if (!isNative()) {
    localStorage.removeItem(`${WEB_PREFIX}${key}`)
    return
  }
  const Preferences = await getPreferences()
  if (!Preferences) {
    localStorage.removeItem(`${WEB_PREFIX}${key}`)
    return
  }
  await Preferences.remove({ key })
}
