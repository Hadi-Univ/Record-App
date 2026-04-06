<template>
  <div class="space-y-6 pb-4">
    <!-- Header -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 class="text-xl font-extrabold text-slate-900">Audio Pipeline</h1>
          <p class="text-sm text-slate-500 mt-1">Upload → Transcribe → Summarize → Visualize</p>
        </div>
        <span
          class="self-start md:self-auto px-3 py-1 rounded-lg text-xs font-bold uppercase"
          :class="statusBadgeClass"
        >
          {{ pipeline.status }}
        </span>
      </div>

      <!-- Progress Stepper -->
      <div class="mt-6">
        <Stepper :currentStep="pipeline.currentStep" :isRunning="pipeline.status === 'running'" />
      </div>
    </div>

    <!-- Error Banner -->
    <div
      v-if="pipeline.lastError"
      class="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3"
    >
      <span class="text-red-500 text-xl">⚠️</span>
      <div class="flex-1">
        <p class="text-sm font-semibold text-red-700">Pipeline Error</p>
        <p class="text-xs text-red-600 mt-1 font-mono break-all">{{ pipeline.lastError }}</p>
      </div>
      <button
        @click="pipeline.lastError = ''"
        class="text-red-400 hover:text-red-600 transition text-lg leading-none"
        aria-label="Dismiss error"
      >×</button>
    </div>

    <!-- Upload Section (Step 1) -->
    <div
      v-if="pipeline.currentStep === 1 || !pipeline.folderName"
      class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
    >
      <h2 class="text-base font-bold text-slate-900 mb-4">1. Select Audio File</h2>

      <div
        class="border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer"
        :class="dragOver
          ? 'border-indigo-400 bg-indigo-50'
          : 'border-slate-300 hover:border-indigo-300 hover:bg-slate-50'"
        @dragover.prevent="dragOver = true"
        @dragleave="dragOver = false"
        @drop.prevent="onDrop"
        @click="fileInputRef.click()"
      >
        <input
          ref="fileInputRef"
          type="file"
          accept="audio/*,video/mp4,video/mpeg,video/webm"
          class="hidden"
          @change="onFileChange"
        />
        <div v-if="!selectedFile">
          <div class="text-4xl mb-2">🎵</div>
          <p class="text-sm font-semibold text-slate-700">Drop your audio file here</p>
          <p class="text-xs text-slate-400 mt-1">or click to browse</p>
          <p class="text-xs text-slate-400 mt-2">Supports MP3, WAV, M4A, OGG, FLAC, MP4...</p>
        </div>
        <div v-else class="flex items-center justify-center gap-3">
          <span class="text-2xl">🎵</span>
          <div class="text-left">
            <p class="text-sm font-semibold text-slate-800">{{ selectedFile.name }}</p>
            <p class="text-xs text-slate-400">{{ formatSize(selectedFile.size) }}</p>
          </div>
          <button
            @click.stop="clearFile"
            class="ml-2 text-slate-400 hover:text-red-500 transition text-xl leading-none"
            aria-label="Remove file"
          >×</button>
        </div>
      </div>

      <button
        @click="startPipeline"
        :disabled="!selectedFile || pipeline.status === 'running'"
        class="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
      >
        <span v-if="pipeline.status === 'running'" class="flex items-center gap-2">
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Uploading &amp; Transcribing…
        </span>
        <span v-else>🚀 Start Pipeline</span>
      </button>
    </div>

    <!-- Resume Section (Steps 2-3) -->
    <div
      v-else-if="pipeline.folderName && pipeline.currentStep <= 3 && pipeline.status !== 'done'"
      class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
    >
      <div class="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 class="text-base font-bold text-slate-900">Current Job</h2>
          <p class="text-xs text-slate-500 font-mono mt-1">{{ pipeline.folderName }}</p>
        </div>
        <button
          @click="store.clearPipeline()"
          class="text-xs text-red-500 hover:text-red-700 font-semibold underline transition"
        >
          Start Over
        </button>
      </div>

      <!-- Step 2: Summarize -->
      <div v-if="pipeline.currentStep === 2" class="space-y-4">
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p class="text-xs text-emerald-700 font-semibold">✓ Transcription complete</p>
          <p v-if="pipeline.results.transcription" class="text-xs text-emerald-600 mt-1 line-clamp-3">
            {{ pipeline.results.transcription }}
          </p>
        </div>
        <button
          @click="runSummarize"
          :disabled="pipeline.status === 'running'"
          class="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
        >
          <span v-if="pipeline.status === 'running'" class="flex items-center gap-2">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Summarizing…
          </span>
          <span v-else>📝 Run Summarize</span>
        </button>
      </div>

      <!-- Step 3: Visualize -->
      <div v-if="pipeline.currentStep === 3" class="space-y-4">
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p class="text-xs text-emerald-700 font-semibold">✓ Summarization complete</p>
          <p v-if="pipeline.results.summary" class="text-xs text-emerald-600 mt-1 line-clamp-3">
            {{ pipeline.results.summary }}
          </p>
        </div>
        <button
          @click="runVisualize"
          :disabled="pipeline.status === 'running'"
          class="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
        >
          <span v-if="pipeline.status === 'running'" class="flex items-center gap-2">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Visualizing…
          </span>
          <span v-else>📊 Run Visualize</span>
        </button>
      </div>
    </div>

    <!-- Results Section (Step 4 / Done) -->
    <div
      v-if="pipeline.status === 'done' || pipeline.currentStep === 4"
      class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-base font-bold text-slate-900">Pipeline Results</h2>
          <p class="text-xs text-slate-500 font-mono mt-1">{{ pipeline.folderName }}</p>
        </div>
        <button
          @click="store.clearPipeline()"
          class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline transition"
        >
          New Job
        </button>
      </div>

      <!-- Transcription result -->
      <div v-if="pipeline.results.transcription" class="space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-700">📄 Transcription</h3>
          <a
            v-if="pipeline.folderName"
            :href="downloadUrl('transcript.txt')"
            download
            class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition"
          >
            ⬇ Download
          </a>
        </div>
        <div class="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed max-h-48 overflow-y-auto">
          {{ pipeline.results.transcription }}
        </div>
      </div>

      <!-- Summary result -->
      <div v-if="pipeline.results.summary" class="space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-700">📝 Summary</h3>
          <a
            v-if="pipeline.folderName"
            :href="downloadUrl('summary.txt')"
            download
            class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition"
          >
            ⬇ Download
          </a>
        </div>
        <div class="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed max-h-48 overflow-y-auto">
          {{ pipeline.results.summary }}
        </div>
      </div>

      <!-- Visualization result -->
      <div v-if="pipeline.results.mindmap_svg || pipeline.results.mindmap_html" class="space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-700">🧠 Mind Map</h3>
          <div class="flex gap-3">
            <a
              v-if="pipeline.folderName"
              :href="downloadUrl('mindmap.svg')"
              download
              class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition"
            >
              ⬇ SVG
            </a>
            <a
              v-if="pipeline.folderName"
              :href="downloadUrl('mindmap.html')"
              download
              class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition"
            >
              ⬇ HTML
            </a>
          </div>
        </div>
        <div
          v-if="pipeline.results.mindmap_svg"
          class="bg-white border border-slate-200 rounded-xl p-4 overflow-x-auto"
          v-html="pipeline.results.mindmap_svg"
        />
      </div>

      <!-- Keywords / Key Points -->
      <div v-if="pipeline.results.keywords && pipeline.results.keywords.length" class="space-y-2">
        <h3 class="text-sm font-bold text-slate-700">🔑 Key Points</h3>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="kw in pipeline.results.keywords"
            :key="kw"
            class="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full"
          >
            {{ kw }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Stepper from '../components/Stepper.vue'
import { useAppStore } from '../stores/appStore'
import * as api from '../services/api.js'

const store = useAppStore()
const pipeline = store.state.pipeline

const fileInputRef = ref(null)
const selectedFile = ref(null)
const dragOver = ref(false)

const statusBadgeClass = computed(() => {
  const s = pipeline.status
  if (s === 'running') return 'bg-indigo-100 text-indigo-700'
  if (s === 'error') return 'bg-red-100 text-red-700'
  if (s === 'done') return 'bg-emerald-100 text-emerald-700'
  return 'bg-slate-100 text-slate-500'
})

const onFileChange = (e) => {
  selectedFile.value = e.target.files[0] || null
}

const onDrop = (e) => {
  dragOver.value = false
  const file = e.dataTransfer.files[0]
  if (file) selectedFile.value = file
}

const clearFile = () => {
  selectedFile.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const downloadUrl = (filename) => {
  return api.getDownloadUrl(pipeline.folderName, filename)
}

const startPipeline = async () => {
  if (!selectedFile.value) return

  pipeline.status = 'running'
  pipeline.currentStep = 1
  pipeline.lastError = ''

  try {
    // Step 1: Upload + Transcribe
    const transcribeResult = await api.uploadAndTranscribe(selectedFile.value)
    pipeline.folderName = transcribeResult.folder_name || transcribeResult.folderName || ''
    pipeline.fileName = selectedFile.value.name
    pipeline.results = {
      ...pipeline.results,
      transcription: transcribeResult.transcript || transcribeResult.transcription || ''
    }
    pipeline.currentStep = 2
    pipeline.status = 'idle'
  } catch (err) {
    pipeline.status = 'error'
    pipeline.lastError = err.message
    return
  }

  // Automatically continue to summarize
  await runSummarize()
}

const runSummarize = async () => {
  if (!pipeline.folderName) return

  pipeline.status = 'running'
  pipeline.lastError = ''

  try {
    const summarizeResult = await api.summarizeJob(pipeline.folderName)
    pipeline.results = {
      ...pipeline.results,
      summary: summarizeResult.summary || '',
      keywords: summarizeResult.keywords || []
    }
    pipeline.currentStep = 3
    pipeline.status = 'idle'
  } catch (err) {
    pipeline.status = 'error'
    pipeline.lastError = err.message
    return
  }

  // Automatically continue to visualize
  await runVisualize()
}

const runVisualize = async () => {
  if (!pipeline.folderName) return

  pipeline.status = 'running'
  pipeline.lastError = ''

  try {
    const visualizeResult = await api.visualizeJob(pipeline.folderName)
    pipeline.results = {
      ...pipeline.results,
      mindmap_svg: visualizeResult.svg || visualizeResult.mindmap_svg || '',
      mindmap_html: visualizeResult.html || visualizeResult.mindmap_html || ''
    }
    pipeline.currentStep = 4
    pipeline.status = 'done'
  } catch (err) {
    pipeline.status = 'error'
    pipeline.lastError = err.message
  }
}
</script>
