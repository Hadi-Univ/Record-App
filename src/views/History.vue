<template>
  <div class="space-y-6 pb-4">
    <div data-reveal class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-extrabold text-slate-900">{{ t('history.title') }}</h1>
          <p class="text-sm text-slate-500 mt-1">{{ t('history.subtitle') }}</p>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="px-2 py-1 rounded-lg text-xs font-semibold"
            :class="networkOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'"
          >
            {{ networkOnline ? 'Synced' : 'Offline Mode' }}
          </span>
          <span
            v-if="syncingOfflineCache"
            class="px-2 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
          >
            Syncing
          </span>
          <span
            v-else-if="storageStats.downloadedHistories < storageStats.totalHistories"
            class="px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200"
          >
            Update Available
          </span>
          <button
            v-if="jobs.length"
            @click="toggleSelectMode"
            class="motion-interactive flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-xl text-sm transition"
          >
            {{ selectMode ? t('history.cancel') : t('history.select') }}
          </button>
          <button
            @click="loadHistory"
            :disabled="loading"
            class="motion-interactive flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-xl text-sm transition disabled:opacity-50"
          >
            {{ loading ? t('history.loading') : t('history.refresh') }}
          </button>
        </div>
      </div>

      <!-- Search / filter -->
      <div class="mt-4">
        <input
          v-model="searchQuery"
          type="search"
          :placeholder="t('history.searchPlaceholder')"
          class="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
        />
      </div>
    </div>

    <!-- Delete selection toolbar -->
    <div
      v-if="selectMode && jobs.length"
      data-reveal
      class="bg-white rounded-2xl shadow-sm border border-slate-200 px-5 py-3 flex items-center gap-3 flex-wrap"
    >
      <label class="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none">
        <input
          type="checkbox"
          :checked="allVisibleSelected"
          :indeterminate.prop="someVisibleSelected && !allVisibleSelected"
          @change="toggleSelectAll"
          class="w-4 h-4 rounded accent-indigo-600"
        />
        {{ allVisibleSelected ? t('history.deselectAll') : t('history.selectAll') }}
      </label>
      <span class="text-sm text-slate-400">{{ t('history.selected', { n: selectedCount }) }}</span>
      <div class="flex-1" />
      <button
        @click="confirmDelete"
        :disabled="selectedCount === 0 || deleting"
        class="motion-interactive flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-xl text-sm transition"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
        {{ deleting ? t('history.deleting') : (selectedCount ? t('history.deleteCount', { n: selectedCount }) : t('history.delete')) }}
      </button>
    </div>

    <!-- Delete confirmation dialog -->
    <div
      v-if="showDeleteConfirm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="showDeleteConfirm = false"
    >
      <div role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" class="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
        <h2 id="delete-dialog-title" class="text-base font-extrabold text-slate-900 mb-2">{{ selectedCount !== 1 ? t('history.deleteConfirmTitlePlural', { n: selectedCount }) : t('history.deleteConfirmTitle', { n: selectedCount }) }}</h2>
        <p class="text-sm text-slate-500 mb-5">{{ t('history.deleteConfirmMessage') }}</p>
        <div class="flex gap-3">
          <button
            @click="showDeleteConfirm = false"
          class="motion-interactive flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
          >
            {{ t('history.cancel') }}
          </button>
          <button
            @click="executeDelete"
            class="motion-interactive flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition"
          >
            {{ t('history.delete') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="error"
      class="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 font-semibold"
    >
      {{ error }}
    </div>

    <div v-if="loading && !jobs.length" class="space-y-3">
      <div
        v-for="n in 3"
        :key="n"
        class="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse"
      >
        <div class="h-4 bg-slate-200 rounded w-1/3 mb-3" />
        <div class="h-3 bg-slate-100 rounded w-1/2" />
      </div>
    </div>

    <div
      v-else-if="!loading && !filteredJobs.length && !error"
      class="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center"
    >
      <h3 class="text-base font-bold text-slate-700">{{ searchQuery ? t('history.noMatchingJobs') : t('history.noJobsYet') }}</h3>
      <p class="text-sm text-slate-400 mt-1">
        {{ searchQuery ? t('history.tryDifferentSearch') : t('history.processFirstFile') }}
      </p>
      <router-link
        v-if="!searchQuery"
        to="/"
        class="motion-interactive inline-block mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition"
      >
        {{ t('history.goToPipeline') }}
      </router-link>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="job in filteredJobs"
        :key="job.folder_name"
        data-reveal
        class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
        :class="{ 'ring-2 ring-indigo-400': selectMode && selected[job.folder_name] }"
      >
        <button
          @click="selectMode ? toggleSelect(job.folder_name) : openJobDetail(job.folder_name)"
          type="button"
          :aria-label="selectMode ? t('history.selectJobAria', { job: job.folder_name }) : t('history.openJobAria', { job: job.folder_name })"
          class="motion-interactive w-full flex items-start justify-between p-5 text-left hover:bg-slate-50 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-inset"
        >
          <!-- Checkbox in select mode -->
          <div v-if="selectMode" class="flex-shrink-0 flex items-center mr-3 mt-0.5">
            <input
              type="checkbox"
              :checked="selected[job.folder_name]"
              @click.stop="toggleSelect(job.folder_name)"
              class="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
            />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-2 py-0.5 rounded-md text-xs font-bold" :class="statusClass(job.status)">
                {{ displayStatus(job.status) }}
              </span>
              <span class="text-[11px] font-medium text-slate-500 font-mono">{{ job.folder_name }}</span>
            </div>
            <div class="mt-1">
              <div v-if="editingHistoryId === job.folder_name" class="flex items-center gap-2">
                <input
                  v-model="editingTitle"
                  type="text"
                  :disabled="Boolean(renamePending[job.folder_name])"
                  class="w-full border border-indigo-300 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  @keydown.enter.prevent="saveRename(job)"
                  @keydown.esc.prevent="cancelRename"
                  @click.stop
                />
                <button
                  type="button"
                  class="text-xs font-semibold px-2 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
                  :disabled="Boolean(renamePending[job.folder_name])"
                  @click.stop="saveRename(job)"
                >
                  Save
                </button>
                <button
                  type="button"
                  class="text-xs font-semibold px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                  :disabled="Boolean(renamePending[job.folder_name])"
                  @click.stop="cancelRename"
                >
                  {{ t('history.cancel') }}
                </button>
              </div>
              <p v-else class="text-sm font-bold text-slate-800 truncate">
                {{ historyTitle(job) }}
              </p>
            </div>
            <p v-if="job.file_name" class="text-xs text-slate-500 mt-1">{{ job.file_name }}</p>
            <p v-if="job.created_at" class="text-xs text-slate-400 mt-0.5">{{ formatDate(job.created_at) }}</p>
          </div>
          <div v-if="!selectMode" class="flex items-center gap-2 mt-1 flex-shrink-0">
            <button
              type="button"
              class="motion-interactive text-xs font-semibold text-slate-600 hover:text-indigo-600 px-2 py-1 rounded-md hover:bg-indigo-50 disabled:opacity-50"
              :disabled="Boolean(renamePending[job.folder_name])"
              @click.stop="beginRename(job)"
            >
              {{ renamePending[job.folder_name] ? 'Saving…' : 'Rename' }}
            </button>
            <button
              v-if="isPending(job)"
              @click.stop="reRunJob(job)"
              :disabled="reRunning[job.folder_name]"
                class="motion-interactive bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold px-2.5 py-1 rounded-lg transition"
            >
            {{ reRunning[job.folder_name] ? t('history.rerunning') : t('history.rerun') }}
            </button>
            <span class="text-xs text-indigo-600 font-semibold">{{ t('history.open') }}</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import {
  getHistory,
  getJob,
  fetchDownloadText,
  fetchDownloadJson,
  fetchDownloadBlob,
  summarizeJob,
  visualizeJob,
  deleteJobs,
  renameHistory,
  GET_CACHE_TTL_MS
} from '../services/api.js'
import { normalizeFlashcardsPayload, normalizeChatHistoryPayload } from '../services/historyArtifacts'
import { normalizeHistoryResponse } from '../services/historyResponse.js'
import {
  getOfflineHistoryDetail,
  getOfflineHistoryList,
  getOfflineStorageStats,
  removeOfflineHistoryPackage,
  syncHistoryOfflinePackage
} from '../services/offlineManifest.js'
import { useAppStore } from '../stores/appStore'
import { isCapacitorNative } from '../services/authService'
import { useI18n } from '../i18n/index.js'
import { useJobStatus } from '../composables/useJobStatus.js'

const router = useRouter()
const store = useAppStore()
const { t } = useI18n()
const { statusClass, displayStatus, formatDate } = useJobStatus()

const jobs = ref(Array.isArray(store.state.historyCache) ? [...store.state.historyCache] : [])
const loading = ref(false)
const error = ref('')
const nativeApp = isCapacitorNative()
const syncingOfflineCache = ref(false)
const networkOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
const storageStats = ref({
  totalHistories: 0,
  downloadedHistories: 0,
  syncingHistories: 0,
  partialHistories: 0,
  storageBytes: 0
})
const reRunning = reactive({})
const renamePending = reactive({})
const editingHistoryId = ref('')
const editingTitle = ref('')
const searchQuery = ref('')

// ── Selection state ──────────────────────────────────────
const selectMode = ref(false)
const selected = reactive({})
const deleting = ref(false)
const showDeleteConfirm = ref(false)

const syncHistoryCaches = () => {
  store.state.historyCache = [...jobs.value]
  store.state.historySummaryCache = normalizeHistoryResponse({ jobs: jobs.value }).summary
}

const selectedCount = computed(() => Object.values(selected).filter(Boolean).length)

const allVisibleSelected = computed(() =>
  filteredJobs.value.length > 0 &&
  filteredJobs.value.every(j => selected[j.folder_name])
)

const someVisibleSelected = computed(() =>
  filteredJobs.value.some(j => selected[j.folder_name])
)

const toggleSelectMode = () => {
  selectMode.value = !selectMode.value
  if (!selectMode.value) {
    // clear selections when leaving select mode
    Object.keys(selected).forEach(k => delete selected[k])
  }
}

const toggleSelect = (folderName) => {
  selected[folderName] = !selected[folderName]
}

const toggleSelectAll = () => {
  if (allVisibleSelected.value) {
    filteredJobs.value.forEach(j => delete selected[j.folder_name])
  } else {
    filteredJobs.value.forEach(j => { selected[j.folder_name] = true })
  }
}

const confirmDelete = () => {
  if (selectedCount.value === 0) return
  showDeleteConfirm.value = true
}

const executeDelete = async () => {
  showDeleteConfirm.value = false
  const names = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([k]) => k)
  if (!names.length) return

  deleting.value = true
  error.value = ''
  try {
    await deleteJobs(names)
    await Promise.allSettled(names.map(name => removeOfflineHistoryPackage(name)))
    // Remove deleted entries from local state immediately
    jobs.value = jobs.value.filter(j => !names.includes(j.folder_name))
    syncHistoryCaches()
    names.forEach(k => delete selected[k])
    selectMode.value = false
  } catch (err) {
    error.value = err.message
  } finally {
    deleting.value = false
  }
}
// ─────────────────────────────────────────────────────────

const filteredJobs = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return jobs.value
  return jobs.value.filter(job =>
    String(historyTitle(job) || '').toLowerCase().includes(q) ||
    String(job.folder_name || '').toLowerCase().includes(q) ||
    String(job.file_name || '').toLowerCase().includes(q)
  )
})

