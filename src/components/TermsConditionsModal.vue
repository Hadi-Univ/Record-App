<template>
  <teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[80] p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center"
      @click.self="close"
    >
      <div
        class="w-full max-w-3xl max-h-[92vh] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-modal-title"
      >
        <div class="flex items-start justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-200">
          <div class="min-w-0">
            <h2 id="terms-modal-title" class="text-lg sm:text-xl font-bold text-slate-900">
              {{ t('terms.title') }}
            </h2>
            <p class="text-xs sm:text-sm text-slate-500 mt-1">
              {{ t('terms.intro') }}
            </p>
          </div>
          <button
            ref="closeButtonRef"
            type="button"
            @click="close"
            :aria-label="t('terms.close')"
            class="motion-interactive shrink-0 min-h-10 min-w-10 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div class="overflow-y-auto px-4 sm:px-6 py-4 space-y-5 text-sm sm:text-[15px] leading-relaxed">
          <section class="space-y-2">
            <h3 class="text-sm sm:text-base font-bold text-slate-900">{{ t('terms.useTitle') }}</h3>
            <p class="text-slate-700">{{ t('terms.useBody') }}</p>
          </section>

          <section class="space-y-2">
            <h3 class="text-sm sm:text-base font-bold text-slate-900">{{ t('terms.accountTitle') }}</h3>
            <p class="text-slate-700">{{ t('terms.accountBody') }}</p>
          </section>

          <section class="space-y-2">
            <h3 class="text-sm sm:text-base font-bold text-slate-900">{{ t('terms.contentTitle') }}</h3>
            <p class="text-slate-700">{{ t('terms.contentBody') }}</p>
          </section>

          <section class="space-y-2">
            <h3 class="text-sm sm:text-base font-bold text-slate-900">{{ t('terms.availabilityTitle') }}</h3>
            <p class="text-slate-700">{{ t('terms.availabilityBody') }}</p>
          </section>

          <section class="space-y-2">
            <h3 class="text-sm sm:text-base font-bold text-slate-900">{{ t('terms.contactTitle') }}</h3>
            <p class="text-slate-700">{{ t('terms.contactBody') }}</p>
          </section>

          <p class="text-xs text-slate-400 pt-2 border-t border-slate-100">{{ t('terms.lastUpdated') }}</p>
        </div>

        <div class="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            @click="close"
            class="motion-interactive min-h-10 px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100"
          >
            {{ t('terms.close') }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from '../i18n/index.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()
const closeButtonRef = ref(null)
const lastFocusedElement = ref(null)
let previousBodyOverflow = ''

const close = () => {
  emit('update:modelValue', false)
}

const handleEscape = (event) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
  }
}

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      lastFocusedElement.value = document.activeElement
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', handleEscape)
      await nextTick()
      closeButtonRef.value?.focus()
      return
    }

    document.body.style.overflow = previousBodyOverflow
    document.removeEventListener('keydown', handleEscape)
    if (lastFocusedElement.value && typeof lastFocusedElement.value.focus === 'function') {
      lastFocusedElement.value.focus()
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  document.body.style.overflow = previousBodyOverflow
  document.removeEventListener('keydown', handleEscape)
})
</script>
