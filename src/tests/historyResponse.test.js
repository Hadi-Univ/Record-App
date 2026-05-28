import { describe, it, expect } from 'vitest'
import { normalizeHistoryResponse } from '../services/historyResponse.js'

describe('normalizeHistoryResponse', () => {
  it('uses backend-provided summary metadata when available', () => {
    const payload = {
      jobs: [{ folder_name: 'job_03', status: { visualize: 'pending' } }],
      summary: {
        total_jobs: 8,
        completed_jobs: 5,
        pending_jobs: 2,
        recent_jobs: [{ folder_name: 'job_08' }]
      }
    }

    expect(normalizeHistoryResponse(payload)).toEqual({
      jobs: [{ folder_name: 'job_03', status: { visualize: 'pending' } }],
      pagination: null,
      summary: {
        totalJobs: 8,
        completedJobs: 5,
        pendingJobs: 2,
        recentJobs: [{ folder_name: 'job_08' }]
      }
    })
  })

  it('falls back to client normalization for legacy payloads', () => {
    const payload = {
      jobs: [
        { folder_name: 'job_03', status: { visualize: 'pending' } },
        { folder_name: 'job_02', status: { summarize: 'done' } },
        { folder_name: 'job_01', status: { transcribe: 'done' } }
      ]
    }

    expect(normalizeHistoryResponse(payload).summary).toEqual({
      totalJobs: 3,
      completedJobs: 2,
      pendingJobs: 1,
      recentJobs: payload.jobs
    })
  })
})