const historyTitle = (job) => String(job?.title || job?.display_title || job?.file_name || job?.folder_name || '').trim()

const beginRename = (job) => {
  if (!job?.folder_name) return
  editingHistoryId.value = job.folder_name
  editingTitle.value = historyTitle(job)
}

const cancelRename = () => {
  editingHistoryId.value = ''
  editingTitle.value = ''
}

const saveRename = async (job) => {
  const historyId = job?.folder_name
  if (!historyId) return
  const normalized = String(editingTitle.value || '').trim().replace(/\s+/g, ' ')
  if (!normalized) {
    error.value = 'Title cannot be empty.'
    return
  }
  const duplicate = jobs.value.some(
    item => item?.folder_name !== historyId && historyTitle(item).toLowerCase() === normalized.toLowerCase()
  )
  if (duplicate) {
    error.value = 'Another history entry already uses this title.'
    return
  }
  const previousTitle = job.title
  const previousDisplayTitle = job.display_title
  if (normalized === historyTitle(job)) {
    cancelRename()
    return
  }
  error.value = ''
  renamePending[historyId] = true
  job.title = normalized
  job.display_title = normalized
  cancelRename()
  try {
    const response = await renameHistory(historyId, normalized)
    job.title = response?.title || normalized
    job.display_title = response?.title || normalized
    if (response?.updated_at) job.updated_at = response.updated_at
    syncHistoryCaches()
  } catch (err) {
    job.title = previousTitle
    job.display_title = previousDisplayTitle
    error.value = err.message
  } finally {
    renamePending[historyId] = false
  }
}

