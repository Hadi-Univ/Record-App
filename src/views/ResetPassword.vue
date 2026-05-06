<template>
  <div class="flex items-center justify-center min-h-[80vh] px-4">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <!-- Header -->
      <div class="text-center mb-6">
        <div class="flex justify-center mb-3">
          <svg class="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
          </svg>
        </div>
        <h1 class="text-2xl font-extrabold text-slate-900">{{ t('resetPassword.title') }}</h1>
        <p class="text-slate-500 text-sm mt-2">Enter your new password below.</p>
      </div>

      <!-- Invalid / missing token -->
      <div v-if="!resetToken" class="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4 text-center">
        <p class="font-semibold mb-1">Missing reset token</p>
        <p>This link appears to be invalid. Please request a new password reset.</p>
        <router-link to="/forgot-password" class="mt-3 inline-block text-indigo-600 hover:text-indigo-800 font-semibold text-sm">
          Request new link →
        </router-link>
      </div>

      <form v-else-if="!done" @submit.prevent="handleSubmit" class="space-y-4">
        <div class="space-y-1">
          <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">{{ t('resetPassword.newPassword') }}</label>
          <div class="relative">
            <input
              v-model="newPassword"
              :type="showPassword ? 'text' : 'password'"
              required
              autocomplete="new-password"
              :placeholder="t('resetPassword.newPasswordPlaceholder')"
              minlength="8"
              class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-10"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
            >
              {{ showPassword ? t('signup.hide') : t('signup.show') }}
            </button>
          </div>
        </div>

        <div class="space-y-1">
          <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">{{ t('resetPassword.confirmPassword') }}</label>
          <input
            v-model="confirmPassword"
            :type="showPassword ? 'text' : 'password'"
            required
            autocomplete="new-password"
            :placeholder="t('resetPassword.confirmPasswordPlaceholder')"
            class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            :class="{ 'border-red-400 focus:ring-red-400': passwordMismatch }"
          />
          <p v-if="passwordMismatch" class="text-xs text-red-600 mt-1">{{ t('resetPassword.passwordMismatch') }}</p>
        </div>

        <button
          type="submit"
          :disabled="loading || passwordMismatch"
          class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          {{ loading ? t('resetPassword.resetting') : t('resetPassword.resetPassword') }}
        </button>
      </form>

      <!-- Success state -->
      <div v-else class="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
        <svg class="w-10 h-10 text-emerald-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-emerald-800 font-semibold text-sm">Password reset successfully!</p>
        <router-link to="/login" class="mt-3 inline-block text-indigo-600 hover:text-indigo-800 font-semibold text-sm">
          Sign in with your new password →
        </router-link>
      </div>

      <!-- Error message -->
      <div v-if="errorMsg" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mt-4">
        {{ errorMsg }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { resetPassword } from '../services/authService'
import { useI18n } from '../i18n/index.js'

const route = useRoute()
const { t } = useI18n()
const resetToken = route.query.token || ''
const newPassword = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const done = ref(false)

const passwordMismatch = computed(
  () => confirmPassword.value.length > 0 && newPassword.value !== confirmPassword.value
)

const handleSubmit = async () => {
  if (passwordMismatch.value) return
  loading.value = true
  errorMsg.value = ''
  try {
    await resetPassword(resetToken, newPassword.value)
    done.value = true
  } catch (e) {
    errorMsg.value = e.message || 'Password reset failed. The link may have expired.'
  } finally {
    loading.value = false
  }
}
</script>
