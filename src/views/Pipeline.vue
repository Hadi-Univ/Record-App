<template>
  <div class="space-y-6 pb-4">
    <!-- Header -->
    <div data-reveal class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 class="text-xl font-extrabold text-slate-900">{{ t('pipeline.title') }}</h1>
          <p class="text-sm text-slate-500 mt-1">{{ t('pipeline.subtitle') }}</p>
        </div>
        <span
          class="self-start md:self-auto px-3 py-1 rounded-lg text-xs font-bold uppercase"
          :class="statusBadgeClass"
        >
          {{ statusBadgeLabel }}
        </span>
      </div>

      <!-- Progress Stepper -->
      <div class="mt-6">
        <Stepper :currentStep="pipeline.currentStep" :isRunning="pipeline.status === 'running'" />
      </div>

      <!-- Current Sub-Step (shown while running) -->
      <div
        v-if="pipeline.status === 'running' && pipeline.currentSubStep"
        class="mt-4 flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5"
      >
        <svg class="w-4 h-4 text-indigo-500 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span class="text-sm font-semibold text-indigo-700">{{ pipeline.currentSubStep }}</span>
      </div>

      <div
        v-if="uploadProcessingNotice"
        class="mt-4 flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5"
      >
        <svg class="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
        </svg>
        <span class="text-sm font-semibold text-emerald-700">{{ uploadProcessingNotice }}</span>
      </div>

      <!-- Overall Completion Progress Bar (shown once pipeline has started) -->
      <div v-if="pipeline.currentStep > 1 || pipeline.status === 'done'" class="mt-5">
        <div class="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
          <span>{{ t('pipeline.progress') }}</span>
          <span class="font-mono">{{ completionRate }}%</span>
        </div>
        <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div
            class="h-2 rounded-full transition-all duration-700"
            :class="pipeline.status === 'error' ? 'bg-red-400' : pipeline.status === 'done' ? 'bg-emerald-500' : 'bg-indigo-500'"
            :style="{ width: completionRate + '%' }"
          />
        </div>
      </div>
    </div>

    <!-- Error Banner -->
    <div
      v-if="pipeline.lastError"
      data-reveal
      class="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3"
    >
      <span class="text-red-500 flex-shrink-0 mt-0.5">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
      </span>
      <div class="flex-1">
        <p class="text-sm font-semibold text-red-700">{{ t('pipeline.pipelineError') }}</p>
        <p class="text-xs text-red-600 mt-1 font-mono break-all">{{ pipeline.lastError }}</p>
      </div>
      <button
        @click="pipeline.lastError = ''"
        class="motion-interactive text-red-400 hover:text-red-600 transition text-lg leading-none"
        :aria-label="t('pipeline.dismissError')"
      >×</button>
    </div>

    <!-- Pipeline Insights Card (shown once pipeline has progressed past step 1) -->
    <div
      v-if="pipeline.currentStep > 1 || pipeline.status === 'done'"
      data-reveal
      data-reveal-delay="60"
      class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
    >
      <h2 class="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
        <svg class="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
         {{ t('pipeline.insights') }}
      </h2>

      <!-- Key Metrics Grid -->
      <div class="grid grid-cols-3 gap-3 mb-5">
        <div class="bg-indigo-50 rounded-xl p-3 text-center">
          <div class="text-2xl font-extrabold text-indigo-600">{{ completionRate }}%</div>
          <div class="text-xs text-slate-500 mt-0.5">{{ t('home.completed') }}</div>
        </div>
        <div class="bg-slate-50 rounded-xl p-3 text-center">
          <div class="font-extrabold text-slate-800" :class="pipeline.status === 'running' ? 'text-base' : 'text-2xl'">
            <span v-if="pipeline.status === 'running'" class="flex items-center justify-center gap-1 text-indigo-600">
              <svg class="w-3.5 h-3.5 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {{ formatDuration(totalDurationMs) || t('pipeline.runningNow') }}
            </span>
            <span v-else>{{ formatDuration(totalDurationMs) }}</span>
          </div>
          <div class="text-xs text-slate-500 mt-0.5">{{ t('pipeline.totalTime') }}</div>
        </div>
        <div class="bg-amber-50 rounded-xl p-3 text-center">
          <div class="text-sm font-extrabold text-amber-700 leading-snug truncate">
             {{ bottleneckStage ? stageLabels[bottleneckStage] : t('pipeline.noDuration') }}
          </div>
          <div class="text-xs text-slate-500 mt-0.5">{{ t('pipeline.slowestStage') }}</div>
        </div>
      </div>

      <!-- Stage Duration Bars -->
      <div v-if="hasStageMetrics || pipeline.status === 'running'" class="space-y-3 mb-5">
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ t('pipeline.stageDurations') }}</p>

        <!-- Completed stages -->
        <div v-for="[stage, ms] in Object.entries(stageDurationsMs)" :key="stage" class="space-y-1">
          <div class="flex items-center justify-between text-xs">
            <span class="font-semibold text-slate-700 flex items-center gap-1.5">
              {{ stageLabels[stage] || stage }}
              <span
                v-if="stage === bottleneckStage"
                class="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full"
              >{{ t('pipeline.bottleneck') }}</span>
            </span>
            <span class="font-mono text-slate-500">{{ formatDuration(ms) }}</span>
          </div>
          <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              class="h-2 rounded-full transition-all duration-700"
              :class="stage === bottleneckStage ? 'bg-amber-400' : (stageBarColors[stage] || 'bg-indigo-400')"
              :style="{ width: Math.round((ms / maxStageDuration) * 100) + '%' }"
            />
          </div>
        </div>

        <!-- Active stage (currently running) -->
        <div v-if="pipeline.status === 'running' && activeStageKey" class="space-y-1">
          <div class="flex items-center justify-between text-xs">
            <span class="font-semibold text-indigo-700 flex items-center gap-1.5">
              <svg class="w-3 h-3 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {{ stageLabels[activeStageKey] || activeStageKey }}
              <span v-if="pipeline.currentSubStep" class="text-indigo-500 font-normal">— {{ pipeline.currentSubStep }}</span>
            </span>
            <span class="font-mono text-indigo-500">
              {{ activeStageStart ? formatDuration(currentTime - activeStageStart) : '…' }}
            </span>
          </div>
          <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div class="bg-indigo-300 h-2 rounded-full animate-pulse w-full" />
          </div>
        </div>
      </div>

      <!-- Timestamps & Owner Row -->
      <div class="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-3 border-t border-slate-100 text-xs text-slate-500">
        <span v-if="pipeline.startedAt">
          {{ t('pipeline.started') }} <span class="font-semibold text-slate-700">{{ formatTimestamp(pipeline.startedAt) }}</span>
        </span>
        <span v-if="pipeline.completedAt">
          {{ t('pipeline.completedAt') }} <span class="font-semibold text-slate-700">{{ formatTimestamp(pipeline.completedAt) }}</span>
        </span>
        <span v-if="store.state.user?.name || store.state.user?.email">
          {{ t('pipeline.owner') }} <span class="font-semibold text-slate-700">{{ store.state.user.name || store.state.user.email }}</span>
        </span>
        <span v-if="pipeline.folderName" class="font-mono">
          {{ t('pipeline.job') }} <span class="font-semibold text-slate-700">{{ pipeline.folderName }}</span>
        </span>
      </div>
    </div>

    <!-- Upload / Record Section (Step 1) -->
    <div
      v-if="pipeline.currentStep === 1 || !pipeline.folderName"
      data-reveal
      data-reveal-delay="120"
      class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
    >
      <h2 class="text-base font-bold text-slate-900 mb-4">{{ t('pipeline.provideAudio') }}</h2>

      <!-- Mode Toggle -->
      <div class="flex rounded-xl overflow-hidden border border-slate-200 mb-5 text-sm font-semibold">
        <button
          @click="switchMode('upload')"
          :disabled="isPipelineLocked"
          class="motion-interactive flex-1 py-2 flex items-center justify-center gap-1.5 transition"
          :class="inputMode === 'upload'
            ? 'bg-indigo-600 text-white'
            : 'bg-white text-slate-500 hover:bg-slate-50'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
          {{ t('pipeline.uploadFile') }}
        </button>
        <button
          @click="switchMode('record')"
          :disabled="isPipelineLocked"
          class="motion-interactive flex-1 py-2 flex items-center justify-center gap-1.5 transition"
          :class="inputMode === 'record'
            ? 'bg-indigo-600 text-white'
            : 'bg-white text-slate-500 hover:bg-slate-50'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
          </svg>
          {{ t('pipeline.recordAudio') }}
        </button>
      </div>

      <!-- Upload Mode -->
      <div v-if="inputMode === 'upload'">
        <div
          v-if="fileValidationError"
          class="mb-3 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 font-medium"
        >
          {{ fileValidationError }}
        </div>
        <div
          class="border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer"
          :class="dragOver
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-slate-300 hover:border-indigo-300 hover:bg-slate-50'"
          @dragover.prevent="!isPipelineLocked && (dragOver = true)"
          @dragleave="dragOver = false"
          @drop.prevent="onDrop"
          @click="!isPipelineLocked && fileInputRef.click()"
        >
          <input
            ref="fileInputRef"
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.oga,.flac,.aac,.m4a,.opus,.webm"
            class="hidden"
            :disabled="isPipelineLocked"
            @change="onFileChange"
          />
          <div v-if="!selectedFile">
            <div class="flex justify-center mb-2">
              <svg class="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
              </svg>
            </div>
            <p class="text-sm font-semibold text-slate-700">{{ t('pipeline.dropAudio') }}</p>
            <p class="text-xs text-slate-400 mt-1">{{ t('pipeline.orClickToBrowse') }}</p>
            <p class="text-xs text-slate-400 mt-2">{{ t('pipeline.supportedFormats') }}</p>
          </div>
          <div v-else class="flex items-center justify-center gap-3">
            <svg class="w-6 h-6 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
            </svg>
            <div class="text-left">
              <p class="text-sm font-semibold text-slate-800">{{ selectedFile.name }}</p>
              <p class="text-xs text-slate-400">{{ formatSize(selectedFile.size) }}</p>
            </div>
            <button
              @click.stop="clearFile"
              :disabled="isPipelineLocked"
              class="motion-interactive ml-2 text-slate-400 hover:text-red-500 transition text-xl leading-none"
              :aria-label="t('pipeline.removeFileAria')"
            >×</button>
          </div>
        </div>
      </div>

      <!-- Record Mode -->
      <div v-else class="space-y-4">
        <!-- Mic permission error -->
        <div v-if="recordError" class="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 font-medium">
          {{ recordError }}
        </div>

        <!-- Idle: show start button -->
        <div v-if="!isRecording && !audioBlob" class="flex flex-col items-center gap-3 py-6">
          <button
            @click="startRecording"
            :disabled="isPipelineLocked"
            class="motion-interactive w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition flex items-center justify-center shadow-lg"
              :aria-label="t('pipeline.startRecordingAria')"
          >
            <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1a4 4 0 014 4v7a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v7a2 2 0 004 0V5a2 2 0 00-2-2zM8.5 19.5A7.5 7.5 0 0019 12h2a9.5 9.5 0 01-9.5 9.5v2h-1v-2A9.5 9.5 0 013 12h2a7.5 7.5 0 005.5 7.326V21H8.5v-1.5z"/>
            </svg>
          </button>
          <p class="text-sm text-slate-500">{{ t('pipeline.tapToStartRecording') }}</p>
        </div>

        <!-- Recording in progress -->
        <div v-else-if="isRecording" class="space-y-3">
          <!-- Audio spectrum visualizer -->
          <AudioSpectrum :stream="micStream" :active="isRecording" />

          <!-- Timer + Stop row -->
          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-2">
              <span class="text-base font-mono font-bold text-slate-800 tabular-nums">
                {{ formatRecordingTime(recordingSeconds) }}
              </span>
              <span class="text-xs text-slate-400">{{ t('pipeline.recording') }}</span>
            </div>
            <button
              @click="stopRecording"
              :disabled="isPipelineLocked"
              class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold transition flex items-center gap-2"
              :aria-label="t('pipeline.stopRecordingAria')"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
              {{ t('pipeline.stopRecording') }}
            </button>
          </div>
        </div>

        <!-- Recording done: preview + actions -->
        <div v-else-if="audioBlob" class="space-y-3">
          <div class="bg-slate-50 rounded-xl p-4 flex flex-col gap-3">
            <div class="flex items-center gap-2 text-sm text-slate-700 font-semibold">
              <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
              {{ t('pipeline.recordingReady', { duration: formatRecordingTime(recordingSeconds) }) }}
            </div>
            <audio :src="audioBlobUrl" controls class="w-full h-10 rounded"></audio>
          </div>
          <div class="flex gap-2">
            <button
              @click="discardRecording"
              :disabled="isPipelineLocked"
              class="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
            >
              {{ t('pipeline.discard') }}
            </button>
          </div>
        </div>
      </div>

      <button
        @click="startPipeline"
        :disabled="!canStartPipeline || isPipelineLocked"
        class="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
      >
        <span v-if="pipeline.status === 'running'" class="flex items-center gap-2">
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ t('pipeline.uploadingAndTranscribing') }}
        </span>
        <span v-else class="flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {{ t('pipeline.startPipeline') }}
        </span>
      </button>

      <!-- Chunked upload progress bar -->
      <div v-if="chunkUploadStep" class="mt-4 space-y-1.5">
        <div class="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>{{ chunkUploadStep === 'assembling' ? t('pipeline.assemblingAndTranscribing') : t('pipeline.uploadingChunks') }}</span>
          <span class="font-mono tabular-nums">{{ chunkUploadProgress }}%</span>
        </div>
        <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div
            class="bg-indigo-500 h-2 rounded-full transition-all duration-300"
            :style="{ width: chunkUploadProgress + '%' }"
          />
        </div>
      </div>
    </div>

    <!-- Resume Section (Steps 2-3) -->
    <div
      v-else-if="pipeline.folderName && pipeline.currentStep <= 3 && pipeline.status !== 'done'"
      class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
    >
      <div class="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 class="text-base font-bold text-slate-900">{{ t('pipeline.currentJob') }}</h2>
          <p class="text-xs text-slate-500 font-mono mt-1">{{ pipeline.folderName }}</p>
        </div>
        <button
          @click="store.clearPipeline()"
          :disabled="isPipelineLocked"
          class="text-xs text-red-500 hover:text-red-700 font-semibold underline transition"
        >
          {{ t('pipeline.startOver') }}
        </button>
      </div>

      <!-- Step 2: Summarize -->
      <div v-if="pipeline.currentStep === 2" class="space-y-4">
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p class="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            {{ t('pipeline.transcriptionComplete') }}</p>
          <p v-if="pipeline.results.transcription" class="text-xs text-emerald-600 mt-1 line-clamp-3">
            {{ pipeline.results.transcription }}
          </p>
        </div>
        <button
          @click="runSummarize"
          :disabled="isPipelineLocked"
          class="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
        >
          <span v-if="pipeline.status === 'running'" class="flex items-center gap-2">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ t('pipeline.summarizing') }}
          </span>
          <span v-else class="flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            {{ t('pipeline.runSummarize') }}
          </span>
        </button>
      </div>

      <!-- Step 3: Visualize -->
      <div v-if="pipeline.currentStep === 3" class="space-y-4">
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p class="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            {{ t('pipeline.summarizationComplete') }}</p>
          <p v-if="pipeline.results.summary" class="text-xs text-emerald-600 mt-1 line-clamp-3">
            {{ pipeline.results.summary }}
          </p>
        </div>
        <button
          @click="runVisualize"
          :disabled="isPipelineLocked"
          class="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
        >
          <span v-if="pipeline.status === 'running'" class="flex items-center gap-2">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ t('pipeline.visualizing') }}
          </span>
          <span v-else class="flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
            </svg>
            {{ t('pipeline.runVisualize') }}
          </span>
        </button>
      </div>
    </div>

    <!-- Results Section (Step 4 / Done) -->
    <div
      v-if="pipeline.status === 'done' || pipeline.currentStep === 4"
      class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-base font-bold text-slate-900">{{ t('pipeline.results') }}</h2>
          <p class="text-xs text-slate-500 font-mono mt-1">{{ pipeline.folderName }}</p>
        </div>
        <button
          @click="store.clearPipeline()"
          :disabled="isPipelineLocked"
          class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline transition"
        >
          {{ t('pipeline.newJob') }}
        </button>
      </div>

      <!-- Transcription result -->
      <div v-if="pipeline.results.transcription" class="space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            {{ t('pipeline.transcript') }}
          </h3>
          <div class="flex items-center gap-3">
              <button
                @click="rerunTranscribe"
                :disabled="isPipelineLocked"
                class="text-xs text-slate-500 hover:text-indigo-600 disabled:opacity-40 font-semibold transition flex items-center gap-1"
                :title="t('pipeline.rerunTranscription')"
              >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              {{ t('pipeline.rerun') }}
            </button>
            <a
              v-if="pipeline.folderName"
              :href="downloadUrl('transcript')"
              download
              class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition flex items-center gap-1"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              {{ t('pipeline.download') }}
            </a>
          </div>
        </div>
        <div class="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed max-h-48 overflow-y-auto">
          {{ pipeline.results.transcription }}
        </div>
      </div>

      <!-- Summary result -->
      <div v-if="pipeline.results.summary" class="space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h10"/></svg>
            {{ t('pipeline.summary') }}
          </h3>
          <div v-if="pipeline.folderName" class="flex items-center gap-3">
              <button
                @click="rerunSummarize"
                :disabled="isPipelineLocked"
                class="text-xs text-slate-500 hover:text-indigo-600 disabled:opacity-40 font-semibold transition flex items-center gap-1"
                :title="t('pipeline.rerunSummarization')"
              >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              {{ t('pipeline.rerun') }}
            </button>
            <a
              :href="downloadUrl('summary')"
              download
              class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition flex items-center gap-1"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              {{ t('pipeline.txt') }}
            </a>
            <a
              :href="downloadUrl('summary_html')"
              download
              class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition flex items-center gap-1"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              {{ t('pipeline.html') }}
            </a>
          </div>
        </div>
        <div class="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed max-h-48 overflow-y-auto">
          {{ pipeline.results.summary }}
        </div>
      </div>

      <!-- Visualization result -->
      <div v-if="pipeline.results.mindmap_svg || pipeline.folderName" class="space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            {{ t('pipeline.visualization') }}
          </h3>
          <div v-if="pipeline.folderName" class="flex items-center gap-3">
              <button
                @click="rerunVisualize"
                :disabled="isPipelineLocked"
                class="text-xs text-slate-500 hover:text-indigo-600 disabled:opacity-40 font-semibold transition flex items-center gap-1"
                :title="t('pipeline.rerunVisualization')"
              >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              {{ t('pipeline.rerun') }}
            </button>
            <a
              :href="downloadUrl('mindmap_png')"
              download
              class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition flex items-center gap-1"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              {{ t('pipeline.png') }}
            </a>
          </div>
        </div>
        <!-- Prefer inline SVG if returned by the API, otherwise show PNG -->
        <div
          v-if="pipeline.results.mindmap_svg"
          class="bg-white border border-slate-200 rounded-xl p-4 overflow-x-auto"
          v-html="pipeline.results.mindmap_svg"
        />
        <img
          v-else-if="pipeline.folderName"
          :src="downloadUrl('mindmap_png')"
          class="w-full rounded-xl border border-slate-200"
          :alt="t('pipeline.visualizationAlt')"
          @error="$event.target.style.display = 'none'"
        />
      </div>

      <!-- Keywords / Key Points -->
      <div v-if="pipeline.results.keywords && pipeline.results.keywords.length" class="space-y-2">
        <h3 class="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/></svg>
          {{ t('pipeline.keyPoints') }}
        </h3>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="kw in pipeline.results.keywords"
            :key="kw"
            class="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full"
          >
            {{ kw }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Stepper from '../components/Stepper.vue'
import AudioSpectrum from '../components/AudioSpectrum.vue'
import { useAppStore } from '../stores/appStore'
import * as api from '../services/api.js'
import { useI18n } from '../i18n/index.js'

const store = useAppStore()
const pipeline = store.state.pipeline
const { t } = useI18n()

const fileInputRef = ref(null)
const selectedFile = ref(null)
const dragOver = ref(false)
const uploadProcessingNotice = ref('')
const fileValidationError = ref('')

// Chunked upload state
const chunkUploadProgress = ref(0)
const chunkUploadStep = ref('') // 'uploading' | 'assembling' | ''

const PARALLEL_CHUNKS = 3
const MAX_CHUNK_RETRIES = 3

// Record mode state
const inputMode = ref('upload') // 'upload' | 'record'
const isRecording = ref(false)
const audioBlob = ref(null)
const audioBlobUrl = ref(null)
const recordingSeconds = ref(0)
const recordError = ref('')
let mediaRecorder = null
let audioChunks = []
let recordingTimer = null
const micStream = ref(null)

// ── Pipeline Metrics ──────────────────────────────────────────────────────────
const stageLabels = computed(() => ({
  upload: t('pipeline.uploadFile'),
  summarize: t('pipeline.summarize'),
  visualize: t('pipeline.visualize')
}))
const stageBarColors = { upload: 'bg-indigo-500', summarize: 'bg-amber-500', visualize: 'bg-purple-500' }

// Live clock — ticks every second while pipeline is running so elapsed times stay current
const currentTime = ref(Date.now())
let timeTickInterval = null

const stageDurationsMs = computed(() => {
  const result = {}
  const timings = pipeline.stageTimings || {}
  for (const [key, val] of Object.entries(timings)) {
    if (val?.start && val?.end) {
      result[key] = val.end - val.start
    }
  }
  return result
})

const maxStageDuration = computed(() => Math.max(...Object.values(stageDurationsMs.value), 1))

const bottleneckStage = computed(() => {
  const entries = Object.entries(stageDurationsMs.value)
  if (!entries.length) return null
  return entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
})

const totalDurationMs = computed(() => {
  if (!pipeline.startedAt) return 0
  if (pipeline.completedAt) return pipeline.completedAt - pipeline.startedAt
  if (pipeline.status === 'running') return currentTime.value - pipeline.startedAt
  return 0
})

// 0 → 33 → 67 → 100 as steps 2, 3, 4 are reached
const completionRate = computed(() => {
  if (pipeline.status === 'done' || pipeline.currentStep >= 4) return 100
  if (pipeline.currentStep === 3) return 67
  if (pipeline.currentStep === 2) return 33
  return 0
})

const hasStageMetrics = computed(() => Object.keys(stageDurationsMs.value).length > 0)

// Which stage is actively running right now
const activeStageKey = computed(() => {
  if (pipeline.status !== 'running') return null
  if (pipeline.currentStep === 1) return 'upload'
  if (pipeline.currentStep === 2) return 'summarize'
  if (pipeline.currentStep === 3) return 'visualize'
  return null
})

const activeStageStart = computed(() => {
  const key = activeStageKey.value
  if (!key) return null
  return pipeline.stageTimings?.[key]?.start || null
})

const formatDuration = (ms) => {
  if (!ms || ms <= 0) return t('pipeline.noDuration')
  const totalSecs = Math.floor(ms / 1000)
  if (totalSecs < 60) return `${totalSecs}s`
  const m = Math.floor(totalSecs / 60)
  const s = totalSecs % 60
  return s ? `${m}m ${s}s` : `${m}m`
}

const formatTimestamp = (ts) => {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const canStartPipeline = computed(() =>
  inputMode.value === 'upload' ? !!selectedFile.value : !!audioBlob.value
)
const isPipelineLocked = computed(() => pipeline.isProcessing)

const beginProcessingLock = () => {
  pipeline.isProcessing = true
}

const releaseProcessingLock = () => {
  pipeline.isProcessing = false
}

const switchMode = (mode) => {
  if (isPipelineLocked.value) return
  inputMode.value = mode
  if (mode === 'upload') {
    discardRecording()
  } else {
    clearFile()
  }
}

const statusBadgeClass = computed(() => {
  const s = pipeline.status
  if (s === 'running') return 'bg-indigo-100 text-indigo-700'
  if (s === 'error') return 'bg-red-100 text-red-700'
  if (s === 'done') return 'bg-emerald-100 text-emerald-700'
  return 'bg-slate-100 text-slate-500'
})

const statusBadgeLabel = computed(() => pipeline.status)

const onFileChange = (e) => {
  if (isPipelineLocked.value) return
  const file = e.target.files[0] || null
  if (!file) {
    selectedFile.value = null
    fileValidationError.value = ''
    return
  }
  const validationError = validateSelectedFile(file)
  if (validationError) {
    selectedFile.value = null
    fileValidationError.value = validationError
    if (fileInputRef.value) fileInputRef.value.value = ''
    return
  }
  selectedFile.value = file
  fileValidationError.value = ''
}

const onDrop = (e) => {
  if (isPipelineLocked.value) return
  dragOver.value = false
  const file = e.dataTransfer.files[0]
  if (!file) return
  const validationError = validateSelectedFile(file)
  if (validationError) {
    selectedFile.value = null
    fileValidationError.value = validationError
    return
  }
  selectedFile.value = file
  fileValidationError.value = ''
}

const clearFile = () => {
  if (isPipelineLocked.value) return
  selectedFile.value = null
  fileValidationError.value = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const ALLOWED_AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'oga', 'flac', 'aac', 'm4a', 'opus', 'webm'])
const BLOCKED_VIDEO_EXTENSIONS = new Set(['mp4', 'm4v', 'mov', 'avi', 'mkv', 'mpeg', 'mpg'])

const validateSelectedFile = (file) => {
  const lowerName = String(file?.name || '').toLowerCase()
  const extension = lowerName.includes('.') ? lowerName.split('.').pop() : ''
  const mimeType = String(file?.type || '').toLowerCase()

  if (mimeType.startsWith('video/') || BLOCKED_VIDEO_EXTENSIONS.has(extension)) {
    return t('pipeline.videoNotAllowed')
  }

  if (
    !mimeType.startsWith('audio/') &&
    (!extension || !ALLOWED_AUDIO_EXTENSIONS.has(extension))
  ) {
    return t('pipeline.unsupportedFormat')
  }

  return ''
}

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const formatRecordingTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const startRecording = async () => {
  if (isPipelineLocked.value) return
  recordError.value = ''
  audioChunks = []
  try {
    micStream.value = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch (err) {
    console.error('Microphone access error:', err)
    recordError.value = t('pipeline.microphoneDenied')
    return
  }

  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : ''

  mediaRecorder = mimeType
    ? new MediaRecorder(micStream.value, { mimeType })
    : new MediaRecorder(micStream.value)

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) audioChunks.push(e.data)
  }

  mediaRecorder.onstop = () => {
    const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' })
    audioBlob.value = blob
    audioBlobUrl.value = URL.createObjectURL(blob)
    releaseMicStream()
  }

  mediaRecorder.start(250)
  isRecording.value = true
  recordingSeconds.value = 0
  recordingTimer = setInterval(() => { recordingSeconds.value++ }, 1000)
}