const isPending = (job) => {
  const status = job.status
  if (!status) return false
  if (typeof status === 'string') return status.toLowerCase() === 'pending'
  return Object.values(status).some(v => String(v).toLowerCase() === 'pending')
}

const getPendingStep = (job) => {
  const status = job.status
  if (typeof status === 'object' && status !== null) {
    if (String(status.summarize || '').toLowerCase() === 'pending') return 'summarize'
    if (String(status.visualize || '').toLowerCase() === 'pending') return 'visualize'
  }
  return 'summarize'
}

const loadHistory = async () => {
  loading.value = true
  error.value = ''
  try {
    const result = await getHistory({ cacheTtlMs: GET_CACHE_TTL_MS.HISTORY })
    const normalized = normalizeHistoryResponse(result)
    jobs.value = normalized.jobs
    store.state.historyCache = normalized.jobs
    store.state.historySummaryCache = normalized.summary
    syncHistoryDetailsForOffline(normalized.jobs)
  } catch (err) {
    const cached = Array.isArray(store.state.historyCache) ? store.state.historyCache : []
    if (cached.length) {
      jobs.value = [...cached]
      error.value = t('history.offlineMode')
    } else {
      const offlineJobs = await getOfflineHistoryList()
      if (offlineJobs.length) {
        jobs.value = normalizeHistoryResponse({ jobs: offlineJobs }).jobs
        error.value = t('history.offlineMode')
      } else {
        error.value = err.message
      }
    }
  } finally {
    loading.value = false
  }
}

