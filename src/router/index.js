import { createRouter, createWebHashHistory } from 'vue-router'
import { useAppStore } from '../stores/appStore'
import { updateSeoForRoute } from '../services/seo'
import { isNativeOffline, validateRuntimeCapabilities } from '../services/authService'
import { canBypassCapabilityCheck } from './offlineAccess'

const routes = [
  {
    path: '/login',
    component: () => import('../views/Login.vue'),
    meta: { title: 'Sign In', depth: 0 }
  },
  {
    path: '/signup',
    component: () => import('../views/Signup.vue'),
    meta: { title: 'Create Account', depth: 0 }
  },
  {
    path: '/forgot-password',
    component: () => import('../views/ForgotPassword.vue'),
    meta: { title: 'Forgot Password', depth: 0 }
  },
  {
    path: '/reset-password',
    component: () => import('../views/ResetPassword.vue'),
    meta: { title: 'Reset Password', depth: 0 }
  },
  {
    path: '/share/:shareId',
    component: () => import('../views/ShareDetail.vue'),
    meta: { title: 'Shared Detail', depth: 0 }
  },
  {
    path: '/',
    component: () => import('../views/Home.vue'),
    meta: { requiresAuth: true, title: 'Home', depth: 1 }
  },
  {
    path: '/pipeline',
    component: () => import('../views/PipelineLauncher.vue'),
    meta: { requiresAuth: true, title: 'Pipeline', depth: 2 }
  },
  {
    path: '/history',
    component: () => import('../views/History.vue'),
    meta: { requiresAuth: true, title: 'History', depth: 2 }
  },
  {
    path: '/history/:folderName',
    component: () => import('../views/HistoryDetail.vue'),
    meta: { requiresAuth: true, title: 'History Detail', depth: 2 }
  },
  {
    path: '/settings',
    component: () => import('../views/Settings.vue'),
    meta: { requiresAuth: true, title: 'Settings', depth: 3 }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password']

router.beforeEach(async (to) => {
  const store = useAppStore()
  const { state } = store

  if (to.path.startsWith('/share/')) {
    return true
  }
  if (to.meta.requiresAuth && !state.token) {
    return '/login'
  }
  if (PUBLIC_PATHS.includes(to.path) && state.token) {
    return '/'
  }
  if (to.meta.requiresAuth && state.token) {
    if (canBypassCapabilityCheck(to.path, isNativeOffline())) {
      return true
    }
    if (to.path === '/') {
      return true
    }
    const stale = !state.capabilities.checkedAt || (Date.now() - state.capabilities.checkedAt) > 60_000
    if (stale) {
      try {
        const payload = await validateRuntimeCapabilities()
        if (!payload?.ready) {
          state.capabilities.error = (payload?.checks || []).filter(c => !c.ok).map(c => c.message).join(' ')
          store.beginBackendBootstrap({
            title: 'Preparing workspace…',
            message: state.capabilities.error || 'Waiting for the backend to finish starting.'
          })
          return '/'
        }
      } catch (err) {
        if (err?.status === 401 || err?.status === 403) {
          state.capabilities.error = err.message || 'Capability validation failed.'
          return '/login'
        }
        state.capabilities.error = err.message || 'Capability validation failed.'
        store.beginBackendBootstrap({
          title: 'Preparing workspace…',
          message: state.capabilities.error || 'Waiting for the backend to finish starting.'
        })
        return '/'
      }
    } else if (!state.capabilities.ready) {
      store.beginBackendBootstrap({
        title: 'Preparing workspace…',
        message: state.capabilities.error || 'Waiting for the backend to finish starting.'
      })
      return '/'
    }
  }
  return true
})

router.afterEach((to) => {
  updateSeoForRoute(to)
})

export default router