const stopRecording = (force = false) => {
  if (isPipelineLocked.value && !force) return
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  clearInterval(recordingTimer)
  recordingTimer = null
  isRecording.value = false
}

const discardRecording = (force = false) => {
  if (isPipelineLocked.value && !force) return
  stopRecording(force)
  if (audioBlobUrl.value) {
    URL.revokeObjectURL(audioBlobUrl.value)
    audioBlobUrl.value = null
  }
  audioBlob.value = null
  recordingSeconds.value = 0
  recordError.value = ''
}

const releaseMicStream = () => {
  if (micStream.value) {
    micStream.value.getTracks().forEach((t) => t.stop())
    micStream.value = null
  }
}

onUnmounted(() => {
  discardRecording(true)
  releaseMicStream()
  clearInterval(timeTickInterval)
})

const downloadUrl = (type) => {
  if (type === 'transcript') return api.getDownloadUrl(pipeline.folderName, 'transcript_txt')
  if (type === 'summary') return api.getDownloadUrl(pipeline.folderName, 'summary_txt')
  if (type === 'summary_html') return api.getDownloadUrl(pipeline.folderName, 'summary_html')
  if (type === 'mindmap_png') return api.getDownloadUrl(pipeline.folderName, 'image')
  return api.getDownloadUrl(pipeline.folderName, type)
}

