<template>
  <div class="max-w-2xl mx-auto space-y-6 pb-4">
    <!-- Header -->
    <div data-reveal class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h1 class="text-xl font-extrabold text-slate-900">{{ t('settings.title') }}</h1>
      <p class="text-sm text-slate-500 mt-1">{{ t('settings.subtitle') }}</p>
    </div>

    <!-- Language Settings -->
    <div data-reveal data-reveal-delay="40" class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
      <h2 class="text-base font-bold text-slate-900">{{ t('settings.language') }}</h2>
      <div class="space-y-1">
        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
          {{ t('settings.selectLanguage') }}
        </label>
        <select
          :value="locale"
          @change="setLocale($event.target.value)"
          class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option
            v-for="loc in availableLocales"
            :key="loc.code"
            :value="loc.code"
          >
            {{ loc.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- LLM Provider Settings -->
    <div data-reveal data-reveal-delay="80" class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
      <h2 class="text-base font-bold text-slate-900">{{ t('settings.llmProvider') }}</h2>

      <div class="space-y-1">
        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
          {{ t('settings.provider') }}
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
          {{ t('settings.modelName') }}
          <span class="text-slate-400 font-normal normal-case ml-1">{{ t('settings.modelNameHint') }}</span>
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
          {{ t('settings.apiKey') }}
          <span class="text-slate-400 font-normal normal-case ml-1">{{ t('settings.apiKeyHint') }}</span>
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
            class="motion-interactive absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition text-xs font-semibold"
          >
            {{ showApiKey ? t('settings.hide') : t('settings.show') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Backend Connection -->
    <div
      v-if="store.state.authMethod === 'api'"
      data-reveal
      data-reveal-delay="120"
      class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5"
    >
      <h2 class="text-base font-bold text-slate-900">{{ t('settings.backendConnection') }}</h2>

      <div class="space-y-1">
        <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
          {{ t('settings.apiBaseUrl') }}
        </label>
        <input
          type="url"
          v-model="settings.apiUrl"
          placeholder="http://localhost:8000 (leave blank to use dev proxy)"
          class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p class="text-xs text-slate-400">{{ t('settings.apiBaseUrlHint') }}</p>
      </div>

      <button
        @click="testConnection"
        :disabled="testing"
        class="motion-interactive w-full md:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition disabled:opacity-50 flex items-center gap-2"
      >
        <svg v-if="testing" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {{ testing ? t('settings.testing') : t('settings.testConnection') }}
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
      data-reveal
      data-reveal-delay="160"
      class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4"
    >
      <h2 class="text-base font-bold text-slate-900 mb-3">{{ t('settings.account') }}</h2>
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
      <button
        @click="handleLogout"
        :aria-label="t('nav.signOut')"
        :title="t('nav.signOut')"
        class="motion-interactive w-full md:w-auto bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-4 py-2.5 rounded-xl text-sm transition"
      >
        {{ t('nav.signOut') }}
      </button>
      <a
        v-if="showApiBackendRepoLink"
        href="https://github.com/MMOSHII/Record-Note-API"
        target="_blank"
        rel="noopener noreferrer"
        class="motion-interactive w-full md:w-auto inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition"
      >
        {{ t('settings.apiBackendRepository') }}
      </a>
    </div>

    <!-- Creators -->
    <div data-reveal data-reveal-delay="200" class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
      <h2 class="text-base font-bold text-slate-900">{{ t('settings.creatorsTitle') }}</h2>
      <p class="text-sm text-slate-500">{{ t('settings.creatorsSubtitle') }}</p>

      <div v-if="contributorsLoading" class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 flex items-center gap-2">
        <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span>{{ t('settings.creatorsLoading') }}</span>
      </div>

      <div
        v-else-if="contributorsError"
        class="rounded-xl p-3 text-sm font-semibold flex items-center justify-between gap-3 bg-red-50 text-red-700 border border-red-200"
      >
        <span>{{ contributorsError }}</span>
        <button
          type="button"
          @click="fetchContributors"
          class="motion-interactive shrink-0 bg-white hover:bg-red-100 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
        >
          {{ t('settings.retry') }}
        </button>
      </div>

      <p v-else-if="contributors.length === 0" class="text-sm text-slate-500">
        {{ t('settings.creatorsEmpty') }}
      </p>

      <ul v-else class="space-y-2">
        <li
          v-for="contributor in contributors"
          :key="contributor.id"
          class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5"
        >
          <div class="flex items-center gap-3 min-w-0">
            <img
              v-if="contributor.avatarUrl"
              :src="contributor.avatarUrl"
              :alt="contributor.name"
              class="w-8 h-8 rounded-full"
            />
            <div
              v-else
              class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0"
            >
              {{ contributor.fallbackInitial }}
            </div>
            <span class="text-sm font-medium text-slate-800 truncate">{{ contributor.name }}</span>
          </div>
          <a
            v-if="contributor.profileUrl"
            :href="contributor.profileUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition shrink-0"
          >
            {{ t('settings.viewProfile') }}
          </a>
        </li>
      </ul>
    </div>

    <!-- Change Password (basic-auth users only) -->
    <div
      v-if="store.state.authMethod === 'basic'"
      class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4"
    >
      <h2 class="text-base font-bold text-slate-900">{{ t('settings.changePassword') }}</h2>

      <form @submit.prevent="handleChangePassword" class="space-y-4">
        <div class="space-y-1">
          <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">{{ t('settings.currentPassword') }}</label>
          <div class="relative">
            <input
              v-model="currentPassword"
              :type="showPasswords ? 'text' : 'password'"
              required
              autocomplete="current-password"
              :placeholder="t('settings.currentPasswordPlaceholder')"
              class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-10"
            />
            <button
              type="button"
              @click="showPasswords = !showPasswords"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
            >
              {{ showPasswords ? t('settings.hide') : t('settings.show') }}
            </button>
          </div>
        </div>

        <div class="space-y-1">
          <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">{{ t('settings.newPassword') }}</label>
          <input
            v-model="newPassword"
            :type="showPasswords ? 'text' : 'password'"
            required
            autocomplete="new-password"
            :placeholder="t('settings.newPasswordPlaceholder')"
            minlength="8"
            class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div class="space-y-1">
          <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">{{ t('settings.confirmNewPassword') }}</label>
          <input
            v-model="confirmNewPassword"
            :type="showPasswords ? 'text' : 'password'"
            required
            autocomplete="new-password"
            :placeholder="t('settings.confirmNewPasswordPlaceholder')"
            class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            :class="{ 'border-red-400 focus:ring-red-400': changePasswordMismatch }"
          />
          <p v-if="changePasswordMismatch" class="text-xs text-red-600 mt-1">{{ t('settings.passwordMismatch') }}</p>
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
          {{ changingPassword ? t('settings.updating') : t('settings.updatePassword') }}
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
      {{ t('settings.autoSaveNote') }}
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/appStore'
import { changePassword } from '../services/authService'
import { createRequestCanceller, requestJson } from '../services/httpClient'
import { useI18n } from '../i18n/index.js'

const store = useAppStore()
const router = useRouter()
const settings = store.state.settings
const { t, locale, setLocale, availableLocales } = useI18n()
const API_USER_ROLE = 'api user'
const GITHUB_CONTRIBUTORS_URL = 'https://api.github.com/repos/Hadi-Univ/Record-App/contributors'
const GITHUB_API_TIMEOUT_MS = 5000

const showApiKey = ref(false)
const testing = ref(false)
const connectionStatus = ref(null)
const contributors = ref([])
const contributorsLoading = ref(false)
const contributorsError = ref('')
const requestCanceller = createRequestCanceller()

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
    changePasswordStatus.value = { ok: true, message: t('settings.passwordUpdated') }
    currentPassword.value = ''
    newPassword.value = ''
    confirmNewPassword.value = ''
  } catch (err) {
    changePasswordStatus.value = { ok: false, message: err.message || t('settings.passwordFailed') }
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

const showApiBackendRepoLink = computed(() => {
  const role = (store.state.user?.role || '').toLowerCase().trim()
  return role === API_USER_ROLE || store.state.authMethod === 'api'
})

const handleLogout = () => {
  store.logout()
  router.push('/login')
}

const fetchContributors = async () => {
  const signal = requestCanceller.nextSignal('contributors')
  contributorsLoading.value = true
  contributorsError.value = ''
  try {
    const data = await requestJson(GITHUB_CONTRIBUTORS_URL, {
      method: 'GET',
      headers: { Accept: 'application/vnd.github+json' },
      timeoutMs: GITHUB_API_TIMEOUT_MS,
      retries: 1,
      signal
    })
    const unknownContributor = t('settings.unknownContributor')
    contributors.value = Array.isArray(data)
      ? data.map((contributor, index) => {
        const name = contributor.login || unknownContributor
        return {
          id: contributor.id ?? `contributor-${index}`,
          name,
          avatarUrl: contributor.avatar_url || '',
          profileUrl: contributor.html_url || '',
          fallbackInitial: name.charAt(0).toUpperCase()
        }
      })
      : []
  } catch (err) {
    if (signal.aborted) {
      return
    }
    if (err?.name === 'TimeoutError' || err?.message?.toLowerCase?.().includes('timed out')) {
      contributorsError.value = t('settings.creatorsLoadTimedOut')
    } else {
      contributorsError.value = t('settings.creatorsLoadFailedGeneric')
    }
    contributors.value = []
  } finally {
    contributorsLoading.value = false
  }
}

const testConnection = async () => {
  const signal = requestCanceller.nextSignal('health-check')
  testing.value = true
  connectionStatus.value = null
  try {
    const baseUrl = store.getBaseUrl()
    await requestJson(`${baseUrl}/api/v1/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      timeoutMs: 5000,
      retries: 1,
      signal
    })
    connectionStatus.value = { ok: true, message: t('settings.connectedSuccessfully') }
  } catch (err) {
    if (signal.aborted) {
      return
    }
    if (err?.status) {
      connectionStatus.value = { ok: false, message: t('settings.connectionStatus', { status: err.status }) }
      return
    }
    connectionStatus.value = { ok: false, message: t('settings.connectionFailed', { error: err.message }) }
  } finally {
    if (!signal.aborted) {
      testing.value = false
    }
  }
}

onMounted(() => {
  fetchContributors()
})

onBeforeUnmount(() => {
  requestCanceller.clearAll()
})
</script>
