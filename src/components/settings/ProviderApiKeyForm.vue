<template>
  <div class="grid sm:grid-cols-2 gap-2">
    <label class="text-xs text-slate-600 space-y-1">
      <span>API key</span>
      <input v-model="local.api_key" type="password" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" placeholder="Optional runtime key" />
    </label>
    <label class="text-xs text-slate-600 space-y-1">
      <span>API key env</span>
      <input v-model="local.api_key_env" type="text" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" placeholder="OPENAI_API_KEY" />
    </label>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['update:modelValue'])

const local = reactive({
  api_key: '',
  api_key_env: ''
})

watch(
  () => props.modelValue,
  (value) => {
    local.api_key = value?.api_key || ''
    local.api_key_env = value?.api_key_env || ''
  },
  { immediate: true, deep: true }
)

watch(
  local,
  () => {
    emit('update:modelValue', { ...props.modelValue, api_key: local.api_key, api_key_env: local.api_key_env })
  },
  { deep: true }
)
</script>
