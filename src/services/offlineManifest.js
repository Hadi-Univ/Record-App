import { isCapacitorNative } from './authService'

const OFFLINE_ROOT = 'offline-history-cache'
const MANIFEST_FILE_PATH = `${OFFLINE_ROOT}/manifest.json`
const FALLBACK_MANIFEST_KEY = 'offline_history_manifest_v1'
const FALLBACK_FILE_PREFIX = 'offline_history_file_v1:'

let fsModulePromise = null
let syncQueue = Promise.resolve()

const safeJsonParse = (value, fallback) => {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const toJson = (value) => JSON.stringify(value, null, 2)

const bytesForString = (value) => {
  const encoder = typeof TextEncoder === 'function' ? new TextEncoder() : null
  return encoder ? encoder.encode(String(value || '')).length : String(value || '').length
}

const checksum = (value) => {
  const input = String(value || '')
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `fnv1a-${(hash >>> 0).toString(16)}`
}

const isObject = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value))

const toRecordKey = (artifactKey, langPair = null) => langPair ? `${langPair}::${artifactKey}` : artifactKey

const historyFolder = (historyId) => `${OFFLINE_ROOT}/${String(historyId || '').replace(/[^a-zA-Z0-9_.-]/g, '_')}`

const buildPath = (historyId, filename) => `${historyFolder(historyId)}/${filename}`

const readFallbackManifest = () => {
  if (typeof localStorage === 'undefined') {
    return { version: 1, histories: {}, storage_bytes: 0, updated_at: '' }
  }
  const payload = localStorage.getItem(FALLBACK_MANIFEST_KEY)
  if (!payload) return { version: 1, histories: {}, storage_bytes: 0, updated_at: '' }
  return safeJsonParse(payload, { version: 1, histories: {}, storage_bytes: 0, updated_at: '' })
}

const writeFallbackManifest = (manifest) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(FALLBACK_MANIFEST_KEY, JSON.stringify(manifest))
}

const readFallbackFile = (path) => {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(`${FALLBACK_FILE_PREFIX}${path}`)
  if (!raw) return null
  return safeJsonParse(raw, null)
}

const writeFallbackFile = (path, payload) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(`${FALLBACK_FILE_PREFIX}${path}`, JSON.stringify(payload))
}

const removeFallbackFile = (path) => {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(`${FALLBACK_FILE_PREFIX}${path}`)
}

const getFilesystem = async () => {
  if (!isCapacitorNative()) return null
  if (!fsModulePromise) {
    fsModulePromise = import('@capacitor/filesystem')
      .then((mod) => ({
        Filesystem: mod.Filesystem,
        Directory: mod.Directory,
        Encoding: mod.Encoding
      }))
      .catch(() => null)
  }
  return fsModulePromise
}

const readTextFile = async (path) => {
  const fs = await getFilesystem()
  if (!fs) {
    const fallback = readFallbackFile(path)
    return fallback?.data || ''
  }
  try {
    const { data } = await fs.Filesystem.readFile({
      path,
      directory: fs.Directory.Data,
      encoding: fs.Encoding.UTF8
    })
    return String(data || '')
  } catch {
    return ''
  }
}

const writeTextFile = async (path, data) => {
  const normalized = String(data || '')
  const fs = await getFilesystem()
  if (!fs) {
    writeFallbackFile(path, {
      encoding: 'utf8',
      data: normalized,
      size: bytesForString(normalized)
    })
    return
  }
  await fs.Filesystem.writeFile({
    path,
    data: normalized,
    directory: fs.Directory.Data,
    encoding: fs.Encoding.UTF8,
    recursive: true
  })
}

const readBinaryFileBase64 = async (path) => {
  const fs = await getFilesystem()
  if (!fs) {
    const fallback = readFallbackFile(path)
    return fallback?.data || ''
  }
  try {
    const { data } = await fs.Filesystem.readFile({
      path,
      directory: fs.Directory.Data
    })
    return String(data || '')
  } catch {
    return ''
  }
}

