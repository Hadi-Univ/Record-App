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
        <div
          @click="toggleJob(job.folder_name)"
          @keydown.enter="toggleJob(job.folder_name)"
          role="button"
          tabindex="0"
          class="w-full flex items-start justify-between p-5 text-left hover:bg-slate-50 transition cursor-pointer"
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
          <div class="flex items-center gap-2 mt-1 flex-shrink-0">
            <!-- Re-run button (only for pending jobs) -->
            <button
              v-if="isPending(job)"
              @click.stop="reRunJob(job)"
              :disabled="reRunning[job.folder_name]"
              class="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold px-2.5 py-1 rounded-lg transition"
            >
              <svg v-if="reRunning[job.folder_name]" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {{ reRunning[job.folder_name] ? 'Running…' : 'Re-run' }}
            </button>
            <svg
              class="w-5 h-5 text-slate-400 flex-shrink-0 transition-transform"
              :class="expandedJobs.has(job.folder_name) ? 'rotate-180' : ''"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

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

          <!-- Detail load error -->
          <div v-else-if="jobDetails[job.folder_name]?.error" class="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-semibold flex items-center gap-2">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            {{ jobDetails[job.folder_name].error }}
          </div>

          <template v-else-if="jobDetails[job.folder_name]">
            <!-- Re-run error -->
            <div v-if="reRunError[job.folder_name]" class="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-semibold flex items-center gap-2">
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              {{ reRunError[job.folder_name] }}
            </div>

            <!-- Transcription -->
            <div v-if="jobDetails[job.folder_name].transcript" class="space-y-1.5">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Transcript
                </h4>
                <a
                  v-if="job.file_name"
                  :href="getDownloadUrl(job.folder_name, baseName(job.file_name) + '.txt')"
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
                <div v-if="job.file_name" class="flex gap-2">
                  <a
                    :href="getDownloadUrl(job.folder_name, baseName(job.file_name) + '_final_summary.txt')"
                    download
                    class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition flex items-center gap-1"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    TXT
                  </a>
                  <a
                    :href="getDownloadUrl(job.folder_name, baseName(job.file_name) + '_final_summary.html')"
                    download
                    class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition flex items-center gap-1"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    HTML
                  </a>
                </div>
              </div>
              <div class="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 leading-relaxed max-h-32 overflow-y-auto">
                {{ jobDetails[job.folder_name].summary }}
              </div>
            </div>

            <!-- Audio Player -->
            <div v-if="job.file_name" class="space-y-1.5">
              <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>
                Audio
              </h4>
              <audio
                controls
                class="w-full rounded-lg"
                :src="getDownloadUrl(job.folder_name, baseName(job.file_name) + '.wav')"
              />
            </div>

            <!-- Visualization (PNG) -->
            <div v-if="job.file_name" class="space-y-1.5">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  Visualization
                </h4>
                <a
                  :href="getDownloadUrl(job.folder_name, baseName(job.file_name) + '.png')"
                  download
                  class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition flex items-center gap-1"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  PNG
                </a>
              </div>
              <img
                :src="getDownloadUrl(job.folder_name, baseName(job.file_name) + '.png')"
                class="w-full rounded-xl border border-slate-200"
                alt="Visualization"
                @error="$event.target.style.display = 'none'"
              />
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
                  v-for="artifact in artifactsForJob(job)"
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
import { getHistory, getJob, getDownloadUrl, summarizeJob, visualizeJob } from '../services/api.js'
import { baseName } from '../utils/fileUtils.js'

const store = useAppStore()

const jobs = ref([])
const loading = ref(false)
const error = ref('')
const expandedJobs = reactive(new Set())
const jobDetails = reactive({})
const reRunning = reactive({})
const reRunError = reactive({})

const artifactsForJob = (job) => {
  const base = baseName(job.file_name)
  if (!base) return []
  return [
    { file: `${base}.wav`, label: 'Audio (WAV)' },
    { file: `${base}.txt`, label: 'Transcript (TXT)' },
    { file: `${base}.json`, label: 'Transcript (JSON)' },
    { file: `${base}.png`, label: 'Visualization (PNG)' },
    { file: `${base}_final_summary.txt`, label: 'Summary (TXT)' },
    { file: `${base}_final_summary.html`, label: 'Summary (HTML)' },
    { file: 'manifest.json', label: 'Manifest' }
  ]
}

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

const normalizeDetail = (detail) => {
  const results = detail.results || {}
  return {
    ...detail,
    transcript: detail.transcript ?? detail.transcription ?? results.transcript ?? results.transcription ?? '',
    summary: detail.summary ?? results.summary ?? '',
    keywords: detail.keywords ?? results.keywords ?? [],
    mindmap_svg: detail.mindmap_svg ?? results.mindmap_svg ?? '',
    mindmap_html: detail.mindmap_html ?? results.mindmap_html ?? ''
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
      jobDetails[folderName] = normalizeDetail(detail)
    } catch (err) {
      jobDetails[folderName] = { error: err.message }
    }
  }
}

const reRunJob = async (job) => {
  const folderName = job.folder_name
  const fileName = job.file_name || ''
  const step = getPendingStep(job)

  reRunning[folderName] = true
  reRunError[folderName] = ''

  try {
    if (step === 'visualize') {
      await visualizeJob(folderName, fileName)
    } else {
      try {
        await summarizeJob(folderName, fileName)
      } catch (err) {
        throw new Error(`Summarize step failed: ${err.message}`)
      }
      try {
        await visualizeJob(folderName, fileName)
      } catch (err) {
        throw new Error(`Visualize step failed: ${err.message}`)
      }
    }
    // Invalidate cached details and refresh the history list
    delete jobDetails[folderName]
    await loadHistory()
    // Collapse the job row so the updated status badge is clearly visible
    expandedJobs.delete(folderName)
  } catch (err) {
    reRunError[folderName] = err.message
  } finally {
    reRunning[folderName] = false
  }
}

onMounted(() => {
  loadHistory()
})
</script>
