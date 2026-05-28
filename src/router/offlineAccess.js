export const isHistoryPath = (path = '') =>
  path === '/history' || String(path).startsWith('/history/')

export const canBypassCapabilityCheck = (path, nativeOffline) =>
  Boolean(nativeOffline && isHistoryPath(path))