const writeBinaryFileBase64 = async (path, base64Data) => {
  const normalized = String(base64Data || '')
  const fs = await getFilesystem()
  if (!fs) {
    writeFallbackFile(path, {
      encoding: 'base64',
      data: normalized,
      size: Math.ceil((normalized.length * 3) / 4)
    })
    return
  }
  await fs.Filesystem.writeFile({
    path,
    data: normalized,
    directory: fs.Directory.Data,
    recursive: true
  })
}

const fileExists = async (path) => {
  const fs = await getFilesystem()
  if (!fs) {
    return Boolean(readFallbackFile(path))
  }
  try {
    await fs.Filesystem.stat({ path, directory: fs.Directory.Data })
    return true
  } catch {
    return false
  }
}

const deleteFile = async (path) => {
  const fs = await getFilesystem()
  if (!fs) {
    removeFallbackFile(path)
    return
  }
  try {
    await fs.Filesystem.deleteFile({ path, directory: fs.Directory.Data })
  } catch {
    // ignore missing files
  }
}

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => {
    const result = String(reader.result || '')
    const prefixIndex = result.indexOf(',')
    resolve(prefixIndex >= 0 ? result.slice(prefixIndex + 1) : result)
  }
  reader.onerror = () => reject(new Error('Failed to convert blob to base64'))
  reader.readAsDataURL(blob)
})

const ensureManifestShape = (payload) => {
  const manifest = isObject(payload) ? payload : {}
  return {
    version: 1,
    histories: isObject(manifest.histories) ? manifest.histories : {},
    storage_bytes: Number(manifest.storage_bytes || 0),
    updated_at: String(manifest.updated_at || '')
  }
}

export const readOfflineManifest = async () => {
  const raw = await readTextFile(MANIFEST_FILE_PATH)
  if (!raw) return ensureManifestShape(readFallbackManifest())
  return ensureManifestShape(safeJsonParse(raw, readFallbackManifest()))
}

const persistOfflineManifest = async (manifest) => {
  const normalized = ensureManifestShape({
    ...manifest,
    updated_at: new Date().toISOString()
  })
  writeFallbackManifest(normalized)
  await writeTextFile(MANIFEST_FILE_PATH, toJson(normalized))
  return normalized
}

const createHistoryManifest = (historyId) => ({
  history_id: historyId,
  audio: '',
  transcript: '',
  summary: '',
  flashcards: '',
  translation: {},
  timeline: '',
  chat_history: '',
  attachments: [],
  last_synced: '',
  sync_status: 'pending',
  download_status: 'pending',
  file_versions: {},
  file_checksums: {},
  files: {},
  storage_bytes: 0,
  metadata: '',
  sync_error: ''
})

const getArtifactDefinition = (historyId, artifactKey, langPair = null) => {
  const safePair = String(langPair || '').replace(/[^a-zA-Z0-9_.-]/g, '_')
  const suffix = safePair ? `.${safePair}` : ''
  const map = {
    summary_txt: { type: 'text', path: buildPath(historyId, `summary${suffix}.txt`) },
    transcript_txt: { type: 'text', path: buildPath(historyId, `transcript${suffix}.txt`) },
    transcript_json: { type: 'json', path: buildPath(historyId, `transcript${suffix}.json`) },
    flashcards_json: { type: 'json', path: buildPath(historyId, `flashcards${suffix}.json`) },
    chatbot_json: { type: 'json', path: buildPath(historyId, `chat_history${suffix}.json`) },
    audio: { type: 'blob', path: buildPath(historyId, 'audio.bin'), mimeType: 'audio/wav' },
    image: { type: 'blob', path: buildPath(historyId, 'timeline.bin'), mimeType: 'image/png' },
    manifest_json: { type: 'json', path: buildPath(historyId, 'job_manifest.json') }
  }
  return map[artifactKey] || null
}

const hydrateStorageUsage = (historyManifest) => {
  const files = isObject(historyManifest?.files) ? historyManifest.files : {}
  return Object.values(files).reduce((total, item) => total + Number(item?.size || 0), 0)
}

