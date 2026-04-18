<template>
  <div class="space-y-6 pb-8 min-h-screen">
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <router-link
        to="/history"
        class="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition"
      >
        &larr; Back to History
      </router-link>
      <h1 class="text-xl font-extrabold text-slate-900 mt-3">{{ folderName }}</h1>
      <p class="text-sm text-slate-500 mt-1">Job details and artifacts.</p>
    </div>

    <div v-if="error" class="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 font-semibold flex items-center gap-2">
      {{ error }}
    </div>
    <div v-else-if="loading" class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <p class="text-sm text-slate-500">Loading details…</p>
    </div>

    <template v-else>
      <div v-if="detail.summary" class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div @click="toggleSection('summary')" class="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition">
          <div class="flex items-center gap-2">
            <svg :class="{'rotate-180': uiState.summary}" class="w-5 h-5 text-slate-500 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wide">Summary Dashboard</h2>
          </div>
          <div class="flex gap-3" @click.stop>
            <a :href="downloadUrl('summary_txt')" download class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition">TXT</a>
            <a :href="downloadUrl('summary_html')" download class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition">HTML</a>
          </div>
        </div>
        
        <div v-show="uiState.summary" class="p-6 space-y-6">
          <div v-if="parsedSummary" class="space-y-6">
            <div class="bg-indigo-50/50 border-l-4 border-indigo-500 rounded-r-xl p-4">
              <h3 class="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-2">Ringkasan Singkat</h3>
              <p class="text-sm text-slate-700 leading-relaxed">{{ parsedSummary.ringkasan_singkat }}</p>
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-800 mb-2">Topik Utama</h3>
              <p class="text-sm text-slate-600 mb-3">{{ parsedSummary.topik_utama }}</p>
              <div class="flex flex-wrap gap-2">
                <span v-for="(tema, index) in parsedSummary.tema_besar" :key="index" class="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">
                  {{ tema }}
                </span>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div>
                <h3 class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <span class="text-amber-500">💡</span> Insight Penting
                </h3>
                <ul class="space-y-2">
                  <li v-for="(insight, index) in parsedSummary.insight" :key="index" class="flex items-start gap-2 text-sm text-slate-600">
                    <span class="text-slate-400 mt-0.5">•</span>
                    <span class="leading-relaxed">{{ insight }}</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <span class="text-emerald-500">✓</span> Rekomendasi
                </h3>
                <ul class="space-y-2">
                  <li v-for="(rek, index) in parsedSummary.rekomendasi" :key="index" class="flex items-start gap-2 text-sm text-slate-600">
                    <span class="text-slate-400 mt-0.5">•</span>
                    <span class="leading-relaxed">{{ rek }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div v-else class="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {{ detail.summary }}
          </div>
        </div>
      </div>

      <div v-if="transcriptData.length > 0" class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
        <div @click="toggleSection('editor')" class="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition">
          <div class="flex items-center gap-2">
            <svg :class="{'rotate-180': uiState.editor}" class="w-5 h-5 text-slate-500 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wide">Interactive Transcript Editor</h2>
          </div>
          <button @click.stop="downloadEditedJSON" class="text-xs flex items-center gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 rounded-lg font-semibold transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Export JSON
          </button>
        </div>

        <div v-show="uiState.editor" class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 pb-6 border-b border-slate-200 mb-6">
            <div class="md:col-span-2">
              <span class="font-semibold text-sm text-slate-700 mb-3 block">Pengaturan Pembicara:</span>
              <div class="flex flex-wrap gap-3">
                <div v-for="(setting, id) in speakerSettings" :key="id" class="flex items-center bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm gap-2 hover:border-slate-300 transition">
                  <input type="checkbox" v-model="setting.visible" class="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer" title="Sembunyikan/Tampilkan">
                  <input type="text" v-model="setting.name" class="border border-slate-300 rounded px-2 py-1 w-24 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" title="Ganti Nama">
                  <input type="color" v-model="setting.color" class="border-0 w-8 h-8 rounded cursor-pointer bg-transparent" title="Ganti Warna">
                  <button @click="deleteSpeaker(Number(id))" class="ml-1 p-1 text-red-500 hover:bg-red-50 rounded transition" title="Hapus Speaker Ini">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>
            </div>
            <div>
              <span class="font-semibold text-sm text-slate-700 mb-3 block">Filter Bahasa:</span>
              <div class="flex flex-wrap gap-2">
                <label v-for="lang in availableLanguages" :key="lang" class="flex items-center bg-slate-100 px-4 py-1.5 rounded-full cursor-pointer hover:bg-slate-200 transition text-xs font-bold text-slate-600 gap-2 border border-slate-200">
                  <input type="checkbox" :checked="activeLanguages.includes(lang)" @change="toggleLanguage(lang)" class="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer">
                  <span>{{ lang.toUpperCase() }}</span>
                </label>
              </div>
            </div>
          </div>

          <div class="mb-8">
            <h3 class="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide">Visualisasi Timeline</h3>
            <div class="flex flex-col gap-3">
              <div v-if="filteredTranscript.length === 0" class="text-sm text-slate-400 italic">Data kosong atau semua filter disembunyikan.</div>
              <template v-for="(setting, id) in speakerSettings" :key="id">
                <div v-show="setting.visible" class="flex items-center">
                  <div class="w-28 text-xs font-semibold text-slate-700 truncate pr-2" :title="setting.name">{{ setting.name }}</div>
                  <div class="flex-grow h-6 bg-slate-100 border border-slate-200 relative rounded-md overflow-hidden">
                    <div v-for="seg in getSegmentsForSpeaker(id)" :key="seg._id" 
                         class="segment" 
                         :style="{ left: (seg.start / maxTime) * 100 + '%', width: ((seg.end - seg.start) / maxTime) * 100 + '%', background: setting.color }" 
                         :title="seg.text">
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide">Transkrip Percakapan</h3>
            <div class="flex flex-col space-y-4 max-h-[600px] overflow-y-auto pr-2 pb-4">
              <div v-if="filteredTranscript.length === 0" class="text-sm text-slate-400 italic text-center py-4">Data kosong.</div>
              <div v-for="item in filteredTranscript" :key="item._id" 
                   class="chat-bubble relative p-4 rounded-xl max-w-[85%] md:max-w-[80%] border-l-[6px] shadow-sm transition-all duration-200"
                   :class="{'ml-auto': item.speaker % 2 !== 0}"
                   :style="{ backgroundColor: hexToRgba(speakerSettings[item.speaker]?.color || '#000', 0.08), borderLeftColor: speakerSettings[item.speaker]?.color || '#000' }">
                
                <div class="flex flex-wrap items-center gap-2 mb-2 text-xs font-bold" :style="{ color: speakerSettings[item.speaker]?.color }">
                  <span>{{ speakerSettings[item.speaker]?.name }}</span>
                  <span class="text-slate-400 font-normal">•</span>
                  <span>{{ item.start }}s - {{ item.end }}s</span>
                  <span class="bg-black/5 text-slate-600 px-2 py-0.5 rounded ml-1">{{ getLang(item).toUpperCase() }}</span>
                  
                  <button @click="deleteSegment(item._id)" class="btn-delete-segment ml-auto flex items-center gap-1 bg-red-100 text-red-600 hover:bg-red-200 px-2 py-1 rounded text-[10px]">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    Hapus
                  </button>
                </div>
                
                <div class="p-1.5 border border-transparent border-dashed rounded transition-colors text-sm text-slate-800 leading-relaxed hover:border-slate-300 hover:bg-white/40 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 cursor-text" 
                     contenteditable="true" 
                     @blur="handleTextEdit(item._id, $event.target.innerText)">
                  {{ item.text }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="detail.transcript" class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
        <div @click="toggleSection('raw')" class="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition">
          <div class="flex items-center gap-2">
            <svg :class="{'rotate-180': uiState.raw}" class="w-5 h-5 text-slate-500 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wide">Transcript (Raw TXT)</h2>
          </div>
          <a @click.stop :href="downloadUrl('transcript_txt')" download class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition">Download TXT</a>
        </div>
        
        <div v-show="uiState.raw" class="p-6 bg-white">
          <div class="bg-slate-50 rounded-xl p-4 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
            {{ detail.transcript }}
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
        <div @click="toggleSection('audio')" class="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition">
          <div class="flex items-center gap-2">
            <svg :class="{'rotate-180': uiState.audio}" class="w-5 h-5 text-slate-500 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wide">Audio Source</h2>
          </div>
        </div>
        
        <div v-show="uiState.audio" class="p-6 bg-white">
          <audio controls class="w-full rounded-lg" :src="downloadUrl('audio')" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getJob, getDownloadUrl } from '../services/api'
import { useAppStore } from '../stores/appStore'

const route = useRoute()
const store = useAppStore()

// --- UI Toggle State ---
const uiState = ref({
  summary: true,
  editor: true,
  raw: true,
  audio: true
})

const toggleSection = (sectionName) => {
  uiState.value[sectionName] = !uiState.value[sectionName]
}

// --- Core API Data ---
const loading = ref(false)
const error = ref('')
const detail = ref({
  transcript: '',
  summary: ''
})
const folderName = computed(() => String(route.params.folderName || ''))

// --- Diarization Interactive Data ---
const transcriptData = ref([])
const speakerSettings = ref({})
const activeLanguages = ref([])
const defaultColors = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#eab308', '#ef4444']

// Parse JSON summary
const parsedSummary = computed(() => {
  if (!detail.value.summary) return null
  const match = detail.value.summary.match(/```json\n([\s\S]*?)\n```/)
  if (match && match[1]) {
    try { return JSON.parse(match[1]) } catch (e) { return null }
  }
  return null
})

// Extract available languages directly from the data
const availableLanguages = computed(() => {
  if (!transcriptData.value.length) return []
  return [...new Set(transcriptData.value.map(d => getLang(d)))].sort()
})

// Filter data for the interface based on selected checks
const filteredTranscript = computed(() => {
  return transcriptData.value.filter(d => 
    speakerSettings.value[d.speaker]?.visible && 
    activeLanguages.value.includes(getLang(d))
  )
})

// Calculate Timeline width
const maxTime = computed(() => {
  if (!transcriptData.value.length) return 0
  return Math.max(...transcriptData.value.map(d => d.end))
})

// Helper functions
const getLang = (item) => (item.meta && item.meta.language) ? item.meta.language : 'id'
const hexToRgba = (hex, alpha) => {
  if(!hex) return `rgba(0,0,0,${alpha})`
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const getSegmentsForSpeaker = (id) => {
  return transcriptData.value.filter(d => 
    String(d.speaker) === String(id) && activeLanguages.value.includes(getLang(d))
  )
}

const toggleLanguage = (lang) => {
  if (activeLanguages.value.includes(lang)) {
    activeLanguages.value = activeLanguages.value.filter(l => l !== lang)
  } else {
    activeLanguages.value.push(lang)
  }
}

// Editor Actions
const handleTextEdit = (id, newText) => {
  const item = transcriptData.value.find(d => d._id === id)
  if (item && item.text !== newText) {
    item.text = newText
  }
}

const deleteSegment = (idToDel) => {
  if (confirm(`Hapus percakapan ini?`)) {
    transcriptData.value = transcriptData.value.filter(d => d._id !== idToDel)
    
    const remainingSpeakers = new Set(transcriptData.value.map(d => String(d.speaker)))
    Object.keys(speakerSettings.value).forEach(sID => {
      if (!remainingSpeakers.has(String(sID))) {
        delete speakerSettings.value[sID]
      }
    })
  }
}

const deleteSpeaker = (id) => {
  const speakerName = speakerSettings.value[id]?.name || 'Speaker'
  if (confirm(`Peringatan: Anda akan menghapus permanen ${speakerName} dan SEMUA teksnya dari data. Lanjutkan?`)) {
    transcriptData.value = transcriptData.value.filter(d => String(d.speaker) !== String(id))
    delete speakerSettings.value[id]
  }
}

const downloadEditedJSON = () => {
  const dataToExport = transcriptData.value.map(({ _id, ...rest }) => rest)
  const dataStr = JSON.stringify(dataToExport, null, 4)
  const blob = new Blob([dataStr], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url; a.download = "transkrip_teredit.json"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Bootstrapping the data
const initDashboard = () => {
  const speakerIDs = [...new Set(transcriptData.value.map(d => d.speaker))].sort((a,b) => a-b)
  const settings = {}
  
  speakerIDs.forEach((id, index) => {
    settings[id] = {
      visible: true,
      color: defaultColors[index % defaultColors.length],
      name: `Speaker ${id}`
    }
  })
  speakerSettings.value = settings
  activeLanguages.value = availableLanguages.value
}

const resetDetailState = () => {
  detail.value = {
    transcript: '',
    summary: ''
  }
  transcriptData.value = []
  speakerSettings.value = {}
  activeLanguages.value = []
}

const hasDetailContent = (payload) => {
  if (!payload || typeof payload !== 'object') return false
  return Boolean(payload.summary || payload.transcript || (Array.isArray(payload.transcriptData) && payload.transcriptData.length))
}

const getCachedDetail = (folder) => {
  if (!folder) return null
  const cache = store.state.historyDetailCache
  if (!cache || typeof cache !== 'object') return null
  const cached = cache[folder]
  return hasDetailContent(cached) ? cached : null
}

const applyCachedDetail = (cached) => {
  if (!hasDetailContent(cached)) return false
  detail.value = {
    summary: cached.summary || '',
    transcript: cached.transcript || ''
  }
  const rawData = Array.isArray(cached.transcriptData) ? cached.transcriptData : []
  transcriptData.value = rawData.map((item, index) => ({ ...item, _id: index }))
  if (transcriptData.value.length) {
    initDashboard()
  } else {
    speakerSettings.value = {}
    activeLanguages.value = []
  }
  return true
}

const saveCachedDetail = () => {
  if (!folderName.value) return
  const payload = {
    summary: detail.value.summary || '',
    transcript: detail.value.transcript || '',
    transcriptData: transcriptData.value.map(({ _id, ...rest }) => ({ ...rest })),
    updatedAt: new Date().toISOString()
  }
  if (!hasDetailContent(payload)) return
  store.state.historyDetailCache = {
    ...(store.state.historyDetailCache || {}),
    [folderName.value]: payload
  }
}

// Fetch Logic
const loadDetail = async () => {
  if (!folderName.value) return
  loading.value = true
  error.value = ''
  resetDetailState()
  const cached = getCachedDetail(folderName.value)
  if (cached) applyCachedDetail(cached)
  
  try {
    const jobDetail = await getJob(folderName.value)
    const files = jobDetail?.files || {}
    
    // 1. Fetch Summary
    if (files.summary_txt) {
      try {
        const summaryUrl = getDownloadUrl(folderName.value, 'summary_txt')
        const response = await fetch(summaryUrl)
        if (response.ok) detail.value.summary = await response.text()
      } catch (e) { console.error('Error fetching summary:', e) }
    } else if (!cached?.summary) {
      detail.value.summary = ''
    }

    // 2. Fetch INTERACTIVE JSON Transcript
    if (files.transcript_json) {
      try {
        const jsonUrl = getDownloadUrl(folderName.value, 'transcript_json')
        const response = await fetch(jsonUrl)
        if (response.ok) {
          const rawData = await response.json()
          transcriptData.value = rawData.map((item, index) => ({ ...item, _id: index }))
        }
      } catch (e) { console.error('Error fetching JSON transcript:', e) }
    } else if (!Array.isArray(cached?.transcriptData) || !cached.transcriptData.length) {
      transcriptData.value = []
    }
    if (transcriptData.value.length) {
      initDashboard()
    } else {
      speakerSettings.value = {}
      activeLanguages.value = []
    }
    
    // 3. ALWAYS Fetch RAW TXT Transcript
    if (files.transcript_txt) {
      try {
        const transcriptUrl = getDownloadUrl(folderName.value, 'transcript_txt')
        const response = await fetch(transcriptUrl)
        if (response.ok) detail.value.transcript = await response.text()
      } catch (e) { console.error('Error fetching TXT transcript:', e) }
    } else if (!cached?.transcript) {
      detail.value.transcript = ''
    }
    saveCachedDetail()

  } catch (err) {
    if (!applyCachedDetail(cached)) {
      error.value = err.message || 'Failed to load job detail.'
    } else {
      error.value = 'Unable to connect: displaying saved job detail from this device.'
    }
  } finally {
    loading.value = false
  }
}

const downloadUrl = (fileType) => getDownloadUrl(folderName.value, fileType)

watch(() => route.params.folderName, loadDetail, { immediate: true })
</script>

<style scoped>
.segment {
  position: absolute; 
  height: 100%; 
  border-radius: 4px;
  border: 1px solid rgba(0,0,0,0.1); 
  transition: transform 0.2s;
}
.segment:hover { 
  transform: scaleY(1.15); 
  z-index: 10; 
  cursor: help; 
}
[contenteditable]:empty:before { 
  content: "Ketik teks di sini..."; 
  color: #94a3b8; 
}
.chat-bubble .btn-delete-segment { 
  opacity: 0; 
  pointer-events: none; 
  transition: 0.2s; 
}
.chat-bubble:hover .btn-delete-segment { 
  opacity: 1; 
  pointer-events: auto; 
}
</style>
