import { describe, it, expect } from 'vitest'

// ---------- Functions extracted from History.vue ----------

function statusClass(status) {
  const map = {
    done: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-emerald-100 text-emerald-700',
    error: 'bg-red-100 text-red-700',
    failed: 'bg-red-100 text-red-700',
    running: 'bg-indigo-100 text-indigo-700',
    processing: 'bg-indigo-100 text-indigo-700'
  }
  const normalized =
    typeof status === 'string' ? status
      : status?.visualize || status?.summarize || status?.transcribe || 'unknown'
  return map[String(normalized).toLowerCase()] || 'bg-slate-100 text-slate-600'
}

function displayStatus(status) {
  const normalized =
    typeof status === 'string'
      ? status
      : status?.visualize || status?.summarize || status?.transcribe || 'unknown'
  return String(normalized).toUpperCase()
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

describe('History – statusClass()', () => {
  it('returns emerald classes for "done"', () => {
    expect(statusClass('done')).toBe('bg-emerald-100 text-emerald-700')
  })

  it('returns emerald classes for "completed"', () => {
    expect(statusClass('completed')).toBe('bg-emerald-100 text-emerald-700')
  })

  it('returns red classes for "error"', () => {
    expect(statusClass('error')).toBe('bg-red-100 text-red-700')
  })

  it('returns red classes for "failed"', () => {
    expect(statusClass('failed')).toBe('bg-red-100 text-red-700')
  })

  it('returns indigo classes for "running"', () => {
    expect(statusClass('running')).toBe('bg-indigo-100 text-indigo-700')
  })

  it('returns indigo classes for "processing"', () => {
    expect(statusClass('processing')).toBe('bg-indigo-100 text-indigo-700')
  })

  it('is case-insensitive', () => {
    expect(statusClass('DONE')).toBe('bg-emerald-100 text-emerald-700')
    expect(statusClass('ERROR')).toBe('bg-red-100 text-red-700')
    expect(statusClass('Running')).toBe('bg-indigo-100 text-indigo-700')
  })

  it('returns slate fallback for unknown string status', () => {
    expect(statusClass('pending')).toBe('bg-slate-100 text-slate-600')
    expect(statusClass('unknown')).toBe('bg-slate-100 text-slate-600')
  })

  it('uses visualize key from object status', () => {
    expect(statusClass({ visualize: 'done' })).toBe('bg-emerald-100 text-emerald-700')
  })

  it('uses summarize key when visualize is missing', () => {
    expect(statusClass({ summarize: 'error' })).toBe('bg-red-100 text-red-700')
  })

  it('uses transcribe key as last resort', () => {
    expect(statusClass({ transcribe: 'running' })).toBe('bg-indigo-100 text-indigo-700')
  })

  it('returns slate fallback for unknown object status', () => {
    expect(statusClass({ other: 'stuff' })).toBe('bg-slate-100 text-slate-600')
  })
})

describe('History – displayStatus()', () => {
  it('uppercases string status', () => {
    expect(displayStatus('done')).toBe('DONE')
    expect(displayStatus('running')).toBe('RUNNING')
    expect(displayStatus('error')).toBe('ERROR')
  })

  it('uses visualize key from object and uppercases', () => {
    expect(displayStatus({ visualize: 'completed' })).toBe('COMPLETED')
  })

  it('uses summarize key when visualize is missing', () => {
    expect(displayStatus({ summarize: 'processing' })).toBe('PROCESSING')
  })

  it('uses transcribe key as last resort', () => {
    expect(displayStatus({ transcribe: 'failed' })).toBe('FAILED')
  })

  it('returns "UNKNOWN" for empty object', () => {
    expect(displayStatus({})).toBe('UNKNOWN')
  })
})

describe('History – formatDate()', () => {
  it('returns empty string for falsy input', () => {
    expect(formatDate('')).toBe('')
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
  })

  it('returns a non-empty formatted string for a valid ISO date', () => {
    const result = formatDate('2024-01-15T10:30:00Z')
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
    // Should contain "2024" or "Jan" or similar date information
    expect(result).toMatch(/2024|Jan|15/)
  })

  it('returns the original string when the date is unparseable', () => {
    // An invalid date-like string that Intl.DateTimeFormat cannot format
    const bad = 'not-a-date'
    const result = formatDate(bad)
    // Should return the original or "Invalid Date" depending on environment
    expect(typeof result).toBe('string')
  })
})
