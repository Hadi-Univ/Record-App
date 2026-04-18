<template>
  <div class="space-y-6 pb-4">
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
          {{ loading ? 'Loading…' : 'Refresh' }}
        </button>
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
      v-else-if="!loading && !jobs.length && !error"
      class="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center"
    >
      <h3 class="text-base font-bold text-slate-700">No jobs yet</h3>
      <p class="text-sm text-slate-400 mt-1">Process your first audio file on the Home page.</p>
      <router-link
        to="/"
        class="inline-block mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition"
      >
        Go to Pipeline →
      </router-link>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="job in jobs"
        :key="job.folder_name"
        class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
      >
        <div
          @click="openJobDetail(job.folder_name)"
          @keydown.enter="openJobDetail(job.folder_name)"
          role="button"
          tabindex="0"
          class="w-full flex items-start justify-between p-5 text-left hover:bg-slate-50 transition cursor-pointer"
        >
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-2 py-0.5 rounded-md text-xs font-bold" :class="statusClass(job.status)">
                {{ displayStatus(job.status) }}
              </span>
              <span class="text-sm font-bold text-slate-800 font-mono">{{ job.folder_name }}</span>
            </div>
            <p v-if="job.file_name" class="text-xs text-slate-500 mt-1">{{ job.file_name }}</p>
            <p v-if="job.created_at" class="text-xs text-slate-400 mt-0.5">{{ formatDate(job.created_at) }}</p>
          </div>
          <div class="flex items-center gap-2 mt-1 flex-shrink-0">
            <button
              v-if="isPending(job)"
              @click.stop="reRunJob(job)"
              :disabled="reRunning[job.folder_name]"
              class="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold px-2.5 py-1 rounded-lg transition"
            >
              {{ reRunning[job.folder_name] ? 'Running…' : 'Re-run' }}
            </button>
            <span class="text-xs text-indigo-600 font-semibold">Open</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getHistory, summarizeJob, visualizeJob } from '../services/api.js'

const router = useRouter()

const jobs = ref([])
const loading = ref(false)
const error = ref('')
const reRunning = reactive({})

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
})
</script>
