<template>
  <div class="max-w-2xl mx-auto space-y-6 pb-4">
    <!-- Header -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h1 class="text-xl font-extrabold text-slate-900">Settings</h1>
      <p class="text-sm text-slate-500 mt-1">Configure your LLM provider and API connection.</p>
    </div>

    <!-- LLM Provider Settings -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
      <h2 class="text-base font-bold text-slate-900">LLM Provider</h2>

      <div class="space-y-1">
        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
          Provider
        </label>
        <select
          v-model="settings.provider"
          class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="ollama">Ollama (Local)</option>
          <option value="openai">OpenAI (ChatGPT)</option>
          <option value="claude">Anthropic Claude</option>
          <option value="gemini">Google Gemini</option>
          <option value="groq">Groq</option>
        </select>
      </div>

      <div class="space-y-1">
        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
          Model Name
          <span class="text-slate-400 font-normal normal-case ml-1">(optional — uses provider default)</span>
        </label>
        <input
          type="text"
          v-model="settings.model"
          :placeholder="modelPlaceholder"
          class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div class="space-y-1">
        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
          API Key
          <span class="text-slate-400 font-normal normal-case ml-1">(leave blank for local providers)</span>
        </label>
        <div class="relative">
          <input
            :type="showApiKey ? 'text' : 'password'"
            v-model="settings.apiKey"
            placeholder="sk-..."
            class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-10"
          />
          <button
            type="button"
            @click="showApiKey = !showApiKey"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition text-xs font-semibold"
          >
            {{ showApiKey ? 'Hide' : 'Show' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Backend Connection -->
    <div
      v-if="store.state.authMethod === 'api'"
      class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5"
    >
      <h2 class="text-base font-bold text-slate-900">Backend Connection</h2>

      <div class="space-y-1">
        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
          API Base URL
        </label>
        <input
          type="url"
          v-model="settings.apiUrl"
          placeholder="http://localhost:8000 (leave blank to use dev proxy)"
          class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p class="text-xs text-slate-400">Base URL of your backend. Leave blank when using the Vite dev-server proxy.</p>
      </div>

      <button
        @click="testConnection"
        :disabled="testing"
        class="w-full md:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition disabled:opacity-50 flex items-center gap-2"
      >
        <svg v-if="testing" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {{ testing ? 'Testing…' : 'Test Connection' }}
      </button>

      <div
        v-if="connectionStatus"
        class="rounded-xl p-3 text-sm font-semibold flex items-center gap-2"
        :class="connectionStatus.ok
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-red-50 text-red-700 border border-red-200'"
      >
        <span v-if="connectionStatus.ok">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </span>
        <span v-else>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </span>
        <span>{{ connectionStatus.message }}</span>
      </div>
    </div>

    <!-- User Info -->
    <div
      v-if="store.state.user"
      class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
    >
      <h2 class="text-base font-bold text-slate-900 mb-3">Account</h2>
      <div class="flex items-center gap-3">
        <img
          v-if="store.state.user.picture"
          :src="store.state.user.picture"
          :alt="store.state.user.name"
          class="w-10 h-10 rounded-full"
        />
        <div
          v-else
          class="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-base"
        >
          {{ store.state.user.name?.charAt(0) || '?' }}
        </div>
        <div>
          <p class="text-sm font-semibold text-slate-800">{{ store.state.user.name }}</p>
          <p class="text-xs text-slate-500">{{ store.state.user.email }}</p>
        </div>
      </div>
    </div>

    <!-- Change Password (basic-auth users only) -->
    <div
      v-if="store.state.authMethod === 'basic'"
      class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4"
    >
      <h2 class="text-base font-bold text-slate-900">Change Password</h2>

      <form @submit.prevent="handleChangePassword" class="space-y-4">
        <div class="space-y-1">
          <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Current Password</label>
          <div class="relative">
            <input
              v-model="currentPassword"
              :type="showPasswords ? 'text' : 'password'"
              required
              autocomplete="current-password"
              placeholder="Your current password"
              class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-10"
            />
            <button
              type="button"
              @click="showPasswords = !showPasswords"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
            >
              {{ showPasswords ? 'Hide' : 'Show' }}
            </button>
          </div>
        </div>

        <div class="space-y-1">
          <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">New Password</label>
          <input
            v-model="newPassword"
            :type="showPasswords ? 'text' : 'password'"
            required
            autocomplete="new-password"
            placeholder="Min. 8 characters"
            minlength="8"
            class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div class="space-y-1">
          <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Confirm New Password</label>
          <input
            v-model="confirmNewPassword"
            :type="showPasswords ? 'text' : 'password'"
            required
            autocomplete="new-password"
            placeholder="Re-enter new password"
            class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            :class="{ 'border-red-400 focus:ring-red-400': changePasswordMismatch }"
          />
          <p v-if="changePasswordMismatch" class="text-xs text-red-600 mt-1">Passwords do not match.</p>
        </div>

        <button
          type="submit"
          :disabled="changingPassword || changePasswordMismatch"
          class="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl transition text-sm disabled:opacity-50 flex items-center gap-2"
        >
          <svg v-if="changingPassword" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          {{ changingPassword ? 'Updating…' : 'Update Password' }}
        </button>
      </form>

      <div
        v-if="changePasswordStatus"
        class="rounded-xl p-3 text-sm font-semibold flex items-center gap-2"
        :class="changePasswordStatus.ok
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-red-50 text-red-700 border border-red-200'"
      >
        <svg v-if="changePasswordStatus.ok" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <svg v-else class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        {{ changePasswordStatus.message }}
      </div>
    </div>

    <!-- Auto-save note -->
    <p class="text-xs text-slate-400 text-center pb-2 flex items-center justify-center gap-1">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
      Settings are saved automatically to your device.
    </p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAppStore } from '../stores/appStore'
import { changePassword } from '../services/authService'

const store = useAppStore()
const settings = store.state.settings

const showApiKey = ref(false)
const testing = ref(false)
const connectionStatus = ref(null)

// Change password
const showPasswords = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const changingPassword = ref(false)
const changePasswordStatus = ref(null)

const changePasswordMismatch = computed(
  () => confirmNewPassword.value.length > 0 && newPassword.value !== confirmNewPassword.value
)

const handleChangePassword = async () => {
  if (changePasswordMismatch.value) return
  changingPassword.value = true
  changePasswordStatus.value = null
  try {
    await changePassword(currentPassword.value, newPassword.value)
    changePasswordStatus.value = { ok: true, message: 'Password updated successfully!' }
    currentPassword.value = ''
    newPassword.value = ''
    confirmNewPassword.value = ''
  } catch (err) {
    changePasswordStatus.value = { ok: false, message: err.message || 'Failed to update password.' }
  } finally {
    changingPassword.value = false
  }
}

const modelPlaceholder = computed(() => {
  const map = {
    ollama: 'e.g. llama3',
    openai: 'e.g. gpt-4o',
    claude: 'e.g. claude-3-5-sonnet-20241022',
    gemini: 'e.g. gemini-1.5-pro',
    groq: 'e.g. llama-3.1-70b-versatile'
  }
  return map[settings.provider] || 'Model name'
})

const testConnection = async () => {
  testing.value = true
  connectionStatus.value = null
  try {
    const baseUrl = store.getBaseUrl()
    const response = await fetch(`${baseUrl}/api/v1/health`, { signal: AbortSignal.timeout(5000) })
    if (response.ok) {
      connectionStatus.value = { ok: true, message: 'Connected successfully!' }
    } else {
      connectionStatus.value = { ok: false, message: `Server responded with status ${response.status}` }
    }
  } catch (err) {
    connectionStatus.value = { ok: false, message: `Could not reach server: ${err.message}` }
  } finally {
    testing.value = false
  }
}
</script>
