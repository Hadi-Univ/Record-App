<template>
  <div>
    <div
      v-if="errorMessage"
      class="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm"
      role="alert"
      aria-live="assertive"
    >
      <h2 class="text-sm font-bold">Something went wrong</h2>
      <p class="mt-1 text-sm">{{ errorMessage }}</p>
      <button
        type="button"
        class="mt-3 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-100 transition"
        @click="resetError"
      >
        Try again
      </button>
    </div>
    <slot v-else />
  </div>
</template>

<script setup>
import { ref, onErrorCaptured, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const errorMessage = ref('')

onErrorCaptured((error) => {
  errorMessage.value = error?.message || 'An unexpected error occurred.'
  return false
})

const resetError = () => {
  errorMessage.value = ''
}

watch(() => route.fullPath, resetError)
</script>
