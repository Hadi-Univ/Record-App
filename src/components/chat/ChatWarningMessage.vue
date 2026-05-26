<template>
  <div class="px-4 pb-2">
    <SecurityAlert :message="message" />
  </div>
</template>

<script setup>
import SecurityAlert from '../notifications/SecurityAlert.vue'

defineProps({
  message: {
    type: String,
    required: true
  }
})
</script>
