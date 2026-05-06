<template>
  <div class="space-y-6 pb-6">

    <!-- ─── Greeting Hero ─── -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p class="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">{{ timeOfDay }}</p>
          <h1 class="text-2xl font-extrabold text-slate-900">
            {{ userName ? t('home.welcomeBackName', { name: userName }) : t('home.welcomeBack') }}
          </h1>
          <p class="text-sm text-slate-500 mt-1">{{ t('home.readyToProcess') }}</p>
        </div>
        <router-link
          to="/pipeline"
          class="self-start md:self-auto inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl transition shadow-sm text-sm"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {{ t('home.startPipeline') }}
        </router-link>
      </div>

      <!-- Quick Stats -->
      <div class="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div class="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{{ t('home.totalJobs') }}</p>
          <p class="text-2xl font-extrabold text-slate-800">{{ totalJobs }}</p>
        </div>
        <div class="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <p class="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">{{ t('home.completed') }}</p>
          <p class="text-2xl font-extrabold text-emerald-700">{{ completedJobs }}</p>
        </div>
        <div class="bg-amber-50 rounded-xl p-4 border border-amber-100 col-span-2 sm:col-span-1">
          <p class="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">{{ t('home.pending') }}</p>
          <p class="text-2xl font-extrabold text-amber-700">{{ pendingJobs }}</p>
        </div>
      </div>
    </div>

    <!-- ─── Pipeline In Progress Banner ─── -->
    <div
      v-if="showPipelineBanner"
      class="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between gap-3"
    >
      <div class="flex items-center gap-3">
        <svg class="w-5 h-5 text-indigo-600 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <div>
          <p class="text-sm font-bold text-indigo-800">{{ t('home.pipelineRunning') }}</p>
          <p class="text-xs text-indigo-600 font-mono mt-0.5">{{ pipeline.folderName }}</p>
        </div>
      </div>
      <router-link
        to="/pipeline"
        class="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-3 py-1.5 rounded-lg transition"
      >
        {{ t('home.viewPipeline') }}
      </router-link>
    </div>

    <!-- ─── Recent Jobs ─── -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2 class="text-sm font-bold text-slate-800">{{ t('home.recentJobs') }}</h2>
        </div>
        <router-link
          to="/history"
          class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
        >
          View all →
        </router-link>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="divide-y divide-slate-100">
        <div v-for="n in 3" :key="n" class="p-5 animate-pulse flex items-center gap-4">
          <div class="w-16 h-5 bg-slate-200 rounded-full"/>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-slate-200 rounded w-1/3"/>
            <div class="h-3 bg-slate-100 rounded w-1/4"/>
          </div>
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="p-6 flex items-start gap-3">
        <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <p class="text-sm text-red-700 font-semibold">{{ error }}</p>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!recentJobs.length"
        class="p-12 text-center"
      >
        <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
          </svg>
        </div>
        <h3 class="text-sm font-bold text-slate-700 mb-1">{{ t('home.noJobsYet') }}</h3>
        <p class="text-xs text-slate-400 mb-4">{{ t('home.startFirstJob') }}</p>
        <router-link
          to="/pipeline"
          class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {{ t('home.startPipeline') }}
        </router-link>
      </div>

      <!-- Job list -->
      <div v-else class="divide-y divide-slate-100">
        <div
          v-for="job in recentJobs"
          :key="job.folder_name"
          @click="openJob(job.folder_name)"
          @keydown.enter="openJob(job.folder_name)"
          role="button"
          tabindex="0"
          class="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition cursor-pointer group"
        >
          <div class="flex items-center gap-3 min-w-0">
            <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold flex-shrink-0" :class="statusClass(job.status)">
              {{ displayStatus(job.status) }}
            </span>
            <div class="min-w-0">
              <p class="text-sm font-bold text-slate-800 font-mono truncate">{{ job.folder_name }}</p>
              <p v-if="job.created_at" class="text-xs text-slate-400 mt-0.5">{{ formatDate(job.created_at) }}</p>
            </div>
          </div>
          <svg class="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- ─── Quick Actions ─── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <router-link
        to="/pipeline"
        class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-4 hover:border-indigo-300 hover:shadow transition group"
      >
        <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 transition">
          <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div>
          <p class="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition">{{ t('pipeline.title') }}</p>
          <p class="text-xs text-slate-400 mt-0.5">{{ t('pipeline.subtitle') }}</p>
        </div>
      </router-link>

      <router-link
        to="/history"
        class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-4 hover:border-indigo-300 hover:shadow transition group"
      >
        <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200 transition">
          <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div>
          <p class="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition">{{ t('history.title') }}</p>
          <p class="text-xs text-slate-400 mt-0.5">{{ t('history.subtitle') }}</p>
        </div>
      </router-link>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/appStore'
