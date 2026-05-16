<template>
  <div class="max-w-3xl mx-auto pb-6">
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-7 space-y-6">
      <div class="space-y-3">
        <router-link
          :to="backPath"
          class="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </router-link>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900">Terms &amp; Conditions</h1>
        <p class="text-sm text-slate-500">
          By logging in or creating an account, you agree to these Terms &amp; Conditions.
        </p>
      </div>

      <div class="prose prose-slate max-w-none text-sm sm:text-[15px] leading-relaxed space-y-5">
        <section class="space-y-2">
          <h2 class="text-base sm:text-lg font-bold text-slate-900">1. Use of the Service</h2>
          <p class="text-slate-700">
            Record Note is provided to help users upload recordings, generate transcripts, and access AI-assisted features. You are responsible for how you use the platform and for ensuring your use follows applicable laws.
          </p>
        </section>

        <section class="space-y-2">
          <h2 class="text-base sm:text-lg font-bold text-slate-900">2. Account Responsibility</h2>
          <p class="text-slate-700">
            You are responsible for all actions taken through your account and credentials. Keep your login details secure and notify the team if you suspect unauthorized access.
          </p>
        </section>

        <section class="space-y-2">
          <h2 class="text-base sm:text-lg font-bold text-slate-900">3. Content and Privacy</h2>
          <p class="text-slate-700">
            You should only upload audio and data that you are allowed to process. Do not submit content that violates privacy, copyright, or other legal protections.
          </p>
        </section>

        <section class="space-y-2">
          <h2 class="text-base sm:text-lg font-bold text-slate-900">4. Availability and Changes</h2>
          <p class="text-slate-700">
            Features and availability may change over time. The service may be updated, improved, or temporarily unavailable due to maintenance or technical issues.
          </p>
        </section>

        <section class="space-y-2">
          <h2 class="text-base sm:text-lg font-bold text-slate-900">5. Contact</h2>
          <p class="text-slate-700">
            If you have questions about these terms, contact the project maintainers through the official repository channels.
          </p>
        </section>

        <p class="text-xs text-slate-400 pt-2 border-t border-slate-100">
          Last updated: May 2026
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/appStore'

const store = useAppStore()
const backPath = computed(() => (store.state.token ? '/settings' : '/login'))
</script>
