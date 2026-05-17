<template>
  <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-3">
    <h3 class="text-sm font-bold text-slate-800">{{ t('settings.theme') }}</h3>
    <select
      :value="theme.state.preference"
      @change="theme.setPreference($event.target.value)"
      class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white"
    >
      <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
    <p class="text-xs text-slate-500">{{ t('settings.currentTheme', { theme: theme.state.resolvedTheme }) }}</p>
  </div>
</template>

<script setup>
import { useThemeStore } from '../../stores/themeStore'
import { THEME_OPTIONS } from '../../theme/themeTokens'
import { useI18n } from '../../i18n/index.js'

const theme = useThemeStore()
const options = THEME_OPTIONS
const { t } = useI18n()
</script>
