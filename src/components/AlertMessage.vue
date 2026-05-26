<template>
  <div v-if="message" :class="containerClass" role="alert">
    <svg
      v-if="type !== 'info'"
      :class="['w-5 h-5 flex-shrink-0 mt-0.5', iconColorClass]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        v-if="type === 'error' || type === 'warning'"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
      <path
        v-else-if="type === 'success'"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
    <p :class="['text-sm font-semibold', textColorClass]">{{ message }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** Message to display. Nothing is rendered when empty/null. */
  message: {
    type: String,
    default: ''
  },
  /** 'error' | 'success' | 'warning' | 'info' */
  type: {
    type: String,
    default: 'error',
    validator: (v) => ['error', 'success', 'warning', 'info'].includes(v)
  },
  /** Extra Tailwind classes added to the outer container */
  class: {
    type: String,
    default: ''
  }
})

const STYLES = {
  error:   { bg: 'bg-red-50 border-red-200',     text: 'text-red-700',     icon: 'text-red-500'     },
  success: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-500' },
  warning: { bg: 'bg-amber-50 border-amber-200',  text: 'text-amber-800',   icon: 'text-amber-500'   },
  info:    { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700',  icon: 'text-indigo-500'  },
}

const style = computed(() => STYLES[props.type] || STYLES.error)

const containerClass = computed(() =>
  `border rounded-xl p-3 flex items-start gap-2 ${style.value.bg} ${props.class}`
)
const textColorClass = computed(() => style.value.text)
const iconColorClass = computed(() => style.value.icon)
</script>