const isDoneStatus = (statusValue) => String(statusValue || '').toLowerCase() === 'done'

const syncPipelineFromManifest = (jobDetail) => {
  const status = jobDetail?.status || {}
  const transcribeDone = isDoneStatus(status.transcribe)
  const summarizeDone = isDoneStatus(status.summarize)
  const visualizeDone = isDoneStatus(status.visualize)

  pipeline.folderName = jobDetail?.folder_name || pipeline.folderName
  pipeline.fileName = jobDetail?.file_name || pipeline.fileName

  if (visualizeDone) {
    pipeline.currentStep = 4
    pipeline.status = 'done'
    return 'visualize'
  }

  if (summarizeDone) {
    pipeline.currentStep = 3
    pipeline.status = 'idle'
    return 'summarize'
  }

  if (transcribeDone) {
    pipeline.currentStep = 2
    pipeline.status = 'idle'
    return 'transcribe'
  }

  pipeline.currentStep = 1
  pipeline.status = 'idle'
  return 'none'
}

const recoverPipelineAfterRefresh = async () => {
  const wasRunningBeforeReload = pipeline.status === 'running'

  if (wasRunningBeforeReload && !pipeline.folderName) {
    pipeline.status = 'error'
    releaseProcessingLock()
    uploadProcessingNotice.value = ''
    pipeline.lastError = t('pipeline.interruptedBeforeSave')
    return
  }

  if (!pipeline.folderName) return

  try {
    const jobDetail = await api.getJob(pipeline.folderName, { cacheTtlMs: api.GET_CACHE_TTL_MS.JOB })
    const lastCompletedStep = syncPipelineFromManifest(jobDetail)
    if (!wasRunningBeforeReload) return

    if (lastCompletedStep === 'transcribe') {
      await runSummarize()
      return
    }

    if (lastCompletedStep === 'summarize') {
      await runVisualize()
    }
  } catch (err) {
    if (!wasRunningBeforeReload) return
    pipeline.status = 'error'
    releaseProcessingLock()
    uploadProcessingNotice.value = ''
    pipeline.lastError = err.message || t('pipeline.recoveryFailed')
  }
}

