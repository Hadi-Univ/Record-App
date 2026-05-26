<template>
  <AuthPageCard>
    <!-- Header -->
    <div class="text-center mb-6">
      <div class="flex justify-center mb-3">
        <img src="/logo.svg" alt="Record Note logo" class="w-12 h-12 object-contain" />
      </div>
      <h1 class="text-3xl font-extrabold text-slate-900">{{ t('login.appName') }}</h1>
      <p class="text-slate-500 text-sm mt-2">{{ t('login.subtitle') }}</p>
    </div>

    <!-- Tab toggle -->
    <div class="flex rounded-xl bg-slate-100 p-1 mb-6">
      <button
        class="motion-interactive flex-1 py-2 text-sm font-semibold rounded-lg transition"
        :class="tab === 'basic' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-700 hover:text-slate-900'"
        @click="tab = 'basic'"
        :aria-pressed="tab === 'basic'"
      >
        {{ t('login.emailPassword') }}
      </button>
      <button
        class="motion-interactive flex-1 py-2 text-sm font-semibold rounded-lg transition"
        :class="tab === 'api' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-700 hover:text-slate-900'"
        @click="tab = 'api'"
        :aria-pressed="tab === 'api'"
      >
        {{ t('login.apiToken') }}
      </button>
    </div>
    
    <!-- Email & Password tab -->
    <div v-show="tab === 'basic'">
      <form @submit.prevent="handleBasicLogin" class="space-y-4">
        <div class="space-y-1">
          <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">{{ t('login.emailOrUsername') }}</label>
          <input
            v-model="identifier"
            type="text"
            required
            autocomplete="username"
            :placeholder="t('login.emailOrUsernamePlaceholder')"
            class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div class="space-y-1">
          <div class="flex justify-between items-center">
            <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">{{ t('login.password') }}</label>
            <router-link to="/forgot-password" class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
              {{ t('login.forgotPassword') }}
            </router-link>
          </div>
          <div class="relative">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              autocomplete="current-password"
              placeholder="••••••••"
              class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-10"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              :aria-label="showPassword ? t('login.hidePasswordAria') : t('login.showPasswordAria')"
              class="motion-interactive absolute right-1.5 top-1/2 -translate-y-1/2 min-h-9 min-w-9 px-1 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
            >
              {{ showPassword ? t('signup.hide') : t('signup.show') }}
            </button>
          </div>
        </div>
        <button
          type="submit"
          :disabled="loading"
          class="motion-interactive w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <AppSpinner v-if="loading" />
          {{ loading ? t('login.signingIn') : t('login.signIn') }}
        </button>
      </form>

      <p class="text-center text-sm text-slate-500 mt-4">
        {{ t('login.noAccount') }}
        <router-link to="/signup" class="text-indigo-600 hover:text-indigo-800 font-semibold">{{ t('login.signUp') }}</router-link>
      </p>

      <p class="text-xs text-slate-500 text-center leading-relaxed">
        {{ t('terms.consentPrefix') }}
        <button
          type="button"
          @click="termsOpen = true"
          class="text-indigo-600 hover:text-indigo-800 font-semibold"
        >
          {{ t('terms.title') }}
        </button>.
      </p>

      <div class="relative flex py-6 items-center">
        <div class="flex-grow border-t border-slate-200"></div>
        <span class="flex-shrink-0 mx-4 text-slate-400 text-xs font-semibold uppercase tracking-wide">{{ t('login.orContinueWith') }}</span>
        <div class="flex-grow border-t border-slate-200"></div>
      </div>

      <div>
        <div v-if="isNative" class="flex justify-center">
          <button
            @click="handleNativeGoogleSignIn"
            :disabled="loading"
            class="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 font-semibold px-5 py-2.5 rounded-xl shadow-sm transition disabled:opacity-50 text-sm"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {{ loading ? t('login.signingIn') : t('login.signInWithGoogle') }}
          </button>
        </div>

        <div v-else class="flex justify-center">
          <div id="google-btn-container" class="w-full flex justify-center" />
        </div>
      </div>
    </div>

    <!-- API Token tab -->
    <div v-show="tab === 'api'" class="space-y-4">
      <div class="space-y-1">
        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
          {{ t('login.backendUrl') }}
        </label>
        <input
          v-model="apiUrl"
          type="url"
          :placeholder="t('login.backendUrlPlaceholder')"
          class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p class="text-xs text-slate-400">{{ t('settings.apiBaseUrlHint') }}</p>
      </div>
      <div class="space-y-1">
        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">{{ t('login.apiTokenLabel') }}</label>
        <input
          v-model="apiToken"
          type="password"
          required
          :placeholder="t('login.apiTokenPlaceholder')"
          class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <div class="space-y-1">
          <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
            {{ t('login.displayName') }}
            <span class="text-slate-400 font-normal normal-case ml-1">{{ t('shared.optional') }}</span>
          </label>
        <input
          v-model="apiDisplayName"
          type="text"
          :placeholder="t('login.displayNamePlaceholder')"
          class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <div class="space-y-1">
          <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
            {{ t('login.email') }}
            <span class="text-slate-400 font-normal normal-case ml-1">{{ t('shared.optional') }}</span>
          </label>
        <input
          v-model="apiEmail"
          type="email"
          :placeholder="t('login.emailPlaceholder')"
          class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <button
        type="button"
        :disabled="loading"
        @click="handleApiTokenLogin"
        class="motion-interactive w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition text-sm disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <AppSpinner v-if="loading" />
        {{ loading ? t('login.signingIn') : t('login.loginWithToken') }}
      </button>
    </div>

    <AlertMessage :message="errorMsg" type="error" class="mt-4" />

    <p class="text-[11px] text-slate-400 text-center mt-5">{{ t('login.tokenNotice') }}</p>
    <TermsConditionsModal v-model="termsOpen" />
  </AuthPageCard>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/appStore'