const applyPrimaryFieldAliases = (historyManifest, recordKey, filePath, langPair = null) => {
  if (!langPair) {
    if (recordKey === 'summary_txt') historyManifest.summary = filePath
    if (recordKey === 'transcript_txt') historyManifest.transcript = filePath
    if (recordKey === 'flashcards_json') historyManifest.flashcards = filePath
    if (recordKey === 'chatbot_json') historyManifest.chat_history = filePath
    if (recordKey === 'audio') historyManifest.audio = filePath
    if (recordKey === 'image') historyManifest.timeline = filePath
    return
  }

  historyManifest.translation = isObject(historyManifest.translation) ? historyManifest.translation : {}
  const translation = isObject(historyManifest.translation[langPair]) ? historyManifest.translation[langPair] : {}
  if (recordKey === 'summary_txt') translation.summary = filePath
  if (recordKey === 'transcript_txt') translation.transcript = filePath
  if (recordKey === 'transcript_json') translation.transcript_json = filePath
  historyManifest.translation[langPair] = translation
}

const readCachedPayload = async (record) => {
  if (!record?.path) return null
  if (record.type === 'blob') {
    const base64 = await readBinaryFileBase64(record.path)
    return base64 || null
  }
  const text = await readTextFile(record.path)
  if (!text) return record.type === 'json' ? null : ''
  if (record.type === 'json') return safeJsonParse(text, null)
  return text
}

const verifyCachedRecord = async (record) => {
  if (!record?.path) return false
  if (!(await fileExists(record.path))) return false
  if (!record.checksum) return true
  const payload = await readCachedPayload(record)
  if (payload == null) return false
  const candidate = record.type === 'json' ? toJson(payload) : String(payload)
  return checksum(candidate) === record.checksum
}

const writeArtifactRecord = async ({ historyManifest, artifactKey, langPair = null, payload, remoteVersion = '', mimeType = '' }) => {
  const definition = getArtifactDefinition(historyManifest.history_id, artifactKey, langPair)
  if (!definition) return null

  let serialized = ''
  let size = 0
  if (definition.type === 'json') {
    serialized = toJson(payload)
    size = bytesForString(serialized)
    await writeTextFile(definition.path, serialized)
  } else if (definition.type === 'text') {
    serialized = String(payload || '')
    size = bytesForString(serialized)
    await writeTextFile(definition.path, serialized)
  } else {
    serialized = String(payload || '')
    size = Math.ceil((serialized.length * 3) / 4)
    await writeBinaryFileBase64(definition.path, serialized)
  }

  const recordKey = toRecordKey(artifactKey, langPair)
  const record = {
    key: artifactKey,
    langPair: langPair || null,
    type: definition.type,
    path: definition.path,
    checksum: checksum(serialized),
    size,
    version: String(remoteVersion || ''),
    status: 'synced',
    mimeType: mimeType || definition.mimeType || '',
    updated_at: new Date().toISOString()
  }
  historyManifest.files[recordKey] = record
  historyManifest.file_versions[recordKey] = record.version
  historyManifest.file_checksums[recordKey] = record.checksum
  applyPrimaryFieldAliases(historyManifest, artifactKey, definition.path, langPair)
  return record
}

const removeRecord = async (historyManifest, recordKey) => {
  const record = historyManifest.files?.[recordKey]
  if (record?.path) {
    await deleteFile(record.path)
  }
  if (historyManifest.files) delete historyManifest.files[recordKey]
  if (historyManifest.file_versions) delete historyManifest.file_versions[recordKey]
  if (historyManifest.file_checksums) delete historyManifest.file_checksums[recordKey]
}

