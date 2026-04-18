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
      <span class="text-red-500 flex-shrink-0 mt-0.5">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
      </span>
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

    <!-- Upload / Record Section (Step 1) -->
    <div
      v-if="pipeline.currentStep === 1 || !pipeline.folderName"
      class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
    >
      <h2 class="text-base font-bold text-slate-900 mb-4">1. Provide Audio</h2>

      <!-- Mode Toggle -->
      <div class="flex rounded-xl overflow-hidden border border-slate-200 mb-5 text-sm font-semibold">
        <button
          @click="switchMode('upload')"
          class="flex-1 py-2 flex items-center justify-center gap-1.5 transition"
          :class="inputMode === 'upload'
            ? 'bg-indigo-600 text-white'
            : 'bg-white text-slate-500 hover:bg-slate-50'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
          Upload File
        </button>
        <button
          @click="switchMode('record')"
          class="flex-1 py-2 flex items-center justify-center gap-1.5 transition"
          :class="inputMode === 'record'
            ? 'bg-indigo-600 text-white'
            : 'bg-white text-slate-500 hover:bg-slate-50'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
          </svg>
          Record Audio
        </button>
      </div>

      <!-- Upload Mode -->
      <div v-if="inputMode === 'upload'">
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
            <div class="flex justify-center mb-2">
              <svg class="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
              </svg>
            </div>
            <p class="text-sm font-semibold text-slate-700">Drop your audio file here</p>
            <p class="text-xs text-slate-400 mt-1">or click to browse</p>
            <p class="text-xs text-slate-400 mt-2">Supports MP3, WAV, M4A, OGG, FLAC, MP4...</p>
          </div>
          <div v-else class="flex items-center justify-center gap-3">
            <svg class="w-6 h-6 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
            </svg>
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
      </div>

      <!-- Record Mode -->
      <div v-else class="space-y-4">
        <!-- Mic permission error -->
        <div v-if="recordError" class="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 font-medium">
          {{ recordError }}
        </div>

        <!-- Idle: show start button -->
        <div v-if="!isRecording && !audioBlob" class="flex flex-col items-center gap-3 py-6">
          <button
            @click="startRecording"
            class="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition flex items-center justify-center shadow-lg"
            aria-label="Start recording"
          >
            <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1a4 4 0 014 4v7a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v7a2 2 0 004 0V5a2 2 0 00-2-2zM8.5 19.5A7.5 7.5 0 0019 12h2a9.5 9.5 0 01-9.5 9.5v2h-1v-2A9.5 9.5 0 013 12h2a7.5 7.5 0 005.5 7.326V21H8.5v-1.5z"/>
            </svg>
          </button>
          <p class="text-sm text-slate-500">Tap to start recording</p>
        </div>

        <!-- Recording in progress -->
        <div v-else-if="isRecording" class="space-y-3">
          <!-- Audio spectrum visualizer -->
          <AudioSpectrum :stream="micStream" :active="isRecording" />

          <!-- Timer + Stop row -->
          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-2">
              <span class="text-base font-mono font-bold text-slate-800 tabular-nums">
                {{ formatRecordingTime(recordingSeconds) }}
              </span>
              <span class="text-xs text-slate-400">Recording…</span>
            </div>
            <button
              @click="stopRecording"
              class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold transition flex items-center gap-2"
              aria-label="Stop recording"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
              Stop
            </button>
          </div>
        </div>

        <!-- Recording done: preview + actions -->
        <div v-else-if="audioBlob" class="space-y-3">
          <div class="bg-slate-50 rounded-xl p-4 flex flex-col gap-3">
            <div class="flex items-center gap-2 text-sm text-slate-700 font-semibold">
              <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
              Recording ready ({{ formatRecordingTime(recordingSeconds) }})
            </div>
            <audio :src="audioBlobUrl" controls class="w-full h-10 rounded"></audio>
          </div>
          <div class="flex gap-2">
            <button
              @click="discardRecording"
              class="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
            >
              Discard
            </button>
          </div>
        </div>
      </div>

      <button
        @click="startPipeline"
        :disabled="!canStartPipeline || pipeline.status === 'running'"
        class="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
      >
        <span v-if="pipeline.status === 'running'" class="flex items-center gap-2">
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Uploading &amp; Transcribing…
        </span>
        <span v-else class="flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Start Pipeline
        </span>
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
          <p class="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            Transcription complete</p>
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
          <span v-else class="flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Run Summarize
          </span>
        </button>
      </div>

      <!-- Step 3: Visualize -->
      <div v-if="pipeline.currentStep === 3" class="space-y-4">
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p class="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            Summarization complete</p>
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
          <span v-else class="flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
            </svg>
            Run Visualize
          </span>
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
          <h3 class="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Transcription
          </h3>
          <a
            v-if="pipeline.folderName"
            :href="downloadUrl('transcript')"
            download
            class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition flex items-center gap-1"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Download
          </a>
        </div>
        <div class="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed max-h-48 overflow-y-auto">
          {{ pipeline.results.transcription }}
        </div>
      </div>

      <!-- Summary result -->
      <div v-if="pipeline.results.summary" class="space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h10"/></svg>
            Summary
          </h3>
          <div v-if="pipeline.folderName" class="flex gap-3">
            <a
              :href="downloadUrl('summary')"
              download
              class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition flex items-center gap-1"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              TXT
            </a>
            <a
              :href="downloadUrl('summary_html')"
              download
              class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition flex items-center gap-1"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              HTML
            </a>
          </div>
        </div>
        <div class="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed max-h-48 overflow-y-auto">
          {{ pipeline.results.summary }}
        </div>
      </div>

      <!-- Visualization result -->
      <div v-if="pipeline.results.mindmap_svg || pipeline.folderName" class="space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Visualization
          </h3>
          <div v-if="pipeline.folderName" class="flex gap-3">
            <a
              :href="downloadUrl('mindmap_png')"
              download
              class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition flex items-center gap-1"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              PNG
            </a>
          </div>
        </div>
        <!-- Prefer inline SVG if returned by the API, otherwise show PNG -->
        <div
          v-if="pipeline.results.mindmap_svg"
          class="bg-white border border-slate-200 rounded-xl p-4 overflow-x-auto"
          v-html="pipeline.results.mindmap_svg"
        />
        <img
          v-else-if="pipeline.folderName"
          :src="downloadUrl('mindmap_png')"
          class="w-full rounded-xl border border-slate-200"
          alt="Visualization"
          @error="$event.target.style.display = 'none'"
        />
      </div>

      <!-- Keywords / Key Points -->
      <div v-if="pipeline.results.keywords && pipeline.results.keywords.length" class="space-y-2">
        <h3 class="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/></svg>
          Key Points
        </h3>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Stepper from '../components/Stepper.vue'
