<template>
  <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-3">
    <h3 class="text-sm font-bold text-slate-800">{{ t('runtimeConfig.aiProviderTitle') }}</h3>
    <div class="space-y-1">
      <label class="text-xs text-slate-600 font-semibold uppercase tracking-wide">
        {{ t('settings.provider') }}
      </label>
      <select v-model="local.llm_provider" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white">
        <option value="ollama">{{ t('settings.providerOptions.ollama') }}</option>
        <option value="llamacpp">{{ t('settings.providerOptions.llamacpp') }}</option>
        <option value="openai">{{ t('settings.providerOptions.openai') }}</option>
        <option value="claude">{{ t('settings.providerOptions.claude') }}</option>
        <option value="gemini">{{ t('settings.providerOptions.gemini') }}</option>
        <option value="groq">{{ t('settings.providerOptions.groq') }}</option>
      </select>
    </div>
    <div class="space-y-1">
      <label class="text-xs text-slate-600 font-semibold uppercase tracking-wide">
        {{ t('settings.modelName') }}
      </label>
      <input
        v-model="local.llm_model"
        type="text"
        :placeholder="modelPlaceholder"
        class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
      />
    </div>
    <div class="space-y-1">
      <label class="text-xs text-slate-600 font-semibold uppercase tracking-wide">
        {{ t('settings.apiKey') }}
      </label>
      <input
        v-model="local.llm_api_key"
        type="password"
        :placeholder="t('settings.apiKeyPlaceholder')"
        class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
      />
      <p v-if="local.llm_api_key_configured" class="text-[11px] text-slate-500">
        Existing API key is configured. Enter a new key only when you want to replace it.
      </p>
    </div>
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
    <button type="button" @click="save" class="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50">{{ t('runtimeConfig.save') }}</button>
  </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { useI18n } from '../../i18n/index.js'

const props = defineProps({
  config: { type: Object, default: () => ({}) }
})

const local = reactive({
  llm_provider: 'ollama',
  llm_model: '',
  llm_api_key: '',
  llm_api_key_configured: false,
  ollama_max_concurrency: 1,
  ollama_task_timeout_seconds: 600
})

watch(
  () => props.config,
  (value) => {
    local.llm_provider = value?.llm_provider || 'ollama'
    local.llm_model = value?.llm_model || ''
    local.llm_api_key = ''
    local.llm_api_key_configured = Boolean(value?.llm_api_key_configured)
    local.ollama_max_concurrency = value?.ollama_max_concurrency ?? 1
    local.ollama_task_timeout_seconds = value?.ollama_task_timeout_seconds ?? 600
  },
  { immediate: true, deep: true }
)

const { t } = useI18n()

const modelPlaceholder = computed(() => {
  const map = {
    ollama: 'e.g. llama3',
    openai: 'e.g. gpt-4o',
    claude: 'e.g. claude-3-5-sonnet-20241022',
    gemini: 'e.g. gemini-1.5-pro',
    groq: 'e.g. llama-3.1-70b-versatile',
    llamacpp: 'e.g. /models/model.gguf'
  }
  return map[local.llm_provider] || 'Model name'
})

const emit = defineEmits(['save'])

const save = () => {
  const patch = {
    llm_provider: local.llm_provider,
    llm_model: local.llm_model,
    ollama_max_concurrency: local.ollama_max_concurrency,
    ollama_task_timeout_seconds: local.ollama_task_timeout_seconds
  }
  const nextApiKey = (local.llm_api_key || '').trim()
  if (nextApiKey) {
    patch.llm_api_key = nextApiKey
  }
  emit('save', patch)
}
</script>
