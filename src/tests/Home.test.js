import { describe, it, expect } from 'vitest'

// ---------- Functions extracted from Home.vue ----------

function statusBadgeClass(status) {
  if (status === 'running') return 'bg-indigo-100 text-indigo-700'
  if (status === 'error') return 'bg-red-100 text-red-700'
  if (status === 'done') return 'bg-emerald-100 text-emerald-700'
  return 'bg-slate-100 text-slate-500'
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

describe('Home – statusBadgeClass()', () => {
  it('returns indigo classes for "running" status', () => {
    expect(statusBadgeClass('running')).toBe('bg-indigo-100 text-indigo-700')
  })

  it('returns red classes for "error" status', () => {
    expect(statusBadgeClass('error')).toBe('bg-red-100 text-red-700')
  })

  it('returns emerald classes for "done" status', () => {
    expect(statusBadgeClass('done')).toBe('bg-emerald-100 text-emerald-700')
  })

  it('returns slate classes for "idle" status', () => {
    expect(statusBadgeClass('idle')).toBe('bg-slate-100 text-slate-500')
  })

  it('returns slate classes for unknown status', () => {
    expect(statusBadgeClass('pending')).toBe('bg-slate-100 text-slate-500')
    expect(statusBadgeClass('')).toBe('bg-slate-100 text-slate-500')
    expect(statusBadgeClass(undefined)).toBe('bg-slate-100 text-slate-500')
  })
})

describe('Home – formatSize()', () => {
  it('formats bytes under 1 KB as "N B"', () => {
    expect(formatSize(0)).toBe('0 B')
    expect(formatSize(512)).toBe('512 B')
    expect(formatSize(1023)).toBe('1023 B')
  })

  it('formats bytes in KB range with one decimal', () => {
    expect(formatSize(1024)).toBe('1.0 KB')
    expect(formatSize(1536)).toBe('1.5 KB')
    expect(formatSize(1024 * 1023)).toBe('1023.0 KB')
  })

  it('formats bytes in MB range with one decimal', () => {
    expect(formatSize(1024 * 1024)).toBe('1.0 MB')
    expect(formatSize(1024 * 1024 * 2.5)).toBe('2.5 MB')
    expect(formatSize(1024 * 1024 * 10)).toBe('10.0 MB')
  })
})