import AudioSpectrum from '../components/AudioSpectrum.vue'
import { useAppStore } from '../stores/appStore'
import * as api from '../services/api.js'

const store = useAppStore()
const pipeline = store.state.pipeline

const fileInputRef = ref(null)
const selectedFile = ref(null)
const dragOver = ref(false)

// Record mode state
const inputMode = ref('upload') // 'upload' | 'record'
const isRecording = ref(false)
const audioBlob = ref(null)
const audioBlobUrl = ref(null)
const recordingSeconds = ref(0)
const recordError = ref('')
let mediaRecorder = null
let audioChunks = []
let recordingTimer = null
const micStream = ref(null)

const canStartPipeline = computed(() =>
  inputMode.value === 'upload' ? !!selectedFile.value : !!audioBlob.value
)

const switchMode = (mode) => {
  inputMode.value = mode
  if (mode === 'upload') {
    discardRecording()
  } else {
    clearFile()
  }
}

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

const formatRecordingTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const startRecording = async () => {
  recordError.value = ''
  audioChunks = []
  try {
    micStream.value = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch (err) {
    console.error('Microphone access error:', err)
    recordError.value = 'Microphone access denied. Please allow microphone permissions and try again.'
    return
  }

  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : ''

  mediaRecorder = mimeType
    ? new MediaRecorder(micStream.value, { mimeType })
    : new MediaRecorder(micStream.value)

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) audioChunks.push(e.data)
  }

  mediaRecorder.onstop = () => {
    const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' })
    audioBlob.value = blob
    audioBlobUrl.value = URL.createObjectURL(blob)
    releaseMicStream()
  }

  mediaRecorder.start(250)
  isRecording.value = true
  recordingSeconds.value = 0
  recordingTimer = setInterval(() => { recordingSeconds.value++ }, 1000)
}

