<template>
  <div class="bg-slate-50 text-slate-800 font-sans min-h-screen flex flex-col">
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:bg-white focus:text-slate-900 focus:px-3 focus:py-2 focus:rounded-lg focus:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
    >
      Skip to main content
    </a>
    <!-- Top Navigation Bar (only when authenticated) -->
    <nav
      v-if="store.state.token"
      class="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm"
    >
      <div class="max-w-5xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
        <router-link to="/" class="flex items-center gap-2">
          <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
          </svg>
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

        <!-- Mobile user menu trigger -->
        <button
          class="md:hidden px-3 py-2 rounded-lg hover:bg-slate-100 transition text-sm font-semibold text-slate-700 flex items-center gap-1.5 max-w-[70vw]"
          @click="mobileMenuOpen = !mobileMenuOpen"
          :aria-label="`${t('settings.account')} ${t('nav.toggleMenu').toLowerCase()}`"
        >
          <span class="truncate">{{ store.state.user?.name || t('settings.account') }}</span>
          <svg
            class="w-4 h-4 shrink-0 transition-transform"
            :class="{ 'rotate-180': mobileMenuOpen }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
      </div>

      <!-- Mobile dropdown menu -->
      <div v-if="mobileMenuOpen" class="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-2">
        <router-link
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition"
          active-class="bg-indigo-50 text-indigo-700"
          @click="mobileMenuOpen = false"
        >
          <NavIcon :name="link.icon" />
          <span>{{ link.label }}</span>
        </router-link>
        <div class="pt-2 border-t border-slate-100">
          <div v-if="store.state.user" class="text-xs text-slate-500 px-3 py-1">
            {{ t('nav.signedInAs') }} <span class="font-semibold">{{ store.state.user.name }}</span>
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
          class="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from './stores/appStore'
import { refreshAccessToken } from './services/authService'
import NavIcon from './components/NavIcon.vue'
import ErrorBoundary from './components/ErrorBoundary.vue'
import { useI18n } from './i18n/index.js'

const store = useAppStore()
const router = useRouter()
const mobileMenuOpen = ref(false)
const transitionName = ref('slide-left')
const { t } = useI18n()

router.beforeEach((to, from) => {
  const toDepth = to.meta.depth ?? 1
  const fromDepth = from.meta.depth ?? 1
  transitionName.value = toDepth >= fromDepth ? 'slide-left' : 'slide-right'
  return true
})

// Silently refresh the access token on startup when it is near expiry (within
// 7 days) and a refresh token is available.  Errors are swallowed so that
// offline users are never forcibly logged out by a failed refresh attempt.
onMounted(async () => {
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
})

const navLinks = computed(() => [
  { to: '/', label: t('nav.home'), icon: 'home' },
  { to: '/pipeline', label: t('nav.pipeline'), icon: 'pipeline' },
  { to: '/history', label: t('nav.history'), icon: 'history' },
  { to: '/settings', label: t('nav.settings'), icon: 'settings' }
])

</script>
