<template>
  <div class="fixed top-3 right-3 z-[70] flex flex-col gap-2 w-[calc(100vw-1.5rem)] sm:w-auto pointer-events-none">
    <ToastNotification
      v-for="item in notifications"
      :key="item.id"
      :item="item"
      class="pointer-events-auto"
      @dismiss="dismissNotification"
    />
  </div>
</template>

<script setup>
import ToastNotification from './ToastNotification.vue'
import { useNotifications } from '../../composables/useNotifications'

const { notifications, dismissNotification } = useNotifications()
</script>
