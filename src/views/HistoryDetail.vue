<template>
  <div class="space-y-6 pb-4">
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <router-link
        to="/history"
        class="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition"
      >
        ← Back to History
      </router-link>
      <h1 class="text-xl font-extrabold text-slate-900 mt-3">{{ folderName }}</h1>
      <p class="text-sm text-slate-500 mt-1">Job details and artifacts.</p>
    </div>

    <div
      v-if="error"
      class="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 font-semibold flex items-center gap-2"
    >
      {{ error }}
    </div>

    <div v-else-if="loading" class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <p class="text-sm text-slate-500">Loading details…</p>
    </div>

    <template v-else>
      <div v-if="detail.transcript" class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-2">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wide">Transcript</h2>
          <a
            :href="downloadUrl('transcript_txt')"
            download
            class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition"
          >
            Download
          </a>
        </div>
        <div class="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
          {{ detail.transcript }}
        </div>
      </div>

      <div v-if="detail.summary" class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-2">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wide">Summary</h2>
          <div class="flex gap-3">
            <a
              :href="downloadUrl('summary_txt')"
              download
              class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition"
            >
              TXT
            </a>
            <a
              :href="downloadUrl('summary_html')"
              download
              class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition"
            >
              HTML
            </a>
          </div>
        </div>
        <div class="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
          {{ detail.summary }}
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-2">
        <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wide">Audio</h2>
        <audio controls class="w-full rounded-lg" :src="downloadUrl('audio')" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getJob, getDownloadUrl } from '../services/api'

const route = useRoute()

const loading = ref(false)
const error = ref('')
const detail = ref({
  transcript: '',
  summary: ''
})

const folderName = computed(() => String(route.params.folderName || ''))

const normalizeDetail = (jobDetail) => {
  const results = jobDetail?.results || {}
  return {
    transcript: jobDetail?.transcript ?? jobDetail?.transcription ?? results.transcript ?? results.transcription ?? '',
    summary: jobDetail?.summary ?? results.summary ?? ''
  }
}

const loadDetail = async () => {
  if (!folderName.value) return
  loading.value = true
  error.value = ''
  try {
    const jobDetail = await getJob(folderName.value)
    detail.value = normalizeDetail(jobDetail)
  } catch (err) {
    error.value = err.message || 'Failed to load job detail.'
  } finally {
    loading.value = false
  }
}

const downloadUrl = (fileType) => getDownloadUrl(folderName.value, fileType)

watch(() => route.params.folderName, loadDetail, { immediate: true })
</script>
