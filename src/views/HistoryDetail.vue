<template>
  <div class="min-h-screen pb-10 space-y-4">

    <!-- ──────────────── Header Card ──────────────── -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <!-- Back nav -->
      <router-link
        to="/history"
        class="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition group mb-4"
      >
        <svg class="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        Back to History
      </router-link>

      <div class="flex flex-col md:flex-row md:items-start gap-4">
        <!-- Title + metadata -->
        <div class="flex-1 min-w-0">
          <h1 class="text-xl font-extrabold text-slate-900 break-all font-mono leading-snug">{{ folderName }}</h1>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
            <span v-if="manifest?.file_name" class="flex items-center gap-1 text-xs text-slate-500">
              <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
              </svg>
              {{ manifest.file_name }}
            </span>
            <span v-if="manifest?.created_at" class="flex items-center gap-1 text-xs text-slate-400">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              {{ formatDate(manifest.created_at) }}
            </span>
            <span v-if="manifest?.provider" class="text-xs bg-slate-100 border border-slate-200 text-slate-600 font-semibold px-2 py-0.5 rounded-md font-mono">
              {{ manifest.provider }}
            </span>
          </div>
        </div>

        <!-- Status + Quick re-run actions -->
        <div class="flex flex-col gap-3 flex-shrink-0">
          <!-- Pipeline status -->
          <div v-if="manifest?.status" class="flex flex-wrap gap-x-3 gap-y-1">
            <div v-for="(step, key) in { Transcribe: manifest.status.transcribe, Summarize: manifest.status.summarize, Visualize: manifest.status.visualize, Translate: manifest.status.translate }" :key="key" class="flex items-center gap-1.5">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{{ key }}</span>
              <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold" :class="statusClass(step)">
                {{ String(step || '—').toUpperCase() }}
              </span>
            </div>
          </div>
          <!-- Re-run quick buttons -->
          <div v-if="canSummarize || canVisualize" class="flex flex-wrap gap-2">
            <button
              v-if="canSummarize"
              @click="runSummarizeDetail"
              :disabled="actionLoading.summarize"
              class="inline-flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold px-3 py-1.5 rounded-lg transition shadow-sm"
            >
              <svg v-if="actionLoading.summarize" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              {{ actionLoading.summarize ? 'Summarizing…' : 'Summarize' }}
            </button>
            <button
              v-if="canVisualize"
              @click="runVisualizeDetail"
              :disabled="actionLoading.visualize"
              class="inline-flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold px-3 py-1.5 rounded-lg transition shadow-sm"
            >
              <svg v-if="actionLoading.visualize" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>
              {{ actionLoading.visualize ? 'Visualizing…' : 'Visualize' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Language switcher (integrated in header) -->
      <div v-if="!loading && availableTranslations.length > 0" class="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100">
        <span class="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 flex-shrink-0">
          <svg class="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/>
          </svg>
          Language:
        </span>
        <button
          @click="switchToTranslation(null)"
          :class="selectedLangPair === null ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          class="text-xs font-semibold px-3 py-1 rounded-lg transition"
        >Original</button>
        <button
          v-for="lp in availableTranslations"
          :key="lp"
          @click="switchToTranslation(lp)"
          :class="selectedLangPair === lp ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          class="text-xs font-semibold px-3 py-1 rounded-lg transition"
        >{{ langPairLabel(lp) }}</button>
        <svg v-if="viewLoading" class="w-3.5 h-3.5 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <p v-if="viewError" class="w-full text-xs text-red-600 font-semibold mt-1">{{ viewError }}</p>
      </div>

      <!-- Action feedback (inline in header) -->
      <div v-if="actionError" class="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
        <svg class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        <p class="text-xs text-red-700 font-semibold">{{ actionError }}</p>
      </div>
      <div v-if="actionSuccess" class="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
        <svg class="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
        <p class="text-xs text-emerald-700 font-semibold">{{ actionSuccess }}</p>
      </div>
    </div>

    <!-- ──────────────── Error Banner ──────────────── -->
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
      <span class="text-red-500 flex-shrink-0 mt-0.5">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
      </span>
      <p class="text-sm font-semibold text-red-700">{{ error }}</p>
    </div>

    <!-- ──────────────── Skeleton Loading ──────────────── -->
    <template v-if="loading">
      <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
        <div class="flex gap-1 px-4 pt-4 pb-3 border-b border-slate-100">
          <div class="h-8 bg-slate-200 rounded-lg w-24"/>
          <div class="h-8 bg-slate-100 rounded-lg w-28"/>
          <div class="h-8 bg-slate-100 rounded-lg w-20"/>
          <div class="h-8 bg-slate-100 rounded-lg w-20"/>
        </div>
        <div class="p-6 space-y-4">
          <div class="h-4 bg-slate-200 rounded w-1/3"/>
          <div class="space-y-2">
            <div class="h-3 bg-slate-100 rounded w-full"/>
            <div class="h-3 bg-slate-100 rounded w-5/6"/>
            <div class="h-3 bg-slate-100 rounded w-4/6"/>
            <div class="h-3 bg-slate-100 rounded w-3/4"/>
          </div>
          <div class="grid grid-cols-2 gap-4 pt-2">
            <div class="h-24 bg-slate-100 rounded-xl"/>
            <div class="h-24 bg-slate-100 rounded-xl"/>
          </div>
        </div>
      </div>
    </template>

    <!-- ──────────────── Main Content (Tab-based) ──────────────── -->
    <template v-else-if="!error">
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

        <!-- Tab Navigation Bar -->
        <nav class="flex overflow-x-auto border-b border-slate-200 px-1 pt-1 gap-1 scrollbar-hide">
          <button
            @click="activeTab = 'summary'"
            :class="activeTab === 'summary'
              ? 'text-amber-700 bg-amber-50 border-amber-400'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent'"
            class="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition-colors"
          >
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Summary
          </button>

          <button
            v-if="hasTranscriptContent"
            @click="activeTab = 'transcript'"
            :class="activeTab === 'transcript'
              ? 'text-emerald-700 bg-emerald-50 border-emerald-400'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent'"
            class="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition-colors"
          >
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            Transcript
            <span v-if="transcriptData.length" class="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{{ transcriptData.length }}</span>
          </button>

          <button
            v-if="manifest?.files?.transcript_json"
            @click="activeTab = 'ai'"
            :class="activeTab === 'ai'
              ? 'text-teal-700 bg-teal-50 border-teal-400'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent'"
            class="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition-colors"
          >
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
            AI Tools
          </button>

          <button
            @click="activeTab = 'actions'"
            :class="activeTab === 'actions'
              ? 'text-indigo-700 bg-indigo-50 border-indigo-400'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent'"
            class="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition-colors"
          >
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            Actions
          </button>
        </nav>

        <!-- ── Tab Panel: Summary ── -->
        <div v-if="activeTab === 'summary'" class="p-6">
          <div v-if="detail.summary" class="space-y-6">
            <!-- Download row -->
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-bold text-slate-700 flex items-center gap-2">
                <span class="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <svg class="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </span>
                Summary
              </h2>
              <div class="flex gap-2">
                <a :href="downloadUrl('summary_txt')" download class="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  TXT
                </a>
                <a :href="downloadUrl('summary_html')" download class="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  HTML
                </a>
              </div>
            </div>
            <article class="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed markdown-summary" v-html="renderedSummary"></article>
          </div>
          <!-- Empty state with CTA -->
          <div v-else class="flex flex-col items-center justify-center py-12 text-center">
            <div class="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
              <svg class="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <p class="text-sm font-semibold text-slate-600 mb-1">No summary yet</p>
            <p class="text-xs text-slate-400 mb-5">Run the summarize step to generate an AI summary of this recording.</p>
            <button
              v-if="fileName"
              @click="runSummarizeDetail"
              :disabled="actionLoading.summarize"
              class="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition shadow-sm"
            >
              <svg v-if="actionLoading.summarize" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              {{ actionLoading.summarize ? 'Summarizing…' : 'Generate Summary' }}
            </button>
          </div>
        </div>

        <!-- ── Tab Panel: Transcript ── -->
        <div v-if="activeTab === 'transcript'">
          <!-- Sub-tab bar -->
          <div class="flex items-center gap-1 px-4 py-2 bg-slate-50 border-b border-slate-200">
            <button
              v-if="transcriptData.length > 0"
              @click="activeTranscriptTab = 'editor'"
              :class="activeTranscriptTab === 'editor' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'"
              class="text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >Interactive Editor</button>
            <button
              v-if="detail.transcript"
              @click="activeTranscriptTab = 'raw'"
              :class="activeTranscriptTab === 'raw' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'"
              class="text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >Raw Text</button>
            <!-- Toolbar downloads -->
            <div class="ml-auto flex gap-2 items-center">
              <button
                v-if="transcriptData.length > 0"
                @click="downloadEditedJSON"
                class="inline-flex items-center gap-1.5 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 rounded-lg font-semibold transition"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                Export JSON
              </button>
              <a v-if="detail.transcript" :href="downloadUrl('transcript_txt')" download class="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                TXT
              </a>
            </div>
          </div>

          <!-- Interactive Editor -->
          <div v-if="activeTranscriptTab === 'editor' && transcriptData.length > 0" class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 pb-6 border-b border-slate-200 mb-6">
              <div class="md:col-span-2">
                <span class="font-semibold text-sm text-slate-700 mb-3 block">Pengaturan Pembicara:</span>
                <div class="flex flex-wrap gap-3">
                  <div v-for="(setting, id) in speakerSettings" :key="id" class="flex items-center bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm gap-2 hover:border-slate-300 transition">
                    <input type="checkbox" v-model="setting.visible" class="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer" title="Sembunyikan/Tampilkan">
                    <input type="text" v-model="setting.name" class="border border-slate-300 rounded px-2 py-1 w-24 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" title="Ganti Nama">
                    <input type="color" v-model="setting.color" class="border-0 w-8 h-8 rounded cursor-pointer bg-transparent" title="Ganti Warna">
                    <button @click="deleteSpeaker(Number(id))" class="ml-1 p-1 text-red-500 hover:bg-red-50 rounded transition" title="Hapus Speaker Ini">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <span class="font-semibold text-sm text-slate-700 mb-3 block">Filter Bahasa:</span>
                <div class="flex flex-wrap gap-2">
                  <label v-for="lang in availableLanguages" :key="lang" class="flex items-center bg-slate-100 px-4 py-1.5 rounded-full cursor-pointer hover:bg-slate-200 transition text-xs font-bold text-slate-600 gap-2 border border-slate-200">
                    <input type="checkbox" :checked="activeLanguages.includes(lang)" @change="toggleLanguage(lang)" class="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer">
                    <span>{{ lang.toUpperCase() }}</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="mb-8">
              <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Visualisasi Timeline</h3>
              <div class="flex flex-col gap-3">
                <div v-if="filteredTranscript.length === 0" class="text-sm text-slate-400 italic">Data kosong atau semua filter disembunyikan.</div>
                <template v-for="(setting, id) in speakerSettings" :key="id">
                  <div v-show="setting.visible" class="flex items-center">
                    <div class="w-28 text-xs font-semibold text-slate-700 truncate pr-2" :title="setting.name">{{ setting.name }}</div>
                    <div class="flex-grow h-6 bg-slate-100 border border-slate-200 relative rounded-md overflow-hidden">
                      <div v-for="seg in getSegmentsForSpeaker(id)" :key="seg._id"
                           class="segment"
                           :style="{ left: (seg.start / maxTime) * 100 + '%', width: ((seg.end - seg.start) / maxTime) * 100 + '%', background: setting.color }"
                           :title="seg.text">
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <div>
              <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Transkrip Percakapan</h3>
              <div role="status" aria-live="polite">
                <p v-if="transcriptSaveError" class="text-xs text-red-600 font-semibold mb-2">{{ transcriptSaveError }}</p>
                <p v-else-if="transcriptSaveLoading" class="text-xs text-slate-500 font-semibold mb-2">Saving transcript changes…</p>
                <p v-else-if="!transcriptDirty && transcriptData.length" class="text-xs text-emerald-600 font-semibold mb-2">Transcript changes saved.</p>
              </div>
              <div class="flex flex-col space-y-4 max-h-[600px] overflow-y-auto pr-2 pb-4">
                <div v-if="filteredTranscript.length === 0" class="text-sm text-slate-400 italic text-center py-4">Data kosong.</div>
                <div v-for="item in filteredTranscript" :key="item._id"
                     class="chat-bubble relative p-4 rounded-xl max-w-[85%] md:max-w-[80%] border-l-[6px] shadow-sm transition-all duration-200"
                     :class="{'ml-auto': item.speaker % 2 !== 0}"
                     :style="{ backgroundColor: hexToRgba(speakerSettings[item.speaker]?.color || '#000', 0.08), borderLeftColor: speakerSettings[item.speaker]?.color || '#000' }">
                  <div class="flex flex-wrap items-center gap-2 mb-2 text-xs font-bold" :style="{ color: speakerSettings[item.speaker]?.color }">
                    <span>{{ speakerSettings[item.speaker]?.name }}</span>
                    <span class="text-slate-400 font-normal">•</span>
                    <span>{{ item.start }}s - {{ item.end }}s</span>
                    <span class="bg-black/5 text-slate-600 px-2 py-0.5 rounded ml-1">{{ getLang(item).toUpperCase() }}</span>
                    <button @click="deleteSegment(item._id)" class="btn-delete-segment ml-auto flex items-center gap-1 bg-red-100 text-red-600 hover:bg-red-200 px-2 py-1 rounded text-[10px]">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      Hapus
                    </button>
                  </div>
                  <div class="p-1.5 border border-transparent border-dashed rounded transition-colors text-sm text-slate-800 leading-relaxed hover:border-slate-300 hover:bg-white/40 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 cursor-text"
                       contenteditable="true"
                       @blur="handleTextEdit(item._id, $event.target.innerText)">
                    {{ item.text }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Raw Transcript -->
          <div v-if="activeTranscriptTab === 'raw' && detail.transcript" class="p-6">
            <div class="bg-slate-50 rounded-xl p-4 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto font-mono">
              {{ detail.transcript }}
            </div>
          </div>

          <!-- Empty state if no data for chosen sub-tab -->
          <div v-if="activeTranscriptTab === 'editor' && transcriptData.length === 0 && detail.transcript" class="p-6 text-center">
            <p class="text-sm text-slate-400 mb-2">No interactive transcript data available.</p>
            <button @click="activeTranscriptTab = 'raw'" class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline">View Raw Text instead</button>
          </div>
        </div>

        <!-- ── Tab Panel: AI Tools ── -->
        <div v-if="activeTab === 'ai'" class="divide-y divide-slate-100">
          <!-- Chatbot -->
          <div class="flex flex-col" style="max-height: 520px;">
            <div class="px-5 py-3 flex items-center gap-3 bg-teal-50/50 border-b border-slate-100">
              <div class="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                </svg>
              </div>
              <h2 class="text-sm font-bold text-slate-800">Ask the Transcript</h2>
            </div>
            <div ref="chatScrollRef" class="flex-1 overflow-y-auto p-5 space-y-3 min-h-[120px]">
              <div v-if="!chatMessages.length" class="text-center py-8">
                <svg class="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                <p class="text-xs text-slate-400">Ask anything about this recording.</p>
                <p class="text-xs text-slate-400 mt-1">e.g. "What topics were discussed?" or "Summarize from 00:02:00 to 00:05:00."</p>
              </div>
              <div v-for="(msg, i) in chatMessages" :key="i" class="flex" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
                <div class="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm"
                     :class="msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'">
                  <p class="whitespace-pre-wrap break-words">{{ msg.content }}</p>
                </div>
              </div>
              <div v-if="chatLoading" class="flex justify-start">
                <div class="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay:0ms"></span>
                  <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay:150ms"></span>
                  <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay:300ms"></span>
                </div>
              </div>
            </div>
            <div v-if="chatError" class="mx-5 mb-2">
              <div class="bg-red-50 border border-red-200 rounded-xl p-2.5 flex items-start gap-2">
                <svg class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                <p class="text-xs text-red-700 font-semibold">{{ chatError }}</p>
              </div>
            </div>
            <div class="border-t border-slate-200 p-4 flex items-end gap-3">
              <textarea
                v-model="chatInput"
                @keydown="handleChatKeydown"
                placeholder="Ask a question about the transcript… (Enter to send)"
                rows="2"
                :disabled="chatLoading"
                class="flex-1 resize-none border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition disabled:opacity-50 leading-relaxed"
              ></textarea>
              <button
                @click="sendChat"
                :disabled="chatLoading || !chatInput.trim()"
                class="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition shadow-sm"
                aria-label="Send message"
              >
                <svg v-if="chatLoading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
              </button>
            </div>
          </div>

          <!-- Flashcards -->
          <div class="p-5 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                  </svg>
                </div>
                <h2 class="text-sm font-bold text-slate-800">Flashcards</h2>
                <span v-if="flashcards.length" class="text-xs bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded-full">{{ flashcards.length }}</span>
              </div>
              <!-- Generate controls inline -->
              <div class="flex items-center gap-2">
                <label class="text-xs font-semibold text-slate-500 whitespace-nowrap">Cards</label>
                <input
                  v-model.number="flashcardCount"
                  type="number"
                  min="1"
                  max="100"
                  class="w-16 border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"
                />
                <button
                  @click="runGenerateFlashcards"
                  :disabled="flashcardsLoading"
                  class="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-sm"
                >
                  <svg v-if="flashcardsLoading" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  {{ flashcardsLoading ? 'Generating…' : 'Generate' }}
                </button>
              </div>
            </div>
            <div v-if="flashcardsError" class="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <svg class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <p class="text-xs text-red-700 font-semibold">{{ flashcardsError }}</p>
            </div>
            <div v-if="flashcards.length" class="space-y-4">
              <!-- Flip card -->
              <div class="relative cursor-pointer select-none" style="perspective: 1000px;" @click="cardFlipped = !cardFlipped">
                <div class="relative w-full transition-transform duration-500" :style="{ transformStyle: 'preserve-3d', transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }">
                  <div class="w-full bg-yellow-50 border border-yellow-200 rounded-2xl p-6 min-h-[120px] flex flex-col justify-between" style="backface-visibility: hidden;">
                    <div>
                      <div class="flex items-center justify-between mb-3">
                        <span class="text-[10px] font-bold text-yellow-600 uppercase tracking-widest">Question</span>
                        <span v-if="currentCard?.timestamp" class="text-[10px] text-slate-400 font-mono">{{ currentCard.timestamp }}</span>
                      </div>
                      <p class="text-sm font-semibold text-slate-800 leading-relaxed">{{ currentCard?.front }}</p>
                    </div>
                    <p class="text-xs text-slate-400 mt-3 text-right">Click to reveal answer ↓</p>
                  </div>
                  <div class="absolute inset-0 bg-indigo-50 border border-indigo-200 rounded-2xl p-6 min-h-[120px] flex flex-col justify-between" style="backface-visibility: hidden; transform: rotateY(180deg);">
                    <div>
                      <div class="flex items-center justify-between mb-3">
                        <span class="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Answer</span>
                        <span v-if="currentCard?.type" class="text-[10px] bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full uppercase">{{ currentCard.type }}</span>
                      </div>
                      <p class="text-sm text-slate-700 leading-relaxed">{{ currentCard?.back }}</p>
                    </div>
                    <p class="text-xs text-slate-400 mt-3 text-right">Click to flip back ↑</p>
                  </div>
                </div>
              </div>
              <!-- Navigation -->
              <div class="flex items-center justify-between">
                <button @click="prevCard" :disabled="currentCardIndex === 0" class="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition px-3 py-1.5 rounded-lg hover:bg-indigo-50">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                  Prev
                </button>
                <span class="text-xs font-semibold text-slate-500">{{ currentCardIndex + 1 }} / {{ flashcards.length }}</span>
                <button @click="nextCard" :disabled="currentCardIndex === flashcards.length - 1" class="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition px-3 py-1.5 rounded-lg hover:bg-indigo-50">
                  Next
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </button>
              </div>
            </div>
            <div v-else-if="!flashcardsLoading" class="text-center py-3 text-xs text-slate-400">
              Generate flashcards from this transcript to start studying.
            </div>
          </div>
        </div>

        <!-- ── Tab Panel: Actions ── -->
        <div v-if="activeTab === 'actions'" class="p-6 space-y-6">

          <!-- Audio player -->
          <div>
            <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M12 9.5v5m-3.536-6.036a5 5 0 000 7.072"/></svg>
              Audio Source
            </h3>
            <audio controls class="w-full rounded-xl" :src="downloadUrl('audio')" />
          </div>

          <!-- Speaker timeline image -->
          <div v-if="manifest?.files?.timeline_png">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <svg class="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>
                Speaker Timeline
              </h3>
              <a :href="downloadUrl('image')" download class="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                PNG
              </a>
            </div>
            <img :src="downloadUrl('image')" class="w-full rounded-xl border border-slate-200" alt="Speaker timeline visualization" @error="$event.target.style.display = 'none'" />
          </div>

          <!-- Translate outputs -->
          <div class="space-y-4 pt-4 border-t border-slate-100">
            <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Translate Outputs</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Source Language</label>
                <div class="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700">
                  <svg class="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                  <span v-if="detectedSourceLang" class="font-semibold text-slate-800">{{ detectedSourceLang }}</span>
                  <span v-else class="text-slate-400 italic">Auto-detecting…</span>
                </div>
              </div>
              <div class="space-y-1.5">
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Target Language</label>
                <div class="relative">
                  <input
                    v-model="translateLangSearch"
                    @focus="translateLangDropdownOpen = true"
                    @blur="onTargetLangBlur"
                    type="text"
                    :placeholder="translateForm.targetLang ? '' : 'Search language…'"
                    autocomplete="off"
                    class="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                  <div v-if="translateLangDropdownOpen && filteredTargetLanguages.length" class="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                    <div
                      v-for="lang in filteredTargetLanguages"
                      :key="lang.code"
                      @mousedown.prevent="selectTargetLang(lang)"
                      :class="translateForm.targetLang === lang.code ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'"
                      class="px-3 py-2 text-sm cursor-pointer"
                    >{{ lang.label }}</div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="translateError" class="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <svg class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <p class="text-xs text-red-700 font-semibold">{{ translateError }}</p>
            </div>
            <div v-if="translateSuccess" class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
              <svg class="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
              <p class="text-xs text-emerald-700 font-semibold">{{ translateSuccess }}</p>
            </div>
            <button
              @click="runTranslateDetail"
              :disabled="translateLoading || !translateForm.targetLang || !detectedSourceLang"
              class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold px-4 py-2.5 rounded-xl transition shadow-sm"
            >
              <svg v-if="translateLoading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/></svg>
              {{ translateLoading ? 'Translating…' : 'Translate' }}
            </button>
          </div>

          <!-- Job Metadata -->
          <div v-if="manifest" class="pt-4 border-t border-slate-100 space-y-3">
            <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Job Metadata</h3>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <template v-if="manifest.status">
                <dt class="text-slate-500 font-semibold uppercase tracking-wide self-center">Transcribe</dt>
                <dd><span class="px-2.5 py-0.5 rounded-lg font-bold" :class="statusClass(manifest.status.transcribe)">{{ String(manifest.status.transcribe || '—').toUpperCase() }}</span></dd>
                <dt class="text-slate-500 font-semibold uppercase tracking-wide self-center">Summarize</dt>
                <dd><span class="px-2.5 py-0.5 rounded-lg font-bold" :class="statusClass(manifest.status.summarize)">{{ String(manifest.status.summarize || '—').toUpperCase() }}</span></dd>
                <dt class="text-slate-500 font-semibold uppercase tracking-wide self-center">Visualize</dt>
                <dd><span class="px-2.5 py-0.5 rounded-lg font-bold" :class="statusClass(manifest.status.visualize)">{{ String(manifest.status.visualize || '—').toUpperCase() }}</span></dd>
                <dt class="text-slate-500 font-semibold uppercase tracking-wide self-center">Translate</dt>
                <dd><span class="px-2.5 py-0.5 rounded-lg font-bold" :class="statusClass(manifest.status.translate)">{{ String(manifest.status.translate || '—').toUpperCase() }}</span></dd>
              </template>
              <template v-if="manifest.provider">
                <dt class="text-slate-500 font-semibold uppercase tracking-wide self-center">Provider</dt>
                <dd class="text-slate-700 font-mono">{{ manifest.provider }}</dd>
              </template>
              <template v-if="manifest.created_at">
                <dt class="text-slate-500 font-semibold uppercase tracking-wide self-center">Created</dt>
                <dd class="text-slate-700">{{ formatDate(manifest.created_at) }}</dd>
              </template>
              <template v-if="manifest.updated_at">
                <dt class="text-slate-500 font-semibold uppercase tracking-wide self-center">Updated</dt>
                <dd class="text-slate-700">{{ formatDate(manifest.updated_at) }}</dd>
              </template>
            </dl>
          </div>

        </div>

      </div>
    </template>
  </div>
</template>
<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import { getJob, getDownloadUrl, summarizeJob, visualizeJob, translateJob, saveTranscript, generateFlashcards, sendChatMessage } from '../services/api'
import { useAppStore } from '../stores/appStore'
import { useI18n } from '../i18n/index.js'

const route = useRoute()
const store = useAppStore()
const { t } = useI18n()

const TRANSLATE_LANGUAGES = [
  { code: 'Acehnese', label: 'Acehnese' },
  { code: 'Afrikaans', label: 'Afrikaans' },
  { code: 'Albanian', label: 'Albanian' },
  { code: 'Amharic', label: 'Amharic' },
  { code: 'Arabic', label: 'Arabic' },
  { code: 'Armenian', label: 'Armenian' },
  { code: 'Assamese', label: 'Assamese' },
  { code: 'Azerbaijani', label: 'Azerbaijani' },
  { code: 'Bambara', label: 'Bambara' },
  { code: 'Bashkir', label: 'Bashkir' },
  { code: 'Basque', label: 'Basque' },
  { code: 'Belarusian', label: 'Belarusian' },
  { code: 'Bengali', label: 'Bengali' },
  { code: 'Bosnian', label: 'Bosnian' },
  { code: 'Bulgarian', label: 'Bulgarian' },
  { code: 'Burmese', label: 'Burmese' },
  { code: 'Catalan', label: 'Catalan' },
  { code: 'Cebuano', label: 'Cebuano' },
  { code: 'Chinese', label: 'Chinese (Simplified)' },
  { code: 'Croatian', label: 'Croatian' },
  { code: 'Czech', label: 'Czech' },
  { code: 'Danish', label: 'Danish' },
  { code: 'Dutch', label: 'Dutch' },
  { code: 'English', label: 'English' },
  { code: 'Estonian', label: 'Estonian' },
  { code: 'Finnish', label: 'Finnish' },
  { code: 'French', label: 'French' },
  { code: 'Galician', label: 'Galician' },
  { code: 'Georgian', label: 'Georgian' },
  { code: 'German', label: 'German' },
  { code: 'Greek', label: 'Greek' },
  { code: 'Gujarati', label: 'Gujarati' },
  { code: 'Hausa', label: 'Hausa' },
  { code: 'Hebrew', label: 'Hebrew' },
  { code: 'Hindi', label: 'Hindi' },
  { code: 'Hungarian', label: 'Hungarian' },
  { code: 'Icelandic', label: 'Icelandic' },
  { code: 'Igbo', label: 'Igbo' },
  { code: 'Indonesian', label: 'Indonesian' },
  { code: 'Irish', label: 'Irish' },
  { code: 'Italian', label: 'Italian' },
  { code: 'Japanese', label: 'Japanese' },
  { code: 'Javanese', label: 'Javanese' },
  { code: 'Kannada', label: 'Kannada' },
  { code: 'Kazakh', label: 'Kazakh' },
  { code: 'Khmer', label: 'Khmer' },
  { code: 'Korean', label: 'Korean' },
  { code: 'Kurdish', label: 'Kurdish' },
  { code: 'Kyrgyz', label: 'Kyrgyz' },
  { code: 'Lao', label: 'Lao' },
  { code: 'Latvian', label: 'Latvian' },
  { code: 'Lingala', label: 'Lingala' },
  { code: 'Lithuanian', label: 'Lithuanian' },
  { code: 'Luxembourgish', label: 'Luxembourgish' },
  { code: 'Macedonian', label: 'Macedonian' },
  { code: 'Malagasy', label: 'Malagasy' },
  { code: 'Malay', label: 'Malay' },
  { code: 'Malayalam', label: 'Malayalam' },
  { code: 'Maltese', label: 'Maltese' },
  { code: 'Maori', label: 'Maori' },
  { code: 'Marathi', label: 'Marathi' },
  { code: 'Mongolian', label: 'Mongolian' },
  { code: 'Nepali', label: 'Nepali' },
  { code: 'Norwegian', label: 'Norwegian' },
  { code: 'Oriya', label: 'Oriya' },
  { code: 'Pashto', label: 'Pashto' },
  { code: 'Persian', label: 'Persian' },
  { code: 'Polish', label: 'Polish' },
  { code: 'Portuguese', label: 'Portuguese' },
  { code: 'Punjabi', label: 'Punjabi' },
  { code: 'Romanian', label: 'Romanian' },
  { code: 'Russian', label: 'Russian' },
  { code: 'Serbian', label: 'Serbian' },
  { code: 'Sindhi', label: 'Sindhi' },
  { code: 'Sinhala', label: 'Sinhala' },
  { code: 'Slovak', label: 'Slovak' },
  { code: 'Slovenian', label: 'Slovenian' },
  { code: 'Somali', label: 'Somali' },
  { code: 'Spanish', label: 'Spanish' },
  { code: 'Sundanese', label: 'Sundanese' },
  { code: 'Swahili', label: 'Swahili' },
  { code: 'Swedish', label: 'Swedish' },
  { code: 'Tagalog', label: 'Tagalog' },
  { code: 'Tajik', label: 'Tajik' },
  { code: 'Tamil', label: 'Tamil' },
  { code: 'Telugu', label: 'Telugu' },
  { code: 'Thai', label: 'Thai' },
  { code: 'Tibetan', label: 'Tibetan' },
  { code: 'Turkish', label: 'Turkish' },
  { code: 'Turkmen', label: 'Turkmen' },
  { code: 'Ukrainian', label: 'Ukrainian' },
  { code: 'Urdu', label: 'Urdu' },
  { code: 'Uzbek', label: 'Uzbek' },
  { code: 'Vietnamese', label: 'Vietnamese' },
  { code: 'Welsh', label: 'Welsh' },
  { code: 'Yoruba', label: 'Yoruba' },
  { code: 'Zulu', label: 'Zulu' }
]

// Map Whisper/ISO 639-1 language codes to full English names for source-language auto-detection
const WHISPER_LANG_TO_NAME = {
  af: 'Afrikaans', sq: 'Albanian', am: 'Amharic', ar: 'Arabic',
  hy: 'Armenian', az: 'Azerbaijani', ba: 'Bashkir', eu: 'Basque',
  be: 'Belarusian', bn: 'Bengali', bs: 'Bosnian', bg: 'Bulgarian',
  my: 'Burmese', ca: 'Catalan', zh: 'Chinese', hr: 'Croatian',
  cs: 'Czech', da: 'Danish', nl: 'Dutch', en: 'English',
  et: 'Estonian', fo: 'Faroese', fi: 'Finnish', fr: 'French',
  gl: 'Galician', ka: 'Georgian', de: 'German', el: 'Greek',
  gu: 'Gujarati', ha: 'Hausa', he: 'Hebrew', hi: 'Hindi',
  hu: 'Hungarian', is: 'Icelandic', id: 'Indonesian', it: 'Italian',
  ja: 'Japanese', jv: 'Javanese', kn: 'Kannada', kk: 'Kazakh',
  km: 'Khmer', ko: 'Korean', ky: 'Kyrgyz', lo: 'Lao',
  lv: 'Latvian', ln: 'Lingala', lt: 'Lithuanian', mk: 'Macedonian',
  mg: 'Malagasy', ms: 'Malay', ml: 'Malayalam', mt: 'Maltese',
  mi: 'Maori', mr: 'Marathi', mn: 'Mongolian', ne: 'Nepali',
  no: 'Norwegian', or: 'Oriya', ps: 'Pashto', fa: 'Persian',
  pl: 'Polish', pt: 'Portuguese', pa: 'Punjabi', ro: 'Romanian',
  ru: 'Russian', sr: 'Serbian', sd: 'Sindhi', si: 'Sinhala',
  sk: 'Slovak', sl: 'Slovenian', so: 'Somali', es: 'Spanish',
  su: 'Sundanese', sw: 'Swahili', sv: 'Swedish', tl: 'Tagalog',
  tg: 'Tajik', ta: 'Tamil', te: 'Telugu', th: 'Thai',
  bo: 'Tibetan', tr: 'Turkish', tk: 'Turkmen', uk: 'Ukrainian',
  ur: 'Urdu', uz: 'Uzbek', vi: 'Vietnamese', cy: 'Welsh',
  yo: 'Yoruba', zu: 'Zulu'
}

// --- Tab Navigation State ---
const activeTab = ref('summary')           // 'summary' | 'transcript' | 'ai' | 'actions'
const activeTranscriptTab = ref('editor')  // 'editor' | 'raw'

// --- Core API Data ---
const loading = ref(false)
const error = ref('')
const manifest = ref(null)
const detail = ref({
  transcript: '',
  summary: ''
})
const folderName = computed(() => String(route.params.folderName || ''))
const fileName = computed(() => manifest.value?.file_name || '')
const hasTranscriptContent = computed(() => transcriptData.value.length > 0 || Boolean(detail.value.transcript))

// --- Action state ---
const actionLoading = reactive({ summarize: false, visualize: false })
const actionError = ref('')
const actionSuccess = ref('')
const transcriptSaveLoading = ref(false)
const transcriptSaveError = ref('')
const transcriptDirty = ref(false)
const transcriptEditVersion = ref(0)
let transcriptSaveTimer = null

// --- Translate state ---
const translateLoading = ref(false)
const translateError = ref('')
const translateSuccess = ref('')
const translateForm = reactive({
  targetLang: ''
})
const translateLangSearch = ref('')
const translateLangDropdownOpen = ref(false)

// Compute dominant source language from transcript segments by total text length.
// Segments without text are excluded (length 0) to avoid skewing the result.
const detectedSourceLang = computed(() => {
  if (!transcriptData.value.length) return ''
  const counts = {}
  for (const item of transcriptData.value) {
    const len = item.text?.length || 0
    if (!len) continue
    const code = getLang(item)
    const name = WHISPER_LANG_TO_NAME[code] || code
    counts[name] = (counts[name] || 0) + len
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] || ''
})

const filteredTargetLanguages = computed(() => {
  const q = translateLangSearch.value.toLowerCase().trim()
  if (!q) return TRANSLATE_LANGUAGES
  return TRANSLATE_LANGUAGES.filter(l => l.label.toLowerCase().includes(q))
})

const selectTargetLang = (lang) => {
  translateForm.targetLang = lang.code
  translateLangSearch.value = lang.label
  translateLangDropdownOpen.value = false
}

const onTargetLangBlur = () => {
  // Delay closing so a mousedown on an option is registered before the list disappears
  setTimeout(() => { translateLangDropdownOpen.value = false }, 200)
}

// --- Flashcard state ---
const flashcardsLoading = ref(false)
const flashcardsError = ref('')
const flashcards = ref([])         // [{ front, back, type, timestamp }]
const currentCardIndex = ref(0)
const cardFlipped = ref(false)
const flashcardCount = ref(10)

const currentCard = computed(() => flashcards.value[currentCardIndex.value] || null)

const runGenerateFlashcards = async () => {
  if (!fileName.value) {
    flashcardsError.value = 'Job file name is not available. Please reload the page.'
    return
  }
  flashcardsLoading.value = true
  flashcardsError.value = ''
  flashcards.value = []
  currentCardIndex.value = 0
  cardFlipped.value = false
  try {
    const result = await generateFlashcards(folderName.value, fileName.value, flashcardCount.value)
    flashcards.value = result.flashcards || []
    if (!flashcards.value.length) flashcardsError.value = 'No flashcards were returned.'
  } catch (err) {
    flashcardsError.value = err.message
  } finally {
    flashcardsLoading.value = false
  }
}

const nextCard = () => {
  if (currentCardIndex.value < flashcards.value.length - 1) {
    currentCardIndex.value++
    cardFlipped.value = false
  }
}

const prevCard = () => {
  if (currentCardIndex.value > 0) {
    currentCardIndex.value--
    cardFlipped.value = false
  }
}

// --- Chatbot state ---
const chatMessages = ref([])   // [{ role: 'user'|'assistant', content: string }]
const chatInput = ref('')
const chatLoading = ref(false)
const chatError = ref('')
const chatScrollRef = ref(null)

const sendChat = async () => {
  const question = chatInput.value.trim()
  if (!question || chatLoading.value) return
  if (!fileName.value) {
    chatError.value = 'Job file name is not available. Please reload the page.'
    return
  }
  chatMessages.value.push({ role: 'user', content: question })
  chatInput.value = ''
  chatLoading.value = true
  chatError.value = ''
  await nextTick()
  if (chatScrollRef.value) chatScrollRef.value.scrollTop = chatScrollRef.value.scrollHeight

  try {
    const history = chatMessages.value.slice(0, -1).map(m => ({ role: m.role, content: m.content }))
    const result = await sendChatMessage(folderName.value, fileName.value, question, history)
    chatMessages.value.push({ role: 'assistant', content: result.answer })
  } catch (err) {
    chatError.value = err.message
    chatMessages.value.pop()
  } finally {
    chatLoading.value = false
    await nextTick()
    if (chatScrollRef.value) chatScrollRef.value.scrollTop = chatScrollRef.value.scrollHeight
  }
}

const handleChatKeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendChat()
  }
}

// --- Language switcher (view translated content) ---
const selectedLangPair = ref(null)
const viewLoading = ref(false)
const viewError = ref('')

// Backup of original (untranslated) content, populated after loadDetail
const originalDetail = ref({ transcript: '', summary: '' })
const originalTranscriptData = ref([])

// Derive a user-friendly label from a lang_pair token (e.g. "indonesian_to_english" → "Indonesian → English")
const langPairLabel = (langPair) => {
  const parts = langPair.split('_to_')
  if (parts.length !== 2) return langPair
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  return `${cap(parts[0])} → ${cap(parts[1])}`
}

// Available translations derived from the manifest
const availableTranslations = computed(() => {
  const translations = manifest.value?.translations
  if (!translations || typeof translations !== 'object') return []
  return Object.keys(translations)
})

// --- Status helpers ---
const statusClass = (status) => {
  const map = {
    done: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-emerald-100 text-emerald-700',
    error: 'bg-red-100 text-red-700',
    failed: 'bg-red-100 text-red-700',
    running: 'bg-indigo-100 text-indigo-700',
    processing: 'bg-indigo-100 text-indigo-700',
    pending: 'bg-amber-100 text-amber-700'
  }
  return map[String(status || '').toLowerCase()] || 'bg-slate-100 text-slate-600'
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

const canSummarize = computed(() =>
  manifest.value && String(manifest.value.status?.summarize || '').toLowerCase() !== 'done'
)
const canVisualize = computed(() =>
  manifest.value && String(manifest.value.status?.visualize || '').toLowerCase() !== 'done'
)

// --- Diarization Interactive Data ---
const transcriptData = ref([])
const speakerSettings = ref({})
const activeLanguages = ref([])
const defaultColors = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#eab308', '#ef4444']

const markdownRenderer = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})
const defaultValidateLink = markdownRenderer.validateLink.bind(markdownRenderer)
markdownRenderer.validateLink = (url) => {
  const normalized = String(url || '').trim().toLowerCase()
  if (normalized.startsWith('#') || normalized.startsWith('/')) return true
  if (normalized.startsWith('//')) return false
  if (!/^(https?:|mailto:)/.test(normalized)) return false
  return defaultValidateLink(url)
}
const renderedSummary = computed(() =>
  DOMPurify.sanitize(markdownRenderer.render(detail.value.summary || ''))
)

