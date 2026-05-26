<template>
  <teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      :aria-label="title"
    >
      <div class="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 w-full max-w-sm flex flex-col items-center gap-5 text-center">
        <AppSpinner size="w-12 h-12" color="text-indigo-500" />
        <div>
          <p class="text-base font-bold text-slate-800">{{ title }}</p>
          <p class="text-sm text-slate-500 mt-1">{{ message }}</p>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import AppSpinner from './AppSpinner.vue'

defineProps({
  open: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: ''
  }
})
</script>
