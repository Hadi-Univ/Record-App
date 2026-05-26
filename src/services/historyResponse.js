import { extractStatusString } from '../composables/useJobStatus.js'

const toJobsArray = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.jobs)) return payload.jobs
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

const buildSummaryFallback = (jobs) => {
  const normalizedJobs = Array.isArray(jobs) ? jobs : []
  return {
    totalJobs: normalizedJobs.length,
    completedJobs: normalizedJobs.filter((job) =>
      ['done', 'completed'].includes(String(extractStatusString(job?.status)).toLowerCase())
    ).length,
    pendingJobs: normalizedJobs.filter((job) =>
      String(extractStatusString(job?.status)).toLowerCase() === 'pending'
    ).length,
    recentJobs: normalizedJobs.slice(0, 5)
  }
}

export function normalizeHistoryResponse(payload) {
  const jobs = toJobsArray(payload)
  const backendSummary = payload && !Array.isArray(payload) ? payload.summary : null
  const fallback = buildSummaryFallback(jobs)

  return {
    jobs,
    pagination: payload && !Array.isArray(payload) && payload.pagination ? payload.pagination : null,
    summary: {
      totalJobs: Number(backendSummary?.total_jobs) || fallback.totalJobs,
      completedJobs: Number(backendSummary?.completed_jobs) || fallback.completedJobs,
      pendingJobs: Number(backendSummary?.pending_jobs) || fallback.pendingJobs,
      recentJobs: Array.isArray(backendSummary?.recent_jobs)
        ? backendSummary.recent_jobs
        : fallback.recentJobs
    }
  }
}
