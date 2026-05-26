/**
 * useJobStatus – shared helpers for job status display.
 *
 * Consolidates logic that was previously duplicated in Home.vue, History.vue,
 * HistoryDetail.vue, and ShareDetail.vue.
 */

const STATUS_CLASSES = {
  done:       'bg-emerald-100 text-emerald-700',
  completed:  'bg-emerald-100 text-emerald-700',
  error:      'bg-red-100 text-red-700',
  failed:     'bg-red-100 text-red-700',
  running:    'bg-indigo-100 text-indigo-700',
  processing: 'bg-indigo-100 text-indigo-700',
  pending:    'bg-amber-100 text-amber-700',
}

const DEFAULT_STATUS_CLASS = 'bg-slate-100 text-slate-600'

/**
 * Normalise a job status value that may be a plain string or an object
 * whose values represent per-step statuses (e.g. { transcribe, summarize, visualize }).
 *
 * Returns the most representative string status.
 */
export function extractStatusString(status) {
  if (typeof status === 'string') return status
  if (status && typeof status === 'object') {
    return status.visualize || status.summarize || status.transcribe || 'unknown'
  }
  return 'unknown'
}

/** Returns a Tailwind CSS class string for the given status value. */
export function statusClass(status) {
  const key = String(extractStatusString(status)).toLowerCase()
  return STATUS_CLASSES[key] ?? DEFAULT_STATUS_CLASS
}

/** Returns an uppercase display string for the given status value. */
export function displayStatus(status) {
  return String(extractStatusString(status)).toUpperCase()
}

/**
 * Format an ISO date string for display using the user's locale.
 * Falls back to the original string on parse failure.
 */
export function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

/** Composable wrapper – returns all helpers for use inside `<script setup>`. */
export function useJobStatus() {
  return { extractStatusString, statusClass, displayStatus, formatDate }
}
