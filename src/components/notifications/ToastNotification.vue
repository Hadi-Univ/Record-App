<template>
  <div
    class="w-full sm:max-w-sm rounded-xl border p-3 shadow-md bg-white flex items-start gap-2"
    :class="variantClass"
    role="status"
    aria-live="polite"
  >
    <div class="text-xs font-semibold flex-1">{{ item.message }}</div>
    <button class="text-xs font-bold opacity-70 hover:opacity-100" @click="$emit('dismiss', item.id)">
      ×
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  }
})

defineEmits(['dismiss'])

const variantClass = computed(() => {
  const map = {
    info: 'border-indigo-200 text-indigo-700',
    warning: 'border-amber-200 text-amber-700',
    error: 'border-red-200 text-red-700',
  }
  return map[props.item?.type] || map.info
})
</script>
