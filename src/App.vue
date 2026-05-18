<template>
  <div class="font-sans min-h-screen flex flex-col" style="background: var(--app-bg); color: var(--app-text);">
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:bg-white focus:text-slate-900 focus:px-3 focus:py-2 focus:rounded-lg focus:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
    >
      {{ t('nav.skipMainContent') }}
    </a>
    <!-- Top Navigation Bar (only when authenticated) -->
    <nav
      v-if="store.state.token"
      class="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm"
    >
      <div class="max-w-5xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
        <router-link to="/" class="flex items-center gap-2">
          <img src="/logo.svg" alt="Record Note logo" class="w-6 h-6 object-contain" />
          <span class="text-xl font-extrabold text-slate-900">{{ t('nav.appName') }}</span>
        </router-link>

        <!-- Desktop nav links -->
        <div class="hidden md:flex gap-6 items-center text-sm font-semibold text-slate-600">
          <router-link
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="hover:text-indigo-600 transition"
            active-class="text-indigo-600"
            exact-active-class="text-indigo-600"
          >
            {{ link.label }}
          </router-link>
          <div v-if="store.state.user" class="flex items-center gap-2 text-xs text-slate-500">
            <span>{{ store.state.user.name }}</span>
          </div>
        </div>
      </div>
    </nav>

    <!-- Page Content -->
    <main id="main-content" tabindex="-1" class="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 focus:outline-none">
      <router-view v-slot="{ Component }">
        <transition :name="transitionName" mode="out-in">
          <ErrorBoundary>
            <component :is="Component" />
          </ErrorBoundary>
        </transition>
      </router-view>
    </main>

    <!-- Mobile Bottom Navigation (when authenticated) -->
    <nav
      v-if="store.state.token"
      class="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-50 shadow-lg"
    >
      <div class="flex">
        <router-link
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="motion-interactive flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
          active-class="text-indigo-600"
          exact-active-class="text-indigo-600"
        >
          <NavIcon :name="link.icon" />
          <span>{{ link.label }}</span>
        </router-link>
      </div>
    </nav>

    <!-- Padding for mobile bottom nav -->
    <div v-if="store.state.token" class="md:hidden h-16" />
    <PipelineModal />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from './stores/appStore'
import { refreshAccessToken } from './services/authService'
import NavIcon from './components/NavIcon.vue'
import ErrorBoundary from './components/ErrorBoundary.vue'
import PipelineModal from './components/PipelineModal.vue'
import { useI18n } from './i18n/index.js'
import { useScrollReveal } from './composables/useScrollReveal'

const store = useAppStore()
const router = useRouter()
const route = useRoute()
const transitionName = ref('slide-left')
const isBackNavigation = ref(false)
const { t } = useI18n()
const { observeReveals, disconnectReveals } = useScrollReveal()

const isHistoryDetailPath = (path) => /^\/history\/[^/]+$/.test(path || '')
const handlePopstate = () => {
  isBackNavigation.value = true
}

router.beforeEach((to, from) => {
  const toDepth = to.meta.depth ?? 1
  const fromDepth = from.meta.depth ?? 1
  transitionName.value = toDepth >= fromDepth ? 'slide-left' : 'slide-right'

  if (isBackNavigation.value) {
    isBackNavigation.value = false
    if (isHistoryDetailPath(from.path)) {
      if (to.path !== '/history') return '/history'
    } else if (to.path !== '/') {
      return '/'
    }
  }
  return true
})

// Silently refresh the access token on startup when it is near expiry (within
// 7 days) and a refresh token is available.  Errors are swallowed so that
// offline users are never forcibly logged out by a failed refresh attempt.
onMounted(async () => {
  window.addEventListener('popstate', handlePopstate)
  if (
    store.state.authMethod === 'basic' &&
    store.state.refreshToken &&
    store.isTokenNearExpiry()
  ) {
    try {
      await refreshAccessToken()
    } catch {
      // Offline or refresh token expired – keep the existing session alive.
      // The user will be asked to re-authenticate only when they attempt a
      // server action that requires a valid token.
    }
  }

  await router.isReady()
  await nextTick()
  observeReveals(document)
})

watch(() => route.fullPath, () => {
  observeReveals(document)
})

onBeforeUnmount(() => {
  window.removeEventListener('popstate', handlePopstate)
  disconnectReveals()
})

const navLinks = computed(() => [
  { to: '/', label: t('nav.home'), icon: 'home' },
  { to: '/history', label: t('nav.history'), icon: 'history' },
  { to: '/settings', label: t('nav.settings'), icon: 'settings' }
])

</script>
