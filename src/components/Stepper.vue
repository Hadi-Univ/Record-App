<template>
  <div class="flex items-center w-full">
    <template v-for="(step, index) in steps" :key="step.id">
      <!-- Step Circle -->
      <div class="flex flex-col items-center">
        <div
          class="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-sm md:text-base transition-all duration-300"
          :class="stepCircleClass(step.id)"
        >
          <svg
            v-if="isCompleted(step.id)"
            class="w-4 h-4 md:w-5 md:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <svg
            v-else-if="isActive(step.id) && isRunning"
            class="w-4 h-4 md:w-5 md:h-5 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span v-else>{{ step.id }}</span>
        </div>
        <span
          class="mt-1 text-[10px] md:text-xs font-semibold text-center leading-tight max-w-[60px] md:max-w-[80px]"
          :class="stepLabelClass(step.id)"
        >
          {{ step.label }}
        </span>
      </div>

      <!-- Connector line (not after last step) -->
      <div
        v-if="index < steps.length - 1"
        class="flex-1 h-0.5 mx-1 md:mx-2 mb-5 transition-colors duration-300"
        :class="isCompleted(step.id) ? 'bg-emerald-400' : 'bg-slate-200'"
      />
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../i18n/index.js'

const props = defineProps({
  currentStep: {
    type: Number,
    required: true
  },
  isRunning: {
    type: Boolean,
    default: false
  }
})
const { t } = useI18n()

const steps = computed(() => [
  { id: 1, label: t('stepper.uploadRecord') },
  { id: 2, label: t('stepper.transcribe') },
  { id: 3, label: t('stepper.summarize') },
  { id: 4, label: t('stepper.visualize') }
])

const isCompleted = (id) => id < props.currentStep
const isActive = (id) => id === props.currentStep

const stepCircleClass = (id) => {
  if (isCompleted(id)) return 'bg-emerald-500 text-white'
  if (isActive(id)) return props.isRunning
    ? 'bg-indigo-600 text-white ring-4 ring-indigo-200'
    : 'bg-indigo-600 text-white'
  return 'bg-slate-200 text-slate-400'
}

const stepLabelClass = (id) => {
  if (isCompleted(id)) return 'text-emerald-600'
  if (isActive(id)) return 'text-indigo-600'
  return 'text-slate-400'
}
</script>
