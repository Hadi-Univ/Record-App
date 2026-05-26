<template>
  <svg
    :class="[sizeClass, colorClass, 'animate-spin flex-shrink-0']"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** Tailwind size class, e.g. 'w-4 h-4', 'w-5 h-5', 'w-12 h-12' */
  size: {
    type: String,
    default: 'w-4 h-4'
  },
  /** Tailwind text-color class, e.g. 'text-indigo-500', 'text-white' */
  color: {
    type: String,
    default: 'text-current'
  }
})

const sizeClass = computed(() => props.size)
const colorClass = computed(() => props.color)
</script>
