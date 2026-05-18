<template>
  <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-3">
    <h3 class="text-sm font-bold text-slate-800">{{ t('settings.runtimeConfigTitle') }}</h3>
    <input
      v-model="store.state.settings.configAdminToken"
      type="password"
      :placeholder="t('settings.runtimeConfigTokenPlaceholder')"
      class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm"
    />
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        @click="$emit('load')"
        :disabled="loading"
        class="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50"
      >
        {{ loading ? t('settings.loading') : t('settings.load') }}
      </button>
      <button
        type="button"
        @click="$emit('reset')"
        :disabled="resetting"
        class="px-3 py-2 text-xs font-semibold rounded-lg border border-red-200 text-red-700 bg-red-50"
      >
        {{ resetting ? t('settings.resetting') : t('settings.resetToDefault') }}
      </button>
    </div>
    <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
  </div>
</template>

<script setup>
import { useAppStore } from '../../stores/appStore'
import { useI18n } from '../../i18n/index.js'

defineProps({
  loading: { type: Boolean, default: false },
  resetting: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

defineEmits(['load', 'reset'])

const store = useAppStore()
const { t } = useI18n()
</script>
