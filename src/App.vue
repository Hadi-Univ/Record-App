<template>
  <div class="bg-slate-50 text-slate-800 font-sans min-h-screen flex flex-col">
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
          <span class="text-xl font-extrabold text-slate-900">Audio Intelligence</span>
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
          <button
            @click="handleLogout"
            class="ml-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg transition text-xs"
          >
            Sign Out
          </button>
        </div>

        <!-- Mobile hamburger -->
        <button
          class="md:hidden p-2 rounded-lg hover:bg-slate-100 transition"
          @click="mobileMenuOpen = !mobileMenuOpen"
          aria-label="Toggle menu"
        >
          <svg v-if="!mobileMenuOpen" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
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
          <span v-html="navIcons[link.to]" class="flex items-center" />
          <span>{{ link.label }}</span>
        </router-link>
        <div class="pt-2 border-t border-slate-100">
          <div v-if="store.state.user" class="text-xs text-slate-500 px-3 py-1">
            Signed in as <span class="font-semibold">{{ store.state.user.name }}</span>
          </div>
          <button
            @click="handleLogout"
            class="w-full text-left py-2 px-3 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition mt-1"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>

    <!-- Page Content -->
    <main class="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
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
          <span v-html="navIcons[link.to]" class="flex items-center" />
          <span>{{ link.label }}</span>
        </router-link>
      </div>
    </nav>

    <!-- Padding for mobile bottom nav -->
    <div v-if="store.state.token" class="md:hidden h-16" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from './stores/appStore'

const store = useAppStore()
const router = useRouter()
const mobileMenuOpen = ref(false)

const navIcons = {
  '/': `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
  '/history': `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  '/settings': `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`
}

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/history', label: 'History' },
  { to: '/settings', label: 'Settings' }
]

const handleLogout = () => {
  mobileMenuOpen.value = false
  store.logout()
  router.push('/login')
}
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
