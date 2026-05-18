<template>
  <div class="relative rounded-xl overflow-hidden" style="height: 128px; background: #0f172a;">
    <canvas ref="canvasRef" class="absolute inset-0 w-full h-full" />
    <!-- REC badge overlay -->
    <div class="absolute top-2 left-3 flex items-center gap-1.5 pointer-events-none">
      <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
      <span class="text-[10px] font-bold tracking-widest text-white/70 uppercase">{{ t('pipeline.recBadge') }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from '../i18n/index.js'

const props = defineProps({
  stream: { type: Object, default: null },
  active: { type: Boolean, default: false }
})
const { t } = useI18n()

const canvasRef = ref(null)

let audioCtx = null
let analyser = null
let sourceNode = null
let rafId = null

const BAR_COUNT = 60
// Lerp weight per frame: higher = more responsive, lower = smoother (0.28 ≈ ~3-frame lag)
const SMOOTH_FACTOR = 0.28
const PEAK_HOLD_FRAMES = 50
const PEAK_FALL = 0.007

// Bar gradient stops: [colorStop, rgba string template (v = normalized amplitude 0-1)]
const GRADIENT_STOPS = [
  { pos: 0,    color: (v) => `rgba(79,70,229,${(0.65 + v * 0.35).toFixed(2)})` },   // indigo-600
  { pos: 0.45, color: (v) => `rgba(139,92,246,${(0.75 + v * 0.25).toFixed(2)})` },  // violet-500
  { pos: 1,    color: (v) => `rgba(34,211,238,${(0.85 + v * 0.15).toFixed(2)})` },  // cyan-400
]
const GLOW_COLOR = '#818cf8'         // indigo-400 glow
const PEAK_COLOR = 'rgba(224,231,255,0.88)' // indigo-100 peak dot
const PEAK_GLOW  = '#c7d2fe'         // indigo-200 peak glow

let smoothed = new Float32Array(BAR_COUNT).fill(0)
let peaks = new Float32Array(BAR_COUNT).fill(0)
let peakHold = new Int32Array(BAR_COUNT).fill(0)

// Map bar index [0, BAR_COUNT) → frequency bin using logarithmic scale
// covers roughly 80 Hz – 16 kHz
const getBinIndex = (i, binCount) => {
  const minBin = 1
  const maxBin = binCount - 1
  const t = i / (BAR_COUNT - 1)
  return Math.round(minBin * Math.pow(maxBin / minBin, t))
}

const resizeCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const cssW = canvas.clientWidth
  const cssH = canvas.clientHeight
  const targetW = Math.round(cssW * dpr)
  const targetH = Math.round(cssH * dpr)
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW
    canvas.height = targetH
  }
}

const drawBackground = (ctx, W, H) => {
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
  bgGrad.addColorStop(0, '#0f172a')
  bgGrad.addColorStop(1, '#1e1b4b')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  // Subtle horizontal grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'
  ctx.lineWidth = 1
  ;[0.25, 0.5, 0.75].forEach((frac) => {
    ctx.beginPath()
    ctx.moveTo(0, H * frac)
    ctx.lineTo(W, H * frac)
    ctx.stroke()
  })
}

const drawRoundedBar = (ctx, x, y, w, h, r) => {
  if (h < r * 2) {
    ctx.fillRect(x, y, w, h)
    return
  }
  ctx.beginPath()
  ctx.moveTo(x, y + h)
  ctx.lineTo(x, y + r)
  ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5)
  ctx.lineTo(x + w - r, y)
  ctx.arc(x + w - r, y + r, r, Math.PI * 1.5, 0)
  ctx.lineTo(x + w, y + h)
  ctx.closePath()
  ctx.fill()
}

const drawFrame = () => {
  if (!analyser || !canvasRef.value) return
  rafId = requestAnimationFrame(drawFrame)

  resizeCanvas()
  const canvas = canvasRef.value
  const W = canvas.width
  const H = canvas.height
  const ctx = canvas.getContext('2d')

  drawBackground(ctx, W, H)

  const binCount = analyser.frequencyBinCount // 128
  const rawData = new Uint8Array(binCount)
  analyser.getByteFrequencyData(rawData)

  const totalSlot = W / BAR_COUNT
  const gap = Math.max(1 * (window.devicePixelRatio || 1), totalSlot * 0.15)
  const barW = totalSlot - gap
  const maxBarH = H * 0.88

  for (let i = 0; i < BAR_COUNT; i++) {
    const binIdx = getBinIndex(i, binCount)
    const raw = rawData[binIdx] / 255

    // Smooth value
    smoothed[i] += (raw - smoothed[i]) * SMOOTH_FACTOR
    const v = smoothed[i]

    const barH = Math.max(2, v * maxBarH)
    const x = i * totalSlot + gap / 2
    const y = H - barH

    // Per-bar gradient: indigo at base → violet mid → cyan at peak
    const grad = ctx.createLinearGradient(x, H, x, y)
    GRADIENT_STOPS.forEach(({ pos, color }) => grad.addColorStop(pos, color(v)))

    ctx.shadowColor = v > 0.25 ? GLOW_COLOR : 'transparent'
    ctx.shadowBlur = v > 0.25 ? 10 * v : 0
    ctx.fillStyle = grad

    drawRoundedBar(ctx, x, y, barW, barH, Math.min(barW / 2, 3))

    ctx.shadowBlur = 0

    // Peak-hold indicator
    if (v >= peaks[i]) {
      peaks[i] = v
      peakHold[i] = PEAK_HOLD_FRAMES
    } else if (peakHold[i] > 0) {
      peakHold[i]--
    } else {
      peaks[i] = Math.max(0, peaks[i] - PEAK_FALL)
    }

    if (peaks[i] > 0.04) {
      const peakY = H - Math.max(2, peaks[i] * maxBarH) - 3
      ctx.fillStyle = PEAK_COLOR
      ctx.shadowColor = PEAK_GLOW
      ctx.shadowBlur = 5
      ctx.fillRect(x, peakY, barW, 2)
      ctx.shadowBlur = 0
    }
  }
}

const setupAudio = (stream) => {
  teardown()
  if (!stream) return

  audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  analyser = audioCtx.createAnalyser()
  analyser.fftSize = 256              // frequencyBinCount = 128
  analyser.smoothingTimeConstant = 0.8

  sourceNode = audioCtx.createMediaStreamSource(stream)
  sourceNode.connect(analyser)

  smoothed.fill(0)
  peaks.fill(0)
  peakHold.fill(0)

  drawFrame()
}

const teardown = () => {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null }
  try { sourceNode && sourceNode.disconnect() } catch { /* ignore */ }
  try { audioCtx && audioCtx.close() } catch { /* ignore */ }
  sourceNode = null
  audioCtx = null
  analyser = null

  if (canvasRef.value) {
    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')
    resizeCanvas()
    drawBackground(ctx, canvas.width, canvas.height)
  }
}

watch(
  () => props.active,
  (active) => {
    if (active && props.stream) setupAudio(props.stream)
    else teardown()
  }
)

watch(
  () => props.stream,
  (stream) => {
    if (props.active && stream) setupAudio(stream)
    else if (!stream) teardown()
  }
)

onMounted(() => {
  resizeCanvas()
  if (props.active && props.stream) setupAudio(props.stream)
  else if (canvasRef.value) {
    const canvas = canvasRef.value
    drawBackground(canvas.getContext('2d'), canvas.width, canvas.height)
  }
})

onUnmounted(teardown)
</script>