import {
  isCapacitorNative,
  signInWithGoogleNative,
  loginBasic,
  loginWithApiToken
} from '../services/authService'
import { env } from '../config/env'
import { useI18n } from '../i18n/index.js'
import AuthPageCard from '../components/AuthPageCard.vue'
import AppSpinner from '../components/AppSpinner.vue'
import AlertMessage from '../components/AlertMessage.vue'
import TermsConditionsModal from '../components/TermsConditionsModal.vue'

const router = useRouter()
const route = useRoute()
const store = useAppStore()
const { state } = store
const { t } = useI18n()
const errorMsg = ref('')
const loading = ref(false)
const tab = ref('basic')
const identifier = ref('')
const password = ref('')
const showPassword = ref(false)
const termsOpen = ref(false)
const apiToken = ref('')
const apiDisplayName = ref('')
const apiEmail = ref('')
const apiUrl = ref(state.settings.apiUrl || '')

const GOOGLE_CLIENT_ID = env.googleClientId
const isNative = isCapacitorNative()

const redirectToHome = () => {
  store.beginBackendBootstrap({
    title: t('home.preparingWorkspaceTitle'),
    message: t('home.preparingWorkspaceDescription')
  })
  router.push('/')
}

// ---------------------------------------------------------------------------
// Google OAuth – web GIS flow
// ---------------------------------------------------------------------------
const handleCredentialResponse = (response) => {
  ;(async () => {
    try {
      state.token = response.credential
      const parts = response.credential.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
        state.user = {
          name: payload.name || payload.email || t('login.userFallback'),
          email: payload.email || '',
          picture: payload.picture || ''
        }
      }
      state.authMethod = 'oauth'
      redirectToHome()
    } catch (e) {
      errorMsg.value = 'Failed to process login response. Please try again.'
      console.error('Login error:', e)
    }
  })()
}

// ---------------------------------------------------------------------------
// Google OAuth – Capacitor native flow
// ---------------------------------------------------------------------------
const handleNativeGoogleSignIn = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    await signInWithGoogleNative()
    redirectToHome()
  } catch (e) {
    errorMsg.value = e.message || t('login.googleFailed')
    console.error('Native Google sign-in error:', e)
  } finally {
    loading.value = false
  }
}

// ---------------------------------------------------------------------------
// Basic login
// ---------------------------------------------------------------------------
const handleBasicLogin = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    await loginBasic(identifier.value, password.value)
    redirectToHome()
  } catch (e) {
    errorMsg.value = e.message || t('login.basicFailed')
  } finally {
    loading.value = false
  }
}

// ---------------------------------------------------------------------------
// API token login
// ---------------------------------------------------------------------------
const handleApiTokenLogin = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    state.settings.apiUrl = apiUrl.value.trim()
    loginWithApiToken(apiToken.value, apiDisplayName.value, apiEmail.value)
    redirectToHome()
  } catch (e) {
    errorMsg.value = e.message || t('login.apiTokenInvalid')
  } finally {
    loading.value = false
  }
}

const initGoogle = () => {
  if (window.google?.accounts?.id && document.getElementById('google-btn-container')) {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      auto_select: false
    })
    window.google.accounts.id.renderButton(
      document.getElementById('google-btn-container'),
      { theme: 'outline', size: 'large', type: 'standard', shape: 'rectangular', width: 340 }
    )
  } else {
    setTimeout(initGoogle, 300)
  }
}

watch(tab, async (newTab) => {
  if (newTab === 'basic') {
    // Wait for Vue to finish putting the <div id="google-btn-container"> back into the DOM
    await nextTick() 
    initGoogle()
  }
})

onMounted(() => {
  if (state.capabilities?.error && !errorMsg.value) {
    errorMsg.value = state.capabilities.error
  } else if (route.query?.capability_error) {
    errorMsg.value = String(route.query.capability_error)
  }
  if (isNative) return  // native path — no GIS needed

  if (!GOOGLE_CLIENT_ID) {
    console.warn('[Auth] VITE_GOOGLE_CLIENT_ID is not set. Google Sign-In is unavailable.')
    return
  }

  initGoogle()
})
</script>
