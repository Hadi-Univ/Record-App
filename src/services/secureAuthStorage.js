import { getJsonItem, setJsonItem, removeItem } from './mobileStorage'

const AUTH_KEY = 'secure_auth_state_v1'

function isNative() {
  return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true
}

async function getSecureStoragePlugin() {
  try {
    const mod = await import('@aparajita/capacitor-secure-storage')
    if (mod?.SecureStorage) return mod.SecureStorage
    if (mod?.default?.SecureStorage) return mod.default.SecureStorage
    return null
  } catch {
    return null
  }
}

export async function loadSecureAuthState() {
  if (!isNative()) {
    return getJsonItem(AUTH_KEY)
  }

  const securePlugin = await getSecureStoragePlugin()
  if (!securePlugin) {
    return getJsonItem(AUTH_KEY)
  }

  try {
    const { value } = await securePlugin.get({ key: AUTH_KEY })
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

export async function saveSecureAuthState(authState) {
  const payload = JSON.stringify(authState || {})

  if (!isNative()) {
    await setJsonItem(AUTH_KEY, authState || {})
    return
  }

  const securePlugin = await getSecureStoragePlugin()
  if (!securePlugin) {
    await setJsonItem(AUTH_KEY, authState || {})
    return
  }

  await securePlugin.set({ key: AUTH_KEY, value: payload })
}

export async function clearSecureAuthState() {
  if (!isNative()) {
    await removeItem(AUTH_KEY)
    return
  }

  const securePlugin = await getSecureStoragePlugin()
  if (!securePlugin) {
    await removeItem(AUTH_KEY)
    return
  }

  await securePlugin.remove({ key: AUTH_KEY })
}