import { getHistory } from '../services/api.js'
import { useI18n } from '../i18n/index.js'

const store = useAppStore()
const router = useRouter()
const pipeline = store.state.pipeline
const { t } = useI18n()

// ── Pipeline banner ────────────────────────────────────────────────────
const showPipelineBanner = computed(() =>
  pipeline.status === 'running' ||
  (pipeline.folderName && pipeline.currentStep < 4 && pipeline.status !== 'idle' && pipeline.status !== 'done')
)

const jobs = ref(Array.isArray(store.state.historyCache) ? [...store.state.historyCache] : [])
const loading = ref(false)
const error = ref('')

// ── Greeting ──────────────────────────────────────────────────────────
const userName = computed(() => store.state.user?.name || '')

const timeOfDay = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return t('home.night')
  if (h < 12) return t('home.morning')
  if (h < 18) return t('home.afternoon')
  return t('home.evening')
})

// ── Stats helpers ─────────────────────────────────────────────────────
const extractStatusString = (status) =>
  typeof status === 'string' ? status
    : status?.visualize || status?.summarize || status?.transcribe || 'unknown'

// ── Stats ──────────────────────────────────────────────────────────────
const totalJobs = computed(() => jobs.value.length)

const completedJobs = computed(() =>
  jobs.value.filter(j => ['done', 'completed'].includes(extractStatusString(j.status).toLowerCase())).length
)

const pendingJobs = computed(() =>
  jobs.value.filter(j => {
    if (!j.status) return false
    if (typeof j.status === 'string') return j.status.toLowerCase() === 'pending'
    return Object.values(j.status).some(v => String(v).toLowerCase() === 'pending')
  }).length
)

// ── Recent jobs (5 most recent) ─────────────────────────────────────
const recentJobs = computed(() => jobs.value.slice(0, 5))

// ── Status helpers ────────────────────────────────────────────────────
const statusClass = (status) => {
  const map = {
    done: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-emerald-100 text-emerald-700',
    error: 'bg-red-100 text-red-700',
    failed: 'bg-red-100 text-red-700',
    running: 'bg-indigo-100 text-indigo-700',
    processing: 'bg-indigo-100 text-indigo-700',
    pending: 'bg-amber-100 text-amber-700'
  }
  return map[String(extractStatusString(status)).toLowerCase()] || 'bg-slate-100 text-slate-600'
}

const displayStatus = (status) => String(extractStatusString(status)).toUpperCase()

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dateStr))
  } catch { return dateStr }
}

// ── Navigation ─────────────────────────────────────────────────────────
const openJob = (folderName) => {
  if (!folderName) return
  router.push(`/history/${encodeURIComponent(folderName)}`)
}

// ── Data fetch ─────────────────────────────────────────────────────────
const loadHistory = async () => {
  loading.value = true
  error.value = ''
  try {
    const result = await getHistory()
    const normalized = Array.isArray(result) ? result : (result.jobs || result.data || [])
    jobs.value = normalized
    store.state.historyCache = normalized
  } catch (err) {
    const cached = Array.isArray(store.state.historyCache) ? store.state.historyCache : []
    if (cached.length) {
      jobs.value = [...cached]
    } else {
      error.value = err.message
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadHistory()
})
</script>