const startPipeline = async () => {
  if (isPipelineLocked.value) return
  let fileToUpload = selectedFile.value

  if (inputMode.value === 'record') {
    if (!audioBlob.value) return
    const ext = audioBlob.value.type.includes('webm') ? 'webm' : 'wav'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    fileToUpload = new File([audioBlob.value], `recording-${timestamp}.${ext}`, { type: audioBlob.value.type })
  }

  if (!fileToUpload) return

  beginProcessingLock()
  uploadProcessingNotice.value = ''
  pipeline.status = 'running'
  pipeline.currentStep = 1
  pipeline.lastError = ''
  pipeline.currentSubStep = t('pipeline.stageUploadSubstep')
  pipeline.startedAt = Date.now()
  pipeline.completedAt = null
  pipeline.stageTimings = { upload: { start: Date.now() } }

  try {
    // Step 1: Upload + Transcribe (always uses chunked upload)
    const transcribeResult = await uploadFileChunked(fileToUpload)
    pipeline.stageTimings.upload.end = Date.now()
    pipeline.currentSubStep = ''
    uploadProcessingNotice.value = t('pipeline.uploadSuccessNotice')
    pipeline.folderName = transcribeResult.folder_name || transcribeResult.folderName || ''
    pipeline.fileName =
      transcribeResult.file_name ||
      transcribeResult.fileName ||
      fileToUpload.name.replace(/\.[^/.]+$/, "")
    pipeline.results = {
      ...pipeline.results,
      transcription: transcribeResult.transcript || transcribeResult.transcription || ''
    }
    pipeline.currentStep = 2
    pipeline.status = 'idle'
  } catch (err) {
    pipeline.status = 'error'
    releaseProcessingLock()
    uploadProcessingNotice.value = ''
    pipeline.currentSubStep = ''
    pipeline.lastError = err.message
    chunkUploadStep.value = ''
    return
  }

  // Automatically continue to summarize
  await runSummarize()
}

