<template>
  <div class="flex items-center justify-center min-h-[80vh] px-4">
    <div data-reveal class="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <!-- Header -->
      <div class="text-center mb-6">
        <div class="flex justify-center mb-3">
          <svg class="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <h1 class="text-2xl font-extrabold text-slate-900">{{ t('forgotPassword.title') }}</h1>
        <p class="text-slate-500 text-sm mt-2">
          {{ t('forgotPassword.subtitle') }}
        </p>
      </div>

      <form v-if="!sent" @submit.prevent="handleSubmit" class="space-y-4">
        <div class="space-y-1">
          <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">{{ t('forgotPassword.email') }}</label>
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            :placeholder="t('forgotPassword.emailPlaceholder')"
            class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="motion-interactive w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          {{ loading ? t('forgotPassword.sending') : t('forgotPassword.sendResetLink') }}
        </button>
      </form>

      <!-- Sent state -->
      <div v-else class="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
        <svg class="w-10 h-10 text-emerald-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-emerald-800 font-semibold text-sm">{{ t('forgotPassword.checkInbox') }}</p>
        <p class="text-emerald-700 text-sm mt-1">
          {{ t('forgotPassword.resetSent', { email }) }}
        </p>
      </div>

      <!-- Error message -->
      <div v-if="errorMsg" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mt-4">
        {{ errorMsg }}
      </div>

      <p class="text-center text-sm text-slate-500 mt-5">
        {{ t('forgotPassword.rememberPassword') }}
        <router-link to="/login" class="text-indigo-600 hover:text-indigo-800 font-semibold">{{ t('forgotPassword.signIn') }}</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { forgotPassword } from '../services/authService'
import { useI18n } from '../i18n/index.js'

const { t } = useI18n()
const email = ref('')
const loading = ref(false)
const errorMsg = ref('')
const sent = ref(false)

const handleSubmit = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    await forgotPassword(email.value)
    sent.value = true
  } catch (e) {
    errorMsg.value = e.message || 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>
