<template>
  <div class="space-y-2">
    <div v-for="item in providers" :key="item.provider" class="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2 text-xs">
      <span class="font-semibold text-slate-700">{{ item.provider }}</span>
      <span :class="badgeClass(item.status)" class="px-2 py-0.5 rounded-full font-semibold">
        {{ item.status }}
      </span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  providers: { type: Array, default: () => [] }
})

const badgeClass = (status) => {
  if (status === 'healthy') return 'bg-emerald-100 text-emerald-700'
  if (status === 'disabled') return 'bg-slate-100 text-slate-600'
  return 'bg-rose-100 text-rose-700'
}
</script>