const hasCachedDetailContent = (payload) => Boolean(
  payload &&
  typeof payload === 'object' &&
  (
    payload.summary ||
    payload.transcript ||
    (Array.isArray(payload.transcriptData) && payload.transcriptData.length) ||
    (Array.isArray(payload.flashcards) && payload.flashcards.length) ||
    (Array.isArray(payload.chatMessages) && payload.chatMessages.length)
  )
)

const saveHistoryDetailCache = (folderName, payload) => {
  if (!folderName || !hasCachedDetailContent(payload)) return
  store.state.historyDetailCache = {
    ...(store.state.historyDetailCache || {}),
    [folderName]: payload
  }
}

const syncSingleHistoryDetail = async (job) => {
  const folderName = job?.folder_name
  if (!folderName) return

  const manifestUpdatedAt = String(job?.updated_at || job?.created_at || '')
  const existing = store.state.historyDetailCache?.[folderName]
  if (
    hasCachedDetailContent(existing) &&
    existing.manifestUpdatedAt &&
    existing.manifestUpdatedAt === manifestUpdatedAt
  ) {
    return
  }

  const jobDetail = await getJob(folderName, { cacheTtlMs: 0 })
  await syncHistoryOfflinePackage(
    jobDetail,
    {
      fetchText: (artifactKey, options = {}) =>
        fetchDownloadText(folderName, artifactKey, {
          ...options,
          errorLabel: `Failed to sync ${artifactKey}`
        }),
      fetchJson: (artifactKey, options = {}) =>
        fetchDownloadJson(folderName, artifactKey, {
          ...options,
          errorLabel: `Failed to sync ${artifactKey}`
        }),
      fetchBlob: (artifactKey, options = {}) =>
        fetchDownloadBlob(folderName, artifactKey, {
          ...options,
          errorLabel: `Failed to sync ${artifactKey}`
        })
    }
  )
  const offlineDetail = await getOfflineHistoryDetail(folderName)

  const payload = {
    summary: typeof offlineDetail?.summary === 'string' ? offlineDetail.summary : (existing?.summary || ''),
    transcript: typeof offlineDetail?.transcript === 'string' ? offlineDetail.transcript : (existing?.transcript || ''),
    transcriptData: Array.isArray(offlineDetail?.transcriptData)
      ? offlineDetail.transcriptData
      : (Array.isArray(existing?.transcriptData) ? existing.transcriptData : []),
    flashcards: normalizeFlashcardsPayload(offlineDetail?.flashcards || existing?.flashcards),
    chatMessages: normalizeChatHistoryPayload(offlineDetail?.chatMessages || existing?.chatMessages),
    manifest: offlineDetail?.manifest || jobDetail || existing?.manifest || null,
    manifestUpdatedAt,
    updatedAt: new Date().toISOString()
  }

  saveHistoryDetailCache(folderName, payload)
  storageStats.value = await getOfflineStorageStats()
}

