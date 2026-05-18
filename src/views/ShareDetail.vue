<template>
  <div class="min-h-screen pb-10 space-y-4">
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <h1 class="text-xl font-extrabold text-slate-900">{{ t('shareDetail.title') }}</h1>
      <p v-if="payload?.metadata?.file_name" class="text-xs text-slate-500 mt-1">{{ payload.metadata.file_name }}</p>
      <p v-if="payload?.expires_at" class="text-xs text-slate-400 mt-1">{{ t('shareDetail.expiresAt', { date: formatDate(payload.expires_at) }) }}</p>
      <p v-if="error" class="text-sm text-red-600 font-semibold mt-3">{{ error }}</p>
    </div>

    <div v-if="loading" class="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">{{ t('shareDetail.loading') }}</div>
    <template v-else-if="payload">
      <div v-if="payload.summary" class="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 class="text-sm font-bold text-slate-700 mb-3">{{ t('shareDetail.summary') }}</h2>
        <pre class="text-sm text-slate-700 whitespace-pre-wrap">{{ payload.summary }}</pre>
      </div>

      <div v-if="payload.transcript" class="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 class="text-sm font-bold text-slate-700 mb-3">{{ t('shareDetail.transcript') }}</h2>
        <pre class="text-xs text-slate-600 whitespace-pre-wrap">{{ payload.transcript }}</pre>
      </div>

      <div v-if="payload.visualization" class="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 class="text-sm font-bold text-slate-700 mb-3">{{ t('shareDetail.visualization') }}</h2>
        <img :src="payload.visualization" :alt="t('shareDetail.visualizationAlt')" class="w-full rounded-xl border border-slate-200" />
      </div>

      <div v-if="payload.flashcards?.length" class="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 class="text-sm font-bold text-slate-700 mb-3">{{ t('shareDetail.flashcards') }}</h2>
        <div class="space-y-3">
          <div v-for="(card, idx) in payload.flashcards" :key="idx" class="border border-slate-200 rounded-xl p-3">
            <p class="text-xs text-slate-500">{{ t('shareDetail.question') }}</p>
            <p class="text-sm font-semibold text-slate-800">{{ card.front }}</p>
            <p class="text-xs text-slate-500 mt-2">{{ t('shareDetail.answer') }}</p>
            <p class="text-sm text-slate-700">{{ card.back }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getPublicShare } from '../services/api'
import { useI18n } from '../i18n/index.js'

const route = useRoute()
const { t } = useI18n()
const payload = ref(null)
const loading = ref(false)
const error = ref('')

const formatDate = (dateStr) => {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

onMounted(async () => {
  const shareId = String(route.params.shareId || '')
  const token = String(route.query.token || '')
  const sig = String(route.query.sig || '')
  if (!shareId || !token || !sig) {
    error.value = t('shareDetail.invalidLink')
    return
  }
  loading.value = true
  error.value = ''
  try {
    payload.value = await getPublicShare(shareId, token, sig)
  } catch (err) {
    error.value = err.message || t('shareDetail.loadFailed')
  } finally {
    loading.value = false
  }
})
</script>