/**
 * Upload a file using the resumable chunked-upload API.
 * Splits the file into CHUNK_SIZE pieces, uploads them in parallel batches,
 * retries failed chunks, then calls /upload/complete to assemble + transcribe.
 */
const uploadFileChunked = async (file) => {
  const totalChunks = Math.ceil(file.size / api.CHUNK_SIZE)
  chunkUploadProgress.value = 0
  chunkUploadStep.value = 'uploading'

  // Init session
  const { upload_id } = await api.initChunkedUpload(file.name, totalChunks, file.size)

  // Resume: find out which chunks the server already has
  const { received_chunks: alreadyReceived } = await api.getUploadStatus(upload_id)
  const receivedSet = new Set(alreadyReceived)
  const pending = Array.from({ length: totalChunks }, (_, i) => i).filter(i => !receivedSet.has(i))

  let uploaded = alreadyReceived.length

  // Upload pending chunks in parallel batches
  for (let i = 0; i < pending.length; i += PARALLEL_CHUNKS) {
    const batch = pending.slice(i, i + PARALLEL_CHUNKS)
    await Promise.all(batch.map(async (chunkIndex) => {
      const start = chunkIndex * api.CHUNK_SIZE
      const end = Math.min(start + api.CHUNK_SIZE, file.size)
      const blob = file.slice(start, end)
      let lastErr
      for (let attempt = 0; attempt < MAX_CHUNK_RETRIES; attempt++) {
        try {
          await api.uploadChunk(upload_id, chunkIndex, blob)
          uploaded++
          chunkUploadProgress.value = Math.round((uploaded / totalChunks) * 90)
          return
        } catch (err) {
          lastErr = err
        }
      }
      throw lastErr
    }))
  }

  // Assemble + transcribe
  pipeline.currentSubStep = t('pipeline.stageAssemblingSubstep')
  chunkUploadStep.value = 'assembling'
  chunkUploadProgress.value = 95
  const result = await api.completeChunkedUpload(upload_id)
  chunkUploadProgress.value = 100
  chunkUploadStep.value = ''
  return result
}