const resolveDetailPayload = async (historyManifest, langPair = null) => {
  const keyFor = (artifact) => toRecordKey(artifact, langPair)
  const fallbackKeyFor = (artifact) => toRecordKey(artifact, null)

  const pickRecord = (artifact) => historyManifest.files?.[keyFor(artifact)] || historyManifest.files?.[fallbackKeyFor(artifact)] || null

  const summary = await readCachedPayload(pickRecord('summary_txt'))
  const transcript = await readCachedPayload(pickRecord('transcript_txt'))
  const transcriptData = await readCachedPayload(pickRecord('transcript_json'))
  const flashcards = await readCachedPayload(pickRecord('flashcards_json'))
  const chatMessages = await readCachedPayload(pickRecord('chatbot_json'))
  const manifestJson = await readCachedPayload(historyManifest.files?.[toRecordKey('manifest_json')])

  return {
    manifest: manifestJson || null,
    summary: typeof summary === 'string' ? summary : '',
    transcript: typeof transcript === 'string' ? transcript : '',
    transcriptData: Array.isArray(transcriptData) ? transcriptData : [],
    flashcards: Array.isArray(flashcards) ? flashcards : [],
    chatMessages: Array.isArray(chatMessages) ? chatMessages : [],
    updatedAt: historyManifest.last_synced || '',
    localManifest: historyManifest
  }
}

export const getOfflineHistoryManifest = async (historyId) => {
  const manifest = await readOfflineManifest()
  return manifest.histories[String(historyId || '')] || null
}

export const getOfflineHistoryDetail = async (historyId, options = {}) => {
  const historyManifest = await getOfflineHistoryManifest(historyId)
  if (!historyManifest) return null
  return resolveDetailPayload(historyManifest, options.langPair || null)
}

export const updateOfflineChatHistory = async (historyId, messages, options = {}) => {
  const key = String(historyId || '')
  if (!key) return null

  const manifest = await readOfflineManifest()
  const historyManifest = isObject(manifest.histories[key]) ? manifest.histories[key] : createHistoryManifest(key)
  historyManifest.files = isObject(historyManifest.files) ? historyManifest.files : {}
  historyManifest.file_versions = isObject(historyManifest.file_versions) ? historyManifest.file_versions : {}
  historyManifest.file_checksums = isObject(historyManifest.file_checksums) ? historyManifest.file_checksums : {}

  const safeMessages = Array.isArray(messages) ? messages : []
  await writeArtifactRecord({
    historyManifest,
    artifactKey: 'chatbot_json',
    payload: safeMessages,
    remoteVersion: options.version || historyManifest.last_synced || ''
  })

  historyManifest.last_synced = new Date().toISOString()
  historyManifest.storage_bytes = hydrateStorageUsage(historyManifest)
  historyManifest.sync_status = 'synced'
  historyManifest.download_status = 'ready'
  manifest.histories[key] = historyManifest
  manifest.storage_bytes = Object.values(manifest.histories).reduce((total, item) => total + hydrateStorageUsage(item), 0)

  await persistOfflineManifest(manifest)
  return historyManifest
}

const listDesiredArtifacts = (jobManifest) => {
  const files = isObject(jobManifest?.files) ? jobManifest.files : {}
  const base = [
    files.summary_txt ? { key: 'summary_txt' } : null,
    files.transcript_txt ? { key: 'transcript_txt' } : null,
    files.transcript_json ? { key: 'transcript_json' } : null,
    files.flashcards_json ? { key: 'flashcards_json' } : null,
    files.chatbot_json ? { key: 'chatbot_json' } : null,
    files.audio ? { key: 'audio' } : null,
    files.timeline_png ? { key: 'image' } : null,
    { key: 'manifest_json' }
  ].filter(Boolean)

  const translations = isObject(jobManifest?.translations) ? jobManifest.translations : {}
  const translated = Object.entries(translations).flatMap(([langPair, available]) => {
    const record = isObject(available) ? available : {}
    return [
      record.summary_txt ? { key: 'summary_txt', langPair } : null,
      record.transcript_txt ? { key: 'transcript_txt', langPair } : null,
      record.transcript_json ? { key: 'transcript_json', langPair } : null
    ].filter(Boolean)
  })

  return [...base, ...translated]
}