const syncHistoryDetailsForOffline = async (historyJobs = []) => {
  if (!nativeApp || !navigator.onLine) return
  if (!Array.isArray(historyJobs) || !historyJobs.length) return
  syncingOfflineCache.value = true
  try {
    const batchSize = 4
    for (let i = 0; i < historyJobs.length; i += batchSize) {
      const batch = historyJobs.slice(i, i + batchSize)
      await Promise.allSettled(batch.map(job => syncSingleHistoryDetail(job)))
    }
  } catch {
    // Keep history page usable if background sync fails.
  } finally {
    syncingOfflineCache.value = false
    storageStats.value = await getOfflineStorageStats()
  }
}

const handleOnlineSync = () => {
  networkOnline.value = true
  if (!syncingOfflineCache.value) {
    syncHistoryDetailsForOffline(jobs.value)
  }
}

const handleOfflineState = () => {
  networkOnline.value = false
}

const openJobDetail = (folderName) => {
  if (!folderName) return
  router.push(`/history/${encodeURIComponent(folderName)}`)
}

const reRunJob = async (job) => {
  const folderName = job.folder_name
  const fileName = job.file_name || ''
  const step = getPendingStep(job)
  reRunning[folderName] = true
  try {
    if (step === 'visualize') {
      await visualizeJob(folderName, fileName)
    } else {
      await summarizeJob(folderName, fileName)
      await visualizeJob(folderName, fileName)
    }
    await loadHistory()
  } catch (err) {
    error.value = err.message
  } finally {
    reRunning[folderName] = false
  }
}

onMounted(() => {
  loadHistory()
  getOfflineStorageStats().then(stats => { storageStats.value = stats }).catch(() => {})
  window.addEventListener('online', handleOnlineSync)
  window.addEventListener('offline', handleOfflineState)
})

onBeforeUnmount(() => {
  window.removeEventListener('online', handleOnlineSync)
  window.removeEventListener('offline', handleOfflineState)
})
</script>