const runSummarize = async () => {
  if (!pipeline.folderName) return

  beginProcessingLock()
  pipeline.status = 'running'
  pipeline.lastError = ''
  pipeline.currentSubStep = t('pipeline.stageSummarizingSubstep')
  pipeline.stageTimings.summarize = { start: Date.now() }

  try {
    const summarizeResult = await api.summarizeJob(pipeline.folderName, pipeline.fileName)
    pipeline.stageTimings.summarize.end = Date.now()
    pipeline.currentSubStep = ''
    pipeline.results = {
      ...pipeline.results,
      summary: summarizeResult.summary || '',
      keywords: summarizeResult.keywords || []
    }
    pipeline.currentStep = 3
    pipeline.status = 'idle'
  } catch (err) {
    pipeline.status = 'error'
    releaseProcessingLock()
    uploadProcessingNotice.value = ''
    pipeline.currentSubStep = ''
    pipeline.lastError = err.message
    return
  }

  // Automatically continue to visualize
  await runVisualize()
}

const runVisualize = async () => {
  if (!pipeline.folderName) return

  beginProcessingLock()
  pipeline.status = 'running'
  pipeline.lastError = ''
  pipeline.currentSubStep = t('pipeline.stageVisualizingSubstep')
  pipeline.stageTimings.visualize = { start: Date.now() }

  try {
    const visualizeResult = await api.visualizeJob(pipeline.folderName, pipeline.fileName)
    pipeline.stageTimings.visualize.end = Date.now()
    pipeline.currentSubStep = ''
    pipeline.results = {
      ...pipeline.results,
      mindmap_svg: visualizeResult.svg || visualizeResult.mindmap_svg || '',
      mindmap_html: visualizeResult.html || visualizeResult.mindmap_html || ''
    }
    pipeline.currentStep = 4
    pipeline.status = 'done'
    releaseProcessingLock()
    uploadProcessingNotice.value = ''
    pipeline.completedAt = Date.now()
  } catch (err) {
    pipeline.status = 'error'
    releaseProcessingLock()
    uploadProcessingNotice.value = ''
    pipeline.currentSubStep = ''
    pipeline.lastError = err.message
  }
}

