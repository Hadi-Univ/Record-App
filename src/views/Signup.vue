<template>
  <div class="flex items-center justify-center min-h-[80vh] px-4">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <!-- Header -->
      <div class="text-center mb-6">
        <div class="flex justify-center mb-3">
          <svg class="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
          </svg>
        </div>
        <h1 class="text-2xl font-extrabold text-slate-900">{{ t('signup.title') }}</h1>
        <p class="text-slate-500 text-sm mt-2">{{ t('signup.subtitle') }}</p>
      </div>

      <form @submit.prevent="handleSignup" class="space-y-4">
        <div class="space-y-1">
          <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">{{ t('signup.fullName') }}</label>
          <input
            v-model="name"
            type="text"
            required
            autocomplete="name"
            :placeholder="t('signup.fullNamePlaceholder')"
            class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div class="space-y-1">
          <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">{{ t('signup.email') }}</label>
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            :placeholder="t('signup.emailPlaceholder')"
            class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div class="space-y-1">
          <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">{{ t('signup.password') }}</label>
          <div class="relative">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              autocomplete="new-password"
              :placeholder="t('signup.passwordPlaceholder')"
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
          <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">{{ t('signup.confirmPassword') }}</label>
          <input
            v-model="confirmPassword"
            :type="showPassword ? 'text' : 'password'"
            required
            autocomplete="new-password"
            :placeholder="t('signup.confirmPasswordPlaceholder')"
            class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            :class="{ 'border-red-400 focus:ring-red-400': passwordMismatch }"
          />
          <p v-if="passwordMismatch" class="text-xs text-red-600 mt-1">{{ t('signup.passwordMismatch') }}</p>
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
          {{ loading ? t('signup.creating') : t('signup.createAccount') }}
        </button>
      </form>

      <!-- Error message -->
      <div v-if="errorMsg" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mt-4">
        {{ errorMsg }}
      </div>

      <!-- Success message (no auto-login token) -->
      <div v-if="successMsg" class="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl p-3 mt-4">
        {{ successMsg }}
      </div>

      <p class="text-center text-sm text-slate-500 mt-5">
        {{ t('signup.haveAccount') }}
        <router-link to="/login" class="text-indigo-600 hover:text-indigo-800 font-semibold">{{ t('signup.signIn') }}</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { registerBasic } from '../services/authService'
import { useI18n } from '../i18n/index.js'

const router = useRouter()
const { t } = useI18n()
const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const passwordMismatch = computed(
  () => confirmPassword.value.length > 0 && password.value !== confirmPassword.value
)

const handleSignup = async () => {
  if (passwordMismatch.value) return
  loading.value = true
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const data = await registerBasic(name.value, email.value, password.value)
    // If backend returned a token, registerBasic already set state — go home
    if (data.token || data.access_token) {
      router.push('/')
    } else {
      successMsg.value = 'Account created! You can now sign in with your email and password.'
    }
  } catch (e) {
    errorMsg.value = e.message || 'Registration failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>
