<template>
  <div class="space-y-6 pb-8 min-h-screen">

    <!-- ───────────────────────── Hero Header Card ───────────────────────── -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <!-- Back navigation -->
      <router-link
        to="/history"
        class="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition group"
      >
        <svg class="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        Back to History
      </router-link>

      <!-- Title + status row -->
      <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mt-4">
        <div class="min-w-0">
          <h1 class="text-xl font-extrabold text-slate-900 break-all font-mono">{{ folderName }}</h1>
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
        <!-- Pipeline status strip -->
        <div v-if="manifest?.status" class="flex flex-wrap gap-2 flex-shrink-0">
          <div v-for="(step, key) in { Transcribe: manifest.status.transcribe, Summarize: manifest.status.summarize, Visualize: manifest.status.visualize, Translate: manifest.status.translate }" :key="key" class="flex flex-col items-center gap-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{{ key }}</span>
            <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold" :class="statusClass(step)">
              {{ String(step || '—').toUpperCase() }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ───────────────────────── Error Banner ───────────────────────── -->
    <div
      v-if="error"
      class="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3"
    >
      <span class="text-red-500 flex-shrink-0 mt-0.5">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
      </span>
      <p class="text-sm font-semibold text-red-700">{{ error }}</p>
    </div>

    <!-- ───────────────────────── Skeleton Loading ───────────────────────── -->
    <template v-if="loading">
      <div v-for="n in 3" :key="n" class="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
        <div class="h-4 bg-slate-200 rounded w-1/4 mb-4"/>
        <div class="space-y-2">
          <div class="h-3 bg-slate-100 rounded w-full"/>
          <div class="h-3 bg-slate-100 rounded w-5/6"/>
          <div class="h-3 bg-slate-100 rounded w-4/6"/>
        </div>
      </div>
    </template>

    <template v-else-if="!error">

      <!-- ───────────────────────── Summary Dashboard ───────────────────────── -->
      <div v-if="detail.summary" class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div @click="toggleSection('summary')" class="px-6 py-4 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <h2 class="text-sm font-bold text-slate-800">Summary Dashboard</h2>
          </div>
          <div class="flex items-center gap-3" @click.stop>
            <a :href="downloadUrl('summary_txt')" download class="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              TXT
            </a>
            <a :href="downloadUrl('summary_html')" download class="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              HTML
            </a>
            <svg :class="{'rotate-180': uiState.summary}" class="w-4 h-4 text-slate-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </div>
        </div>

        <div v-show="uiState.summary" class="p-6 space-y-6">
          <div v-if="parsedSummary" class="space-y-6">
            <div class="bg-indigo-50/60 border-l-4 border-indigo-500 rounded-r-xl p-4">
              <h3 class="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-2">Ringkasan Singkat</h3>
              <p class="text-sm text-slate-700 leading-relaxed">{{ parsedSummary.ringkasan_singkat }}</p>
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-800 mb-2">Topik Utama</h3>
              <p class="text-sm text-slate-600 mb-3">{{ parsedSummary.topik_utama }}</p>
              <div class="flex flex-wrap gap-2">
                <span v-for="(tema, index) in parsedSummary.tema_besar" :key="index" class="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">
                  {{ tema }}
                </span>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div>
                <h3 class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <span class="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center text-amber-600 text-xs">💡</span>
                  Insight Penting
                </h3>
                <ul class="space-y-2">
                  <li v-for="(insight, index) in parsedSummary.insight" :key="index" class="flex items-start gap-2 text-sm text-slate-600">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-2"/>
                    <span class="leading-relaxed">{{ insight }}</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <span class="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                  </span>
                  Rekomendasi
                </h3>
                <ul class="space-y-2">
                  <li v-for="(rek, index) in parsedSummary.rekomendasi" :key="index" class="flex items-start gap-2 text-sm text-slate-600">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 mt-2"/>
                    <span class="leading-relaxed">{{ rek }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div v-else class="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {{ detail.summary }}
          </div>
        </div>
      </div>

      <!-- ───────────────────────── Interactive Transcript Editor ───────────────────────── -->
      <div v-if="transcriptData.length > 0" class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div @click="toggleSection('editor')" class="px-6 py-4 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </div>
            <h2 class="text-sm font-bold text-slate-800">Interactive Transcript Editor</h2>
          </div>
          <div class="flex items-center gap-3" @click.stop>
            <button @click.stop="downloadEditedJSON" class="inline-flex items-center gap-1.5 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 rounded-lg font-semibold transition">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Export JSON
            </button>
            <svg :class="{'rotate-180': uiState.editor}" class="w-4 h-4 text-slate-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </div>
        </div>

        <div v-show="uiState.editor" class="p-6">
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
      </div>

      <!-- ───────────────────────── Raw Transcript ───────────────────────── -->
      <div v-if="detail.transcript" class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div @click="toggleSection('raw')" class="px-6 py-4 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h12"/>
              </svg>
            </div>
            <h2 class="text-sm font-bold text-slate-800">Transcript <span class="font-normal text-slate-400">(Raw TXT)</span></h2>
          </div>
          <div class="flex items-center gap-3" @click.stop>
            <a :href="downloadUrl('transcript_txt')" download class="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              TXT
            </a>
            <svg :class="{'rotate-180': uiState.raw}" class="w-4 h-4 text-slate-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </div>
        </div>
        <div v-show="uiState.raw" class="p-6">
          <div class="bg-slate-50 rounded-xl p-4 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto font-mono">
            {{ detail.transcript }}
          </div>
        </div>
      </div>

      <!-- ───────────────────────── Audio Player ───────────────────────── -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div @click="toggleSection('audio')" class="px-6 py-4 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M12 9.5v5m-3.536-6.036a5 5 0 000 7.072M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/>
              </svg>
            </div>
            <h2 class="text-sm font-bold text-slate-800">Audio Source</h2>
          </div>
          <svg :class="{'rotate-180': uiState.audio}" class="w-4 h-4 text-slate-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </div>
        <div v-show="uiState.audio" class="p-6">
          <audio controls class="w-full rounded-xl" :src="downloadUrl('audio')" />
        </div>
      </div>

      <!-- ───────────────────────── Speaker Timeline Image ───────────────────────── -->
      <div v-if="manifest && manifest.files && manifest.files.timeline_png" class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div @click="toggleSection('visualization')" class="px-6 py-4 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
              </svg>
            </div>
            <h2 class="text-sm font-bold text-slate-800">Speaker Timeline</h2>
          </div>
          <div class="flex items-center gap-3" @click.stop>
            <a :href="downloadUrl('image')" download class="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              PNG
            </a>
            <svg :class="{'rotate-180': uiState.visualization}" class="w-4 h-4 text-slate-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </div>
        </div>
        <div v-show="uiState.visualization" class="p-6">
          <img
            :src="downloadUrl('image')"
            class="w-full rounded-xl border border-slate-200"
            alt="Speaker timeline visualization"
            @error="$event.target.style.display = 'none'"
          />
        </div>
      </div>

      <!-- ───────────────────────── Actions ───────────────────────── -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div @click="toggleSection('actions')" class="px-6 py-4 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <h2 class="text-sm font-bold text-slate-800">Actions</h2>
          </div>
          <svg :class="{'rotate-180': uiState.actions}" class="w-4 h-4 text-slate-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </div>

        <div v-show="uiState.actions" class="p-6 space-y-6">

          <!-- Re-run buttons -->
          <div v-if="canSummarize || canVisualize">
            <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Re-run Pipeline Steps</h3>
            <div class="flex flex-wrap gap-3">
              <button
                v-if="canSummarize"
                @click="runSummarizeDetail"
                :disabled="actionLoading.summarize"
                class="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
              >
                <svg v-if="actionLoading.summarize" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                {{ actionLoading.summarize ? 'Summarizing…' : 'Run Summarize' }}
              </button>
              <button
                v-if="canVisualize"
                @click="runVisualizeDetail"
                :disabled="actionLoading.visualize"
                class="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
              >
                <svg v-if="actionLoading.visualize" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>
                {{ actionLoading.visualize ? 'Visualizing…' : 'Run Visualize' }}
              </button>
            </div>
          </div>

          <!-- Action feedback -->
          <div v-if="actionError" class="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
            <svg class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <p class="text-xs text-red-700 font-semibold">{{ actionError }}</p>
          </div>
          <div v-if="actionSuccess" class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
            <svg class="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            <p class="text-xs text-emerald-700 font-semibold">{{ actionSuccess }}</p>
          </div>

          <!-- Translation -->
          <div class="space-y-4 pt-4 border-t border-slate-100">
            <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Translate Outputs</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Source Language</label>
                <input
                  v-model="translateForm.sourceLang"
                  type="text"
                  placeholder="e.g. Indonesian"
                  class="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>
              <div class="space-y-1.5">
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Target Language</label>
                <select
                  v-model="translateForm.targetLang"
                  class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                >
                  <option value="">Select language…</option>
                  <option v-for="lang in TRANSLATE_LANGUAGES" :key="lang.code" :value="lang.code">{{ lang.label }}</option>
                </select>
              </div>
            </div>
            <div class="space-y-1.5">
              <span class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Files to Translate</span>
              <div class="flex flex-wrap gap-3 mt-1">
                <label v-for="opt in TRANSLATE_FILE_OPTIONS" :key="opt.value" class="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:text-slate-900 transition">
                  <input
                    type="checkbox"
                    :value="opt.value"
                    v-model="translateForm.files"
                    class="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  {{ opt.label }}
                </label>
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
              :disabled="translateLoading || !translateForm.targetLang || !translateForm.sourceLang || !translateForm.files.length"
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
import { ref, reactive, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getJob, getDownloadUrl, summarizeJob, visualizeJob, translateJob } from '../services/api'
import { useAppStore } from '../stores/appStore'

const route = useRoute()
const store = useAppStore()

const TRANSLATE_LANGUAGES = [
  { code: 'English', label: 'English' },
  { code: 'Indonesian', label: 'Indonesian' },
  { code: 'Spanish', label: 'Spanish' },
  { code: 'French', label: 'French' },
  { code: 'German', label: 'German' },
  { code: 'Arabic', label: 'Arabic' },
  { code: 'Japanese', label: 'Japanese' },
  { code: 'Chinese', label: 'Chinese (Simplified)' },
  { code: 'Korean', label: 'Korean' },
  { code: 'Portuguese', label: 'Portuguese' }
]

const TRANSLATE_FILE_OPTIONS = [
  { value: 'json', label: 'Transcript JSON' },
  { value: 'txt', label: 'Transcript TXT' },
  { value: 'summary_txt', label: 'Summary TXT' }
]

// --- UI Toggle State ---
const uiState = ref({
  summary: true,
  editor: true,
  raw: true,
  audio: true,
  visualization: true,
  actions: true
})

const toggleSection = (sectionName) => {
  uiState.value[sectionName] = !uiState.value[sectionName]
}

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

// --- Action state ---
const actionLoading = reactive({ summarize: false, visualize: false })
const actionError = ref('')
const actionSuccess = ref('')

// --- Translate state ---
const translateLoading = ref(false)
const translateError = ref('')
const translateSuccess = ref('')
const translateForm = reactive({
  sourceLang: '',
  targetLang: '',
  files: ['json', 'txt', 'summary_txt']
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

// Parse JSON summary
const parsedSummary = computed(() => {
  if (!detail.value.summary) return null
  const match = detail.value.summary.match(/```json\n([\s\S]*?)\n```/)
  if (match && match[1]) {
    try { return JSON.parse(match[1]) } catch (e) { return null }
  }
  return null
})

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
  }
}

const deleteSpeaker = (id) => {
  const speakerName = speakerSettings.value[id]?.name || 'Speaker'
  if (confirm(`Peringatan: Anda akan menghapus permanen ${speakerName} dan SEMUA teksnya dari data. Lanjutkan?`)) {
    transcriptData.value = transcriptData.value.filter(d => String(d.speaker) !== String(id))
    delete speakerSettings.value[id]
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

const resetDetailState = () => {
  detail.value = {
    transcript: '',
    summary: ''
  }
  transcriptData.value = []
  speakerSettings.value = {}
  activeLanguages.value = []
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
    speakerSettings.value = {}
    activeLanguages.value = []
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
      speakerSettings.value = {}
      activeLanguages.value = []
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
  if (!fileName.value || !translateForm.sourceLang || !translateForm.targetLang || !translateForm.files.length) {
    translateError.value = 'Please fill in all required fields before translating.'
    return
  }
  translateLoading.value = true
  translateError.value = ''
  translateSuccess.value = ''
  try {
    const result = await translateJob(
      folderName.value,
      fileName.value,
      translateForm.sourceLang,
      translateForm.targetLang,
      translateForm.files
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

const downloadUrl = (fileType) => getDownloadUrl(folderName.value, fileType)

watch(() => route.params.folderName, loadDetail, { immediate: true })
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
</style>