const defaultFetchers = {
  fetchText: async () => '',
  fetchJson: async () => null,
  fetchBlob: async () => null
}

export const syncHistoryOfflinePackage = async (jobManifest, fetchers = {}, options = {}) => {
  const historyId = String(jobManifest?.folder_name || jobManifest?.history_id || '')
  if (!historyId) return null

  const remoteVersionBase = String(jobManifest?.updated_at || jobManifest?.created_at || Date.now())

  const mergedFetchers = {
    ...defaultFetchers,
    ...fetchers
  }

  const syncTask = async () => {
    const manifest = await readOfflineManifest()
    const historyManifest = isObject(manifest.histories[historyId])
      ? manifest.histories[historyId]
      : createHistoryManifest(historyId)

    historyManifest.history_id = historyId
    historyManifest.files = isObject(historyManifest.files) ? historyManifest.files : {}
    historyManifest.file_versions = isObject(historyManifest.file_versions) ? historyManifest.file_versions : {}
    historyManifest.file_checksums = isObject(historyManifest.file_checksums) ? historyManifest.file_checksums : {}
    historyManifest.sync_status = 'syncing'
    historyManifest.download_status = 'syncing'
    historyManifest.sync_error = ''

    const desired = listDesiredArtifacts(jobManifest)
    const desiredKeys = new Set(desired.map(({ key, langPair }) => toRecordKey(key, langPair || null)))

    for (const existingKey of Object.keys(historyManifest.files)) {
      if (!desiredKeys.has(existingKey)) {
        await removeRecord(historyManifest, existingKey)
      }
    }

    let syncedCount = 0
    let updatedCount = 0

    for (const artifact of desired) {
      const artifactKey = artifact.key
      const langPair = artifact.langPair || null
      const recordKey = toRecordKey(artifactKey, langPair)
      const currentRecord = historyManifest.files[recordKey]
      const remoteVersion = `${remoteVersionBase}:${recordKey}`

      const alreadyValid = currentRecord && currentRecord.version === remoteVersion && await verifyCachedRecord(currentRecord)
      if (alreadyValid) {
        syncedCount += 1
        if (typeof options.onProgress === 'function') {
          options.onProgress({ historyId, artifactKey, langPair, status: 'cached' })
        }
        continue
      }

      try {
        if (artifactKey === 'manifest_json') {
          await writeArtifactRecord({
            historyManifest,
            artifactKey,
            payload: jobManifest,
            remoteVersion
          })
        } else {
          const requestOptions = { langPair: langPair || undefined }
          if (artifactKey === 'audio' || artifactKey === 'image') {
            const blob = await mergedFetchers.fetchBlob(artifactKey, requestOptions)
            if (!blob) continue
            const base64 = await blobToBase64(blob)
            await writeArtifactRecord({
              historyManifest,
              artifactKey,
              langPair,
              payload: base64,
              remoteVersion,
              mimeType: blob.type || ''
            })
          } else if (artifactKey.endsWith('_json')) {
            const jsonPayload = await mergedFetchers.fetchJson(artifactKey, requestOptions)
            await writeArtifactRecord({
              historyManifest,
              artifactKey,
              langPair,
              payload: jsonPayload,
              remoteVersion
            })
          } else {
            const textPayload = await mergedFetchers.fetchText(artifactKey, requestOptions)
            await writeArtifactRecord({
              historyManifest,
              artifactKey,
              langPair,
              payload: textPayload,
              remoteVersion
            })
          }
        }
        updatedCount += 1
        syncedCount += 1
        if (typeof options.onProgress === 'function') {
          options.onProgress({ historyId, artifactKey, langPair, status: 'updated' })
        }
      } catch (error) {
        historyManifest.sync_error = error?.message || 'Failed to synchronize offline asset'
        if (typeof options.onProgress === 'function') {
          options.onProgress({ historyId, artifactKey, langPair, status: 'failed', error: historyManifest.sync_error })
        }
      }
    }

    historyManifest.storage_bytes = hydrateStorageUsage(historyManifest)
    historyManifest.last_synced = new Date().toISOString()
    historyManifest.sync_status = historyManifest.sync_error ? 'partial' : 'synced'
    historyManifest.download_status = syncedCount > 0 ? (historyManifest.sync_error ? 'partial' : 'ready') : 'empty'

    manifest.histories[historyId] = historyManifest
    manifest.storage_bytes = Object.values(manifest.histories).reduce((total, item) => total + hydrateStorageUsage(item), 0)
    await persistOfflineManifest(manifest)

    return {
      historyId,
      syncedCount,
      updatedCount,
      status: historyManifest.sync_status,
      storageBytes: historyManifest.storage_bytes
    }
  }

  syncQueue = syncQueue.then(syncTask).catch(async (error) => {
    const manifest = await readOfflineManifest()
    const historyManifest = manifest.histories[historyId]
    if (historyManifest) {
      historyManifest.sync_status = 'error'
      historyManifest.download_status = 'error'
      historyManifest.sync_error = error?.message || 'Offline synchronization failed'
      await persistOfflineManifest(manifest)
    }
    throw error
  })

  return syncQueue
}

