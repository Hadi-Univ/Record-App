import { env } from '../config/env'

const SITE_NAME = 'Record Note'
const FALLBACK_DESCRIPTION = 'Record Note helps you transcribe, summarize, and organize recordings with a fast AI-powered workflow.'
const DEFAULT_IMAGE = '/favicon.svg'

const ROUTE_META = {
  '/': {
    title: 'Home',
    description: 'Track recent recording jobs and continue your transcription pipeline quickly.'
  },
  '/pipeline': {
    title: 'Pipeline',
    description: 'Upload or record audio, transcribe it, and generate summaries with an end-to-end workflow.'
  },
  '/history': {
    title: 'History',
    description: 'Browse processed recordings, open details, and download generated artifacts.'
  },
  '/settings': {
    title: 'Settings',
    description: 'Manage language, model provider, and backend connection settings.'
  },
  '/login': {
    title: 'Sign In',
    description: 'Sign in securely to access your recording workspace.'
  },
  '/signup': {
    title: 'Create Account',
    description: 'Create a Record Note account to start managing recording pipelines.'
  },
  '/forgot-password': {
    title: 'Forgot Password',
    description: 'Request a password reset link to recover access to your account.'
  },
  '/reset-password': {
    title: 'Reset Password',
    description: 'Set a new password and return to your recording workflow.'
  }
}

const ensureMeta = (selector, attrs) => {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))
    document.head.appendChild(el)
  }
  return el
}

const ensureCanonicalLink = () => {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  return el
}

const stripHashPath = (fullPath) => {
  const [pathPart] = String(fullPath || '/').split(/[?#]/)
  return pathPart || '/'
}

const resolveCanonicalUrl = (path) => {
  if (!env.siteUrl) return ''
  if (path === '/') return `${env.siteUrl}/`
  return `${env.siteUrl}${path}`
}

export const updateSeoForRoute = (to) => {
  if (typeof document === 'undefined') return

  const normalizedPath = stripHashPath(to?.path || to?.fullPath || '/')
  const routeConfig = ROUTE_META[normalizedPath] || {}
  const titlePart = routeConfig.title || to?.meta?.title || 'Record Note'
  const description = routeConfig.description || FALLBACK_DESCRIPTION

  document.title = `${titlePart} — ${SITE_NAME}`

  const canonical = resolveCanonicalUrl(normalizedPath)
  if (canonical) {
    ensureCanonicalLink().setAttribute('href', canonical)
  }

  ensureMeta('meta[name="description"]', { name: 'description' }).setAttribute('content', description)
  ensureMeta('meta[property="og:title"]', { property: 'og:title' }).setAttribute('content', `${titlePart} — ${SITE_NAME}`)
  ensureMeta('meta[property="og:description"]', { property: 'og:description' }).setAttribute('content', description)
  ensureMeta('meta[property="og:type"]', { property: 'og:type' }).setAttribute('content', 'website')
  ensureMeta('meta[property="og:image"]', { property: 'og:image' }).setAttribute('content', DEFAULT_IMAGE)
  ensureMeta('meta[property="og:url"]', { property: 'og:url' }).setAttribute('content', canonical || normalizedPath)
  ensureMeta('meta[name="twitter:card"]', { name: 'twitter:card' }).setAttribute('content', 'summary_large_image')
  ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title' }).setAttribute('content', `${titlePart} — ${SITE_NAME}`)
  ensureMeta('meta[name="twitter:description"]', { name: 'twitter:description' }).setAttribute('content', description)
  ensureMeta('meta[name="twitter:image"]', { name: 'twitter:image' }).setAttribute('content', DEFAULT_IMAGE)
}