const rerunTranscribe = async () => {
  if (isPipelineLocked.value) return
  if (!pipeline.folderName) return

  beginProcessingLock()
  uploadProcessingNotice.value = ''
  pipeline.status = 'running'
  pipeline.lastError = ''
  pipeline.currentSubStep = t('pipeline.stageRetrancribingSubstep')
  pipeline.stageTimings = { upload: { start: Date.now() } }
  pipeline.completedAt = null

  try {
    const result = await api.retranscribeJob(pipeline.folderName, pipeline.fileName)
    pipeline.stageTimings.upload.end = Date.now()
    pipeline.currentSubStep = ''
    pipeline.results = {
      transcription: result.transcript || '',
      summary: '',
      keywords: [],
      mindmap_svg: '',
      mindmap_html: ''
    }
    pipeline.currentStep = 2
    pipeline.status = 'idle'
  } catch (err) {
    pipeline.status = 'error'
    releaseProcessingLock()
    uploadProcessingNotice.value = ''
    pipeline.currentSubStep = ''
    pipeline.lastError = err.message
    return
  }

  await runSummarize()
}

const rerunSummarize = async () => {
  if (isPipelineLocked.value) return
  // Keep upload timing; fresh summarize and visualize timings will be recorded
  delete pipeline.stageTimings.summarize
  delete pipeline.stageTimings.visualize
  pipeline.completedAt = null
  pipeline.results = {
    ...pipeline.results,
    summary: '',
    keywords: [],
    mindmap_svg: '',
    mindmap_html: ''
  }
  await runSummarize()
}

const rerunVisualize = async () => {
  if (isPipelineLocked.value) return
  // Keep upload + summarize timings; fresh visualize timing will be recorded
  delete pipeline.stageTimings.visualize
  pipeline.completedAt = null
  pipeline.results = {
    ...pipeline.results,
    mindmap_svg: '',
    mindmap_html: ''
  }
  await runVisualize()
}

onMounted(() => {
  if (pipeline.status === 'running') {
    beginProcessingLock()
  } else if (pipeline.status === 'done' || pipeline.status === 'error') {
    releaseProcessingLock()
  }
  recoverPipelineAfterRefresh()
  timeTickInterval = setInterval(() => {
    if (pipeline.status === 'running') {
      currentTime.value = Date.now()
    }
  }, 1000)
})
</script>