export const getOfflineAssetDataUrl = async (historyId, artifactKey) => {
  const historyManifest = await getOfflineHistoryManifest(historyId)
  if (!historyManifest) return ''
  const record = historyManifest.files?.[toRecordKey(artifactKey)]
  if (!record || record.type !== 'blob') return ''
  const base64 = await readBinaryFileBase64(record.path)
  if (!base64) return ''
  const mime = record.mimeType || (artifactKey === 'image' ? 'image/png' : 'audio/wav')
  return `data:${mime};base64,${base64}`
}

export const removeOfflineHistoryPackage = async (historyId) => {
  const key = String(historyId || '')
  if (!key) return
  const manifest = await readOfflineManifest()
  const historyManifest = manifest.histories[key]
  if (!historyManifest) return

  const files = isObject(historyManifest.files) ? historyManifest.files : {}
  for (const record of Object.values(files)) {
    if (record?.path) {
      await deleteFile(record.path)
    }
  }

  delete manifest.histories[key]
  manifest.storage_bytes = Object.values(manifest.histories).reduce((total, item) => total + hydrateStorageUsage(item), 0)
  await persistOfflineManifest(manifest)
}

export const getOfflineHistoryList = async () => {
  const manifest = await readOfflineManifest()
  const histories = Object.values(manifest.histories || {})
  const jobs = []

  for (const historyManifest of histories) {
    const jobManifestRecord = historyManifest.files?.[toRecordKey('manifest_json')]
    const payload = await readCachedPayload(jobManifestRecord)
    if (payload && typeof payload === 'object') {
      jobs.push(payload)
      continue
    }

    jobs.push({
      folder_name: historyManifest.history_id,
      file_name: '',
      created_at: historyManifest.last_synced,
      updated_at: historyManifest.last_synced,
      status: historyManifest.sync_status || 'cached'
    })
  }

  return jobs.sort((a, b) => {
    const tsA = new Date(a.updated_at || a.created_at || 0).getTime()
    const tsB = new Date(b.updated_at || b.created_at || 0).getTime()
    return tsB - tsA
  })
}

export const getOfflineStorageStats = async () => {
  const manifest = await readOfflineManifest()
  const histories = Object.values(manifest.histories)
  const downloaded = histories.filter(item => String(item.download_status) === 'ready').length
  const syncing = histories.filter(item => String(item.sync_status) === 'syncing').length
  const partial = histories.filter(item => String(item.sync_status) === 'partial').length

  return {
    totalHistories: histories.length,
    downloadedHistories: downloaded,
    syncingHistories: syncing,
    partialHistories: partial,
    storageBytes: Number(manifest.storage_bytes || 0)
  }
}

export const queueOfflineSyncTask = async (task) => {
  syncQueue = syncQueue.then(() => task())
  return syncQueue
}
