<template>
  <label class="text-xs text-slate-600 space-y-1 block">
    <span>Active STT Provider</span>
    <select v-model="modelValueProxy" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm">
      <option v-for="item in providers" :key="item.provider" :value="item.provider">
        {{ item.provider }}
      </option>
    </select>
  </label>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  providers: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue'])

const modelValueProxy = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>
