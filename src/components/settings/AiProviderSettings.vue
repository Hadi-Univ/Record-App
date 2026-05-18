<template>
  <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-3">
    <h3 class="text-sm font-bold text-slate-800">{{ t('runtimeConfig.aiProviderTitle') }}</h3>
    <div class="grid sm:grid-cols-2 gap-2">
      <label class="text-xs text-slate-600 space-y-1">
        <span>{{ t('runtimeConfig.ollamaConcurrency') }}</span>
        <input v-model.number="local.ollama_max_concurrency" type="number" min="1" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
      </label>
      <label class="text-xs text-slate-600 space-y-1">
        <span>{{ t('runtimeConfig.ollamaTimeout') }}</span>
        <input v-model.number="local.ollama_task_timeout_seconds" type="number" min="1" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
      </label>
    </div>
    <button type="button" @click="$emit('save', local)" class="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50">{{ t('runtimeConfig.save') }}</button>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { useI18n } from '../../i18n/index.js'

const props = defineProps({
  config: { type: Object, default: () => ({}) }
})

const local = reactive({
  ollama_max_concurrency: 1,
  ollama_task_timeout_seconds: 600
})

watch(
  () => props.config,
  (value) => {
    local.ollama_max_concurrency = value?.ollama_max_concurrency ?? 1
    local.ollama_task_timeout_seconds = value?.ollama_task_timeout_seconds ?? 600
  },
  { immediate: true, deep: true }
)

defineEmits(['save'])
const { t } = useI18n()
</script>