// Extract available languages directly from the data
const availableLanguages = computed(() => {
  if (!transcriptData.value.length) return []
  return [...new Set(transcriptData.value.map(d => getLang(d)))].sort()
})

// Filter data for the interface based on selected checks
const filteredTranscript = computed(() => {
  return transcriptData.value.filter(d => 
    speakerSettings.value[d.speaker]?.visible && 
    activeLanguages.value.includes(getLang(d))
  )
})

// Calculate Timeline width
const maxTime = computed(() => {
  if (!transcriptData.value.length) return 0
  return Math.max(...transcriptData.value.map(d => d.end))
})

// Helper functions
const getLang = (item) => (item.meta && item.meta.language) ? item.meta.language : 'id'
const hexToRgba = (hex, alpha) => {
  if(!hex) return `rgba(0,0,0,${alpha})`
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const getSegmentsForSpeaker = (id) => {
  return transcriptData.value.filter(d => 
    String(d.speaker) === String(id) && activeLanguages.value.includes(getLang(d))
  )
}

const toggleLanguage = (lang) => {
  if (activeLanguages.value.includes(lang)) {
    activeLanguages.value = activeLanguages.value.filter(l => l !== lang)
  } else {
    activeLanguages.value.push(lang)
  }
}

// Editor Actions
const handleTextEdit = (id, newText) => {
  const item = transcriptData.value.find(d => d._id === id)
  if (item && item.text !== newText) {
    item.text = newText
    markTranscriptDirty()
  }
}

const deleteSegment = (idToDel) => {
  if (confirm(`Hapus percakapan ini?`)) {
    transcriptData.value = transcriptData.value.filter(d => d._id !== idToDel)
    
    const remainingSpeakers = new Set(transcriptData.value.map(d => String(d.speaker)))
    Object.keys(speakerSettings.value).forEach(sID => {
      if (!remainingSpeakers.has(String(sID))) {
        delete speakerSettings.value[sID]
      }
    })
    markTranscriptDirty()
  }
}

const deleteSpeaker = (id) => {
  const speakerName = speakerSettings.value[id]?.name || 'Speaker'
  if (confirm(`Peringatan: Anda akan menghapus permanen ${speakerName} dan SEMUA teksnya dari data. Lanjutkan?`)) {
    transcriptData.value = transcriptData.value.filter(d => String(d.speaker) !== String(id))
    delete speakerSettings.value[id]
    markTranscriptDirty()
  }
}

const downloadEditedJSON = () => {
  const dataToExport = transcriptData.value.map(({ _id, ...rest }) => rest)
  const dataStr = JSON.stringify(dataToExport, null, 4)
  const blob = new Blob([dataStr], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url; a.download = "transkrip_teredit.json"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Bootstrapping the data
const initDashboard = () => {
  const speakerIDs = [...new Set(transcriptData.value.map(d => d.speaker))].sort((a,b) => a-b)
  const settings = {}
  
  speakerIDs.forEach((id, index) => {
    settings[id] = {
      visible: true,
      color: defaultColors[index % defaultColors.length],
      name: `Speaker ${id}`
    }
  })
  speakerSettings.value = settings
  activeLanguages.value = availableLanguages.value
}

const resetDashboard = () => {
  speakerSettings.value = {}
  activeLanguages.value = []
}

const persistTranscriptChanges = async () => {
  if (!fileName.value) return
  const editVersionSnapshot = transcriptEditVersion.value
  transcriptSaveLoading.value = true
  transcriptSaveError.value = ''
  try {
    const payload = transcriptData.value.map(({ _id, ...rest }) => ({ ...rest }))
    await saveTranscript(folderName.value, fileName.value, payload)
    if (editVersionSnapshot === transcriptEditVersion.value) {
      transcriptDirty.value = false
    }
    saveCachedDetail()
    if (!selectedLangPair.value) {
      originalTranscriptData.value = transcriptData.value.map(item => ({ ...item }))
    }
  } catch (err) {
    transcriptSaveError.value = err.message || 'Failed to save transcript changes.'
  } finally {
    transcriptSaveLoading.value = false
  }
}

const scheduleTranscriptSave = () => {
  transcriptSaveError.value = ''
  if (transcriptSaveTimer) clearTimeout(transcriptSaveTimer)
  transcriptSaveTimer = setTimeout(() => {
    transcriptSaveTimer = null
    persistTranscriptChanges()
  }, 700)
}

const markTranscriptDirty = () => {
  transcriptEditVersion.value += 1
  transcriptDirty.value = true
  scheduleTranscriptSave()
}

const flushTranscriptSave = async () => {
  if (!transcriptDirty.value) return
  if (transcriptSaveTimer) {
    clearTimeout(transcriptSaveTimer)
    transcriptSaveTimer = null
  }
  await persistTranscriptChanges()
}

const restoreOriginalTranscript = () => {
  transcriptData.value = originalTranscriptData.value.map(item => ({ ...item }))
  if (transcriptData.value.length) initDashboard()
  else resetDashboard()
}

const resetDetailState = () => {
  detail.value = {
    transcript: '',
    summary: ''
  }
  transcriptData.value = []
  resetDashboard()
  selectedLangPair.value = null
  viewError.value = ''
  originalDetail.value = { transcript: '', summary: '' }
  originalTranscriptData.value = []
  // Reset flashcard state
  flashcards.value = []
  currentCardIndex.value = 0
  cardFlipped.value = false
  flashcardsError.value = ''
  // Reset chatbot state
  chatMessages.value = []
  chatInput.value = ''
  chatError.value = ''
  // Reset tab state
  activeTab.value = 'summary'
  activeTranscriptTab.value = 'editor'
  transcriptSaveError.value = ''
  transcriptDirty.value = false
  transcriptEditVersion.value = 0
  if (transcriptSaveTimer) {
    clearTimeout(transcriptSaveTimer)
    transcriptSaveTimer = null
  }
}

const hasDetailContent = (payload) => {
  if (!payload || typeof payload !== 'object') return false
  return Boolean(payload.summary || payload.transcript || (Array.isArray(payload.transcriptData) && payload.transcriptData.length))
}

const getCachedDetail = (folder) => {
  if (!folder) return null
  const cache = store.state.historyDetailCache
  if (!cache || typeof cache !== 'object') return null
  const cached = cache[folder]
  return hasDetailContent(cached) ? cached : null
}

const applyCachedDetail = (cached) => {
  if (!hasDetailContent(cached)) return false
  detail.value = {
    summary: cached.summary || '',
    transcript: cached.transcript || ''
  }
  const rawData = Array.isArray(cached.transcriptData) ? cached.transcriptData : []
  transcriptData.value = rawData.map((item, index) => ({ ...item, _id: index }))
  if (transcriptData.value.length) {
    initDashboard()
  } else {
    resetDashboard()
  }
  return true
}

const saveCachedDetail = () => {
  if (!folderName.value) return
  const payload = {
    summary: detail.value.summary || '',
    transcript: detail.value.transcript || '',
    transcriptData: transcriptData.value.map(({ _id, ...rest }) => ({ ...rest })),
    updatedAt: new Date().toISOString()
  }
  if (!hasDetailContent(payload)) return
  store.state.historyDetailCache = {
    ...(store.state.historyDetailCache || {}),
    [folderName.value]: payload
  }
}

// Fetch Logic
const loadDetail = async () => {
  if (!folderName.value) return
  loading.value = true
  error.value = ''
  resetDetailState()
  const cached = getCachedDetail(folderName.value)
  if (cached) applyCachedDetail(cached)
  
  try {
    const jobDetail = await getJob(folderName.value)
    manifest.value = jobDetail
    const files = jobDetail?.files || {}
    
    // 1. Fetch Summary
    if (files.summary_txt) {
      try {
        const summaryUrl = getDownloadUrl(folderName.value, 'summary_txt')
        const response = await fetch(summaryUrl)
        if (response.ok) detail.value.summary = await response.text()
      } catch (e) { console.error('Error fetching summary:', e) }
    } else if (!cached?.summary) {
      detail.value.summary = ''
    }

    // 2. Fetch INTERACTIVE JSON Transcript
    if (files.transcript_json) {
      try {
        const jsonUrl = getDownloadUrl(folderName.value, 'transcript_json')
        const response = await fetch(jsonUrl)
        if (response.ok) {
          const rawData = await response.json()
          transcriptData.value = rawData.map((item, index) => ({ ...item, _id: index }))
        }
      } catch (e) { console.error('Error fetching JSON transcript:', e) }
    } else if (!Array.isArray(cached?.transcriptData) || !cached.transcriptData.length) {
      transcriptData.value = []
    }
    if (transcriptData.value.length) {
      initDashboard()
    } else {
      resetDashboard()
    }
    
    // 3. ALWAYS Fetch RAW TXT Transcript
    if (files.transcript_txt) {
      try {
        const transcriptUrl = getDownloadUrl(folderName.value, 'transcript_txt')
        const response = await fetch(transcriptUrl)
        if (response.ok) detail.value.transcript = await response.text()
      } catch (e) { console.error('Error fetching TXT transcript:', e) }
    } else if (!cached?.transcript) {
      detail.value.transcript = ''
    }
    saveCachedDetail()
    // Save original content for the language switcher (shallow copy with _id intact)
    originalDetail.value = { summary: detail.value.summary, transcript: detail.value.transcript }
    originalTranscriptData.value = transcriptData.value.map(item => ({ ...item }))

  } catch (err) {
    if (!applyCachedDetail(cached)) {
      error.value = err.message || 'Failed to load job detail.'
    } else {
      error.value = 'Unable to connect: displaying saved job detail from this device.'
    }
  } finally {
    loading.value = false
  }
}

const runSummarizeDetail = async () => {
  if (!fileName.value) {
    actionError.value = 'Job file name is not available. Please reload the page.'
    return
  }
  actionLoading.summarize = true
  actionError.value = ''
  actionSuccess.value = ''
  try {
    await flushTranscriptSave()
    if (transcriptSaveError.value) throw new Error(transcriptSaveError.value)
    await summarizeJob(folderName.value, fileName.value)
    actionSuccess.value = 'Summarization complete. Reloading…'
    await loadDetail()
  } catch (err) {
    actionError.value = err.message
  } finally {
    actionLoading.summarize = false
  }
}

const runVisualizeDetail = async () => {
  if (!fileName.value) {
    actionError.value = 'Job file name is not available. Please reload the page.'
    return
  }
  actionLoading.visualize = true
  actionError.value = ''
  actionSuccess.value = ''
  try {
    await visualizeJob(folderName.value, fileName.value)
    actionSuccess.value = 'Visualization complete. Reloading…'
    await loadDetail()
  } catch (err) {
    actionError.value = err.message
  } finally {
    actionLoading.visualize = false
  }
}

const runTranslateDetail = async () => {
  if (!fileName.value || !detectedSourceLang.value || !translateForm.targetLang) {
    translateError.value = 'Please select a target language before translating.'
    return
  }
  translateLoading.value = true
  translateError.value = ''
  translateSuccess.value = ''
  try {
    const result = await translateJob(
      folderName.value,
      fileName.value,
      detectedSourceLang.value,
      translateForm.targetLang
    )
    const fileCount = Object.keys(result.files || {}).length
    translateSuccess.value = `Translation to ${result.target_language} complete — ${fileCount} file(s) generated.`
    await loadDetail()
  } catch (err) {
    translateError.value = err.message
  } finally {
    translateLoading.value = false
  }
}

// Audio is never translated, so always serve the original audio file regardless of the selected lang pair.
const downloadUrl = (fileType) => getDownloadUrl(folderName.value, fileType, fileType === 'audio' ? null : selectedLangPair.value)

const switchToTranslation = async (langPair) => {
  selectedLangPair.value = langPair
  viewError.value = ''

  if (!langPair) {
    // Restore original content
    detail.value = { summary: originalDetail.value.summary, transcript: originalDetail.value.transcript }
    restoreOriginalTranscript()
    return
  }

  viewLoading.value = true
  const translations = manifest.value?.translations?.[langPair] || {}
  try {
    // Fetch translated summary
    if (translations.summary_txt) {
      const url = getDownloadUrl(folderName.value, 'summary_txt', langPair)
      const r = await fetch(url)
      if (r.ok) detail.value.summary = await r.text()
      else detail.value.summary = originalDetail.value.summary
    } else {
      detail.value.summary = originalDetail.value.summary
    }

    // Fetch translated JSON transcript
    if (translations.transcript_json) {
      const url = getDownloadUrl(folderName.value, 'transcript_json', langPair)
      const r = await fetch(url)
      if (r.ok) {
        const raw = await r.json()
        transcriptData.value = raw.map((item, i) => ({ ...item, _id: i }))
        initDashboard()
      } else {
        restoreOriginalTranscript()
      }
    } else {
      restoreOriginalTranscript()
    }

    // Fetch translated raw TXT transcript
    if (translations.transcript_txt) {
      const url = getDownloadUrl(folderName.value, 'transcript_txt', langPair)
      const r = await fetch(url)
      if (r.ok) detail.value.transcript = await r.text()
      else detail.value.transcript = originalDetail.value.transcript
    } else {
      detail.value.transcript = originalDetail.value.transcript
    }
  } catch (e) {
    viewError.value = `Failed to load translated content: ${e.message}`
  } finally {
    viewLoading.value = false
  }
}

watch(() => route.params.folderName, loadDetail, { immediate: true })

// After load, auto-navigate to Transcript tab when no summary is available
watch(loading, (isLoading) => {
  if (!isLoading && !error.value) {
    if (!detail.value.summary && hasTranscriptContent.value) {
      activeTab.value = 'transcript'
    }
    // Default transcript sub-tab based on available data (only when on the transcript tab)
    if (activeTab.value === 'transcript') {
      if (!transcriptData.value.length && detail.value.transcript) {
        activeTranscriptTab.value = 'raw'
      } else {
        activeTranscriptTab.value = 'editor'
      }
    }
  }
})
</script>

<style scoped>
.segment {
  position: absolute; 
  height: 100%; 
  border-radius: 4px;
  border: 1px solid rgba(0,0,0,0.1); 
  transition: transform 0.2s;
}
.segment:hover { 
  transform: scaleY(1.15); 
  z-index: 10; 
  cursor: help; 
}
[contenteditable]:empty:before { 
  content: "Ketik teks di sini..."; 
  color: #94a3b8; 
}
.chat-bubble .btn-delete-segment { 
  opacity: 0; 
  pointer-events: none; 
  transition: 0.2s; 
}
.chat-bubble:hover .btn-delete-segment { 
  opacity: 1; 
  pointer-events: auto; 
}
.markdown-summary :deep(h1),
.markdown-summary :deep(h2),
.markdown-summary :deep(h3),
.markdown-summary :deep(h4),
.markdown-summary :deep(h5),
.markdown-summary :deep(h6) {
  font-weight: 700;
  color: #0f172a;
  margin: 0.9rem 0 0.5rem;
}
.markdown-summary :deep(p) { margin: 0.5rem 0; }
.markdown-summary :deep(ul),
.markdown-summary :deep(ol) { margin: 0.6rem 0 0.6rem 1.2rem; }
.markdown-summary :deep(li) { margin: 0.25rem 0; }
.markdown-summary :deep(code) {
  background: #e2e8f0;
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
  font-size: 0.85em;
}
.markdown-summary :deep(pre) {
  background: #0f172a;
  color: #e2e8f0;
  padding: 0.75rem;
  border-radius: 0.5rem;
  overflow-x: auto;
}
.markdown-summary :deep(pre code) {
  background: transparent;
  padding: 0;
}
.markdown-summary :deep(blockquote) {
  border-left: 4px solid #cbd5e1;
  padding-left: 0.75rem;
  color: #475569;
  margin: 0.75rem 0;
}
.markdown-summary :deep(a) {
  color: #4f46e5;
  text-decoration: underline;
}
</style>
