<template>
  <div class="space-y-6 pb-4">
    <!-- Header -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-extrabold text-slate-900">History</h1>
          <p class="text-sm text-slate-500 mt-1">Your past audio processing jobs.</p>
        </div>
        <button
          @click="loadHistory"
          :disabled="loading"
          class="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-xl text-sm transition disabled:opacity-50"
        >
          <svg
            class="w-4 h-4"
            :class="loading ? 'animate-spin' : ''"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ loading ? 'Loading…' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 font-semibold flex items-center gap-2"
    >
      <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
      {{ error }}
    </div>

    <!-- Loading skeleton -->
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

    <!-- Empty state -->
    <div
      v-else-if="!loading && !jobs.length && !error"
      class="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center"
    >
      <div class="flex justify-center mb-3">
        <svg class="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
        </svg>
      </div>
      <h3 class="text-base font-bold text-slate-700">No jobs yet</h3>
      <p class="text-sm text-slate-400 mt-1">Process your first audio file on the Home page.</p>
      <router-link
        to="/"
        class="inline-block mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition"
      >
        Go to Pipeline →
      </router-link>
    </div>

    <!-- Job List -->
    <div v-else class="space-y-4">
      <div
        v-for="job in jobs"
        :key="job.folder_name"
        class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
      >
        <!-- Job Header -->
        <button
          @click="toggleJob(job.folder_name)"
          class="w-full flex items-start justify-between p-5 text-left hover:bg-slate-50 transition"
        >
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span
                class="px-2 py-0.5 rounded-md text-xs font-bold"
                :class="statusClass(job.status)"
              >
                {{ displayStatus(job.status) }}
              </span>
              <span class="text-sm font-bold text-slate-800 font-mono">{{ job.folder_name }}</span>
            </div>
            <p v-if="job.file_name" class="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <svg class="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
              {{ job.file_name }}
            </p>
            <p v-if="job.created_at" class="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              {{ formatDate(job.created_at) }}
            </p>
          </div>
          <svg
            class="w-5 h-5 text-slate-400 mt-1 flex-shrink-0 transition-transform"
            :class="expandedJobs.has(job.folder_name) ? 'rotate-180' : ''"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Job Details (expanded) -->
        <div
          v-if="expandedJobs.has(job.folder_name)"
          class="border-t border-slate-100 p-5 space-y-4"
        >
          <!-- Loading detail -->
          <div v-if="jobDetails[job.folder_name]?.loading" class="flex items-center gap-2 text-sm text-slate-500">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading details…
          </div>

          <template v-else-if="jobDetails[job.folder_name]">
            <!-- Transcription -->
            <div v-if="jobDetails[job.folder_name].transcript" class="space-y-1.5">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Transcript
                </h4>
                <a
                  :href="getDownloadUrl(job.folder_name, 'transcript')"
                  download
                  class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition flex items-center gap-1"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  Download
                </a>
              </div>
              <div class="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 leading-relaxed max-h-32 overflow-y-auto">
                {{ jobDetails[job.folder_name].transcript }}
              </div>
            </div>

            <!-- Summary -->
            <div v-if="jobDetails[job.folder_name].summary" class="space-y-1.5">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h10"/></svg>
                  Summary
                </h4>
                <a
                  :href="getDownloadUrl(job.folder_name, 'summary')"
                  download
                  class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition flex items-center gap-1"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  Download
                </a>
              </div>
              <div class="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 leading-relaxed max-h-32 overflow-y-auto">
                {{ jobDetails[job.folder_name].summary }}
              </div>
            </div>

            <!-- Keywords -->
            <div
              v-if="jobDetails[job.folder_name].keywords?.length"
              class="space-y-1.5"
            >
              <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/></svg>
                Keywords
              </h4>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="kw in jobDetails[job.folder_name].keywords"
                  :key="kw"
                  class="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full"
                >{{ kw }}</span>
              </div>
            </div>

            <!-- Artifacts downloads -->
            <div class="space-y-1.5">
              <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                Artifacts
              </h4>
              <div class="flex flex-wrap gap-2">
                <a
                  v-for="artifact in artifactList"
                  :key="artifact.file"
                  :href="getDownloadUrl(job.folder_name, artifact.file)"
                  download
                  class="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  {{ artifact.label }}
                </a>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAppStore } from '../stores/appStore'
import { getHistory, getJob, getDownloadUrl } from '../services/api.js'

const store = useAppStore()

const jobs = ref([])
const loading = ref(false)
const error = ref('')
const expandedJobs = reactive(new Set())
const jobDetails = reactive({})

const artifactList = [
  { file: 'transcript', label: 'Transcript' },
  { file: 'summary', label: 'Summary' },
  { file: 'mindmap_svg', label: 'Mind Map SVG' },
  { file: 'mindmap_html', label: 'Mind Map HTML' }
]

const statusClass = (status) => {
  const map = {
    done: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-emerald-100 text-emerald-700',
    error: 'bg-red-100 text-red-700',
    failed: 'bg-red-100 text-red-700',
    running: 'bg-indigo-100 text-indigo-700',
    processing: 'bg-indigo-100 text-indigo-700'
  }
  const normalized =
    typeof status === 'string' ? status
      : status?.visualize || status?.summarize || status?.transcribe || 'unknown'
  return map[String(normalized).toLowerCase()] || 'bg-slate-100 text-slate-600'
}

const displayStatus = (status) => {
  const normalized =
    typeof status === 'string'
      ? status
      : status?.visualize || status?.summarize || status?.transcribe || 'unknown'
  return String(normalized).toUpperCase()
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

const loadHistory = async () => {
  loading.value = true
  error.value = ''
  try {
    const result = await getHistory()
    jobs.value = Array.isArray(result) ? result : (result.jobs || result.data || [])
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const toggleJob = async (folderName) => {
  if (expandedJobs.has(folderName)) {
    expandedJobs.delete(folderName)
    return
  }

  expandedJobs.add(folderName)

  if (!jobDetails[folderName]) {
    jobDetails[folderName] = { loading: true }
    try {
      const detail = await getJob(folderName)
      jobDetails[folderName] = detail
    } catch (err) {
      jobDetails[folderName] = { error: err.message }
    }
  }
}

onMounted(() => {
  loadHistory()
})
</script>
