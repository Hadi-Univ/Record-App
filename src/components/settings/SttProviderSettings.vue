<template>
  <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-sm font-bold text-slate-800">Speech-to-Text Providers</h3>
      <button type="button" class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50" @click="load" :disabled="store.state.loading">
        Refresh
      </button>
    </div>

    <p v-if="store.state.error" class="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
      {{ store.state.error }}
    </p>

    <ProviderSelector v-model="local.active_provider" :providers="store.state.providers" />

    <label class="text-xs text-slate-600 space-y-1 block">
      <span>Fallback providers (comma separated)</span>
      <input v-model="fallbackInput" type="text" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
    </label>

    <div class="grid sm:grid-cols-3 gap-2">
      <label class="text-xs text-slate-600 space-y-1">
        <span>Retries</span>
        <input v-model.number="local.retry_attempts" type="number" min="0" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
      </label>
      <label class="text-xs text-slate-600 space-y-1">
        <span>Retry backoff (s)</span>
        <input v-model.number="local.retry_backoff_seconds" type="number" min="0" step="0.1" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
      </label>
      <label class="text-xs text-slate-600 space-y-1">
        <span>Timeout (s)</span>
        <input v-model.number="local.request_timeout_seconds" type="number" min="1" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
      </label>
    </div>

    <div class="border border-slate-200 rounded-xl p-3 space-y-2">
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-semibold text-slate-700">Selected provider config</h4>
        <button type="button" class="text-xs font-semibold text-indigo-600" @click="testProvider" :disabled="store.state.testing">Test</button>
      </div>

      <label class="text-xs text-slate-600 space-y-1 block">
        <span>Predefined model</span>
        <select v-model="selected.model" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm">
          <option value="">Custom / empty</option>
          <option v-for="model in activePredefinedModels" :key="model" :value="model">
            {{ model }}
          </option>
        </select>
      </label>
      <label class="text-xs text-slate-600 space-y-1 block">
        <span>Model</span>
        <input v-model="selected.model" type="text" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
      </label>
      <label class="text-xs text-slate-600 space-y-1 block">
        <span>Endpoint / executable</span>
        <input v-model="selected.endpoint" type="text" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
      </label>
      <div class="grid sm:grid-cols-2 gap-2">
        <label class="text-xs text-slate-600 space-y-1">
          <span>Concurrency</span>
          <input v-model.number="selected.concurrency_limit" type="number" min="1" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
        </label>
        <label class="text-xs text-slate-600 space-y-1">
          <span>Provider timeout</span>
          <input v-model.number="selected.timeout_seconds" type="number" min="1" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
        </label>
      </div>
      <label class="inline-flex items-center gap-2 text-xs text-slate-700">
        <input v-model="selected.enabled" type="checkbox" />
        Enabled
      </label>
      <ProviderApiKeyForm v-model="selected" />
    </div>

    <div class="flex items-center gap-2">
      <button type="button" class="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50" @click="save" :disabled="store.state.saving">Save</button>
      <button type="button" class="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50" @click="refreshHealth" :disabled="store.state.healthLoading">Refresh health</button>
      <span v-if="store.state.lastTest" class="text-xs text-slate-600">{{ store.state.lastTest.provider }}: {{ store.state.lastTest.ok ? 'ok' : 'failed' }}</span>
    </div>

    <ProviderHealthStatus :providers="store.state.health?.providers || []" />
  </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { useSttProviderStore } from '../../stores/sttProviderStore'
import ProviderSelector from './ProviderSelector.vue'
import ProviderApiKeyForm from './ProviderApiKeyForm.vue'
import ProviderHealthStatus from './ProviderHealthStatus.vue'

const store = useSttProviderStore()

const local = reactive({
  active_provider: 'faster_whisper',
  fallback_providers: [],
  retry_attempts: 1,
  retry_backoff_seconds: 0.2,
  request_timeout_seconds: 600,
  providers: {}
})

const load = async () => {
  await store.load()
}

watch(
  () => store.state.config,
  (value) => {
    if (!value) return
    local.active_provider = value.active_provider || 'faster_whisper'
    local.fallback_providers = Array.isArray(value.fallback_providers) ? [...value.fallback_providers] : []
    local.retry_attempts = value.retry_attempts ?? 1
    local.retry_backoff_seconds = value.retry_backoff_seconds ?? 0.2
    local.request_timeout_seconds = value.request_timeout_seconds ?? 600
    local.providers = JSON.parse(JSON.stringify(value.providers || {}))
  },
  { immediate: true, deep: true }
)

const fallbackInput = computed({
  get: () => local.fallback_providers.join(', '),
  set: (value) => {
    local.fallback_providers = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
})

const selected = computed({
  get: () => {
    if (!local.providers[local.active_provider]) {
      local.providers[local.active_provider] = {}
    }
    return local.providers[local.active_provider]
  },
  set: (value) => {
    local.providers[local.active_provider] = value
  }
})

const PREDEFINED_MODELS = {
  faster_whisper: ['tiny', 'base', 'small', 'medium', 'large-v3'],
  whisper_cpp: ['tiny', 'base', 'small', 'medium', 'large-v3'],
  local_transformer: ['openai/whisper-tiny', 'openai/whisper-base', 'openai/whisper-small', 'openai/whisper-medium', 'openai/whisper-large-v3'],
  openai: ['gpt-4o-mini-transcribe', 'gpt-4o-transcribe', 'whisper-1'],
  google: ['latest_long', 'latest_short', 'chirp_2']
}

const activePredefinedModels = computed(() => PREDEFINED_MODELS[local.active_provider] || [])

const save = async () => {
  await store.save({
    active_provider: local.active_provider,
    fallback_providers: local.fallback_providers,
    retry_attempts: local.retry_attempts,
    retry_backoff_seconds: local.retry_backoff_seconds,
    request_timeout_seconds: local.request_timeout_seconds,
    providers: {
      [local.active_provider]: selected.value
    }
  })
  await store.refreshHealth()
}

const refreshHealth = async () => {
  await store.refreshHealth()
}

const testProvider = async () => {
  await store.runTest(local.active_provider)
}

load()
</script>
