<template>
  <div class="flex items-center justify-center min-h-[80vh] px-4">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
      <div class="mb-6">
        <div class="flex justify-center mb-3">
          <svg class="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
          </svg>
        </div>
        <h1 class="text-3xl font-extrabold text-slate-900">Audio Intelligence</h1>
        <p class="text-slate-500 text-sm mt-2">
          Upload audio → Transcribe → Summarize → Visualize
        </p>
      </div>

      <div class="bg-indigo-50 rounded-xl p-5 mb-6">
        <h2 class="text-base font-bold text-slate-800 mb-1">Sign in to get started</h2>
        <p class="text-xs text-slate-500 mb-4">
          Use your Google account to securely access your processing pipeline.
        </p>
        <div id="google-btn-container" class="flex justify-center" />
      </div>

      <div v-if="errorMsg" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">
        {{ errorMsg }}
      </div>

      <p class="text-[11px] text-slate-400">
        Your token is used only to authenticate against your own backend API.
        Nothing is stored on external servers.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/appStore'

const router = useRouter()
const { state } = useAppStore()
const errorMsg = ref('')

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '710746488463-9ibge0al61j8sseikfde8c3ejc8h99uh.apps.googleusercontent.com'

const handleCredentialResponse = (response) => {
  try {
    state.token = response.credential

    // Decode JWT payload for user info (no verification needed — backend will validate)
    const parts = response.credential.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
      state.user = {
        name: payload.name || payload.email || 'User',
        email: payload.email || '',
        picture: payload.picture || ''
      }
    }

    router.push('/')
  } catch (e) {
    errorMsg.value = 'Failed to process login response. Please try again.'
    console.error('Login error:', e)
  }
}

onMounted(() => {
  const initGoogle = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false
      })
      window.google.accounts.id.renderButton(
        document.getElementById('google-btn-container'),
        { theme: 'outline', size: 'large', type: 'standard', shape: 'rectangular', width: 280 }
      )
    } else {
      // Retry after a short delay if the script hasn't loaded yet
      setTimeout(initGoogle, 300)
    }
  }

  initGoogle()
})
</script>