const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  clearInterval(recordingTimer)
  recordingTimer = null
  isRecording.value = false
}

const discardRecording = () => {
  stopRecording()
  if (audioBlobUrl.value) {
    URL.revokeObjectURL(audioBlobUrl.value)
    audioBlobUrl.value = null
  }
  audioBlob.value = null
  recordingSeconds.value = 0
  recordError.value = ''
}

const releaseMicStream = () => {
  if (micStream.value) {
    micStream.value.getTracks().forEach((t) => t.stop())
    micStream.value = null
  }
}

onUnmounted(() => {
  discardRecording()
  releaseMicStream()
})

const downloadUrl = (type) => {
  if (type === 'transcript') return api.getDownloadUrl(pipeline.folderName, 'transcript_txt')
  if (type === 'summary') return api.getDownloadUrl(pipeline.folderName, 'summary_txt')
  if (type === 'summary_html') return api.getDownloadUrl(pipeline.folderName, 'summary_html')
  if (type === 'mindmap_png') return api.getDownloadUrl(pipeline.folderName, 'image')
  return api.getDownloadUrl(pipeline.folderName, type)
}

const isDoneStatus = (statusValue) => String(statusValue || '').toLowerCase() === 'done'

const syncPipelineFromManifest = (jobDetail) => {
  const status = jobDetail?.status || {}
  const transcribeDone = isDoneStatus(status.transcribe)
  const summarizeDone = isDoneStatus(status.summarize)
  const visualizeDone = isDoneStatus(status.visualize)

  pipeline.folderName = jobDetail?.folder_name || pipeline.folderName
  pipeline.fileName = jobDetail?.file_name || pipeline.fileName

  if (visualizeDone) {
    pipeline.currentStep = 4
    pipeline.status = 'done'
    return 'visualize'
  }

  if (summarizeDone) {
    pipeline.currentStep = 3
    pipeline.status = 'idle'
    return 'summarize'
  }

  if (transcribeDone) {
    pipeline.currentStep = 2
    pipeline.status = 'idle'
    return 'transcribe'
  }

  pipeline.currentStep = 1
  pipeline.status = 'idle'
  return 'none'
}

const recoverPipelineAfterRefresh = async () => {
  const wasRunningBeforeReload = pipeline.status === 'running'

  if (wasRunningBeforeReload && !pipeline.folderName) {
    pipeline.status = 'error'
    pipeline.lastError = 'Pipeline was interrupted before job info was saved. Please start again.'
    return
  }

  if (!pipeline.folderName) return

  try {
    const jobDetail = await api.getJob(pipeline.folderName)
    const lastCompletedStep = syncPipelineFromManifest(jobDetail)
    if (!wasRunningBeforeReload) return

    if (lastCompletedStep === 'transcribe') {
      await runSummarize()
      return
    }

    if (lastCompletedStep === 'summarize') {
      await runVisualize()
    }
  } catch (err) {
    if (!wasRunningBeforeReload) return
    pipeline.status = 'error'
    pipeline.lastError = err.message || 'Failed to recover pipeline progress after refresh.'
  }
}

const startPipeline = async () => {
  let fileToUpload = selectedFile.value

  if (inputMode.value === 'record') {
    if (!audioBlob.value) return
    const ext = audioBlob.value.type.includes('webm') ? 'webm' : 'wav'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    fileToUpload = new File([audioBlob.value], `recording-${timestamp}.${ext}`, { type: audioBlob.value.type })
  }

  if (!fileToUpload) return

  pipeline.status = 'running'
  pipeline.currentStep = 1
  pipeline.lastError = ''

  try {
    // Step 1: Upload + Transcribe
    const transcribeResult = await api.uploadAndTranscribe(fileToUpload)
    pipeline.folderName = transcribeResult.folder_name || transcribeResult.folderName || ''
    pipeline.fileName = fileToUpload.name.replace(/\.[^/.]+$/, "")
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
    const summarizeResult = await api.summarizeJob(pipeline.folderName, pipeline.fileName)
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
    const visualizeResult = await api.visualizeJob(pipeline.folderName, pipeline.fileName)
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

onMounted(() => {
  recoverPipelineAfterRefresh()
})
</script>
