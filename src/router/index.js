import { createRouter, createWebHistory } from 'vue-router'
import { useAppStore } from '../stores/appStore'

const routes = [
  {
    path: '/login',
    component: () => import('../views/Login.vue'),
    meta: { title: 'Sign In' }
  },
  {
    path: '/',
    component: () => import('../views/Home.vue'),
    meta: { requiresAuth: true, title: 'Pipeline' }
  },
  {
    path: '/history',
    component: () => import('../views/History.vue'),
    meta: { requiresAuth: true, title: 'History' }
  },
  {
    path: '/settings',
    component: () => import('../views/Settings.vue'),
    meta: { requiresAuth: true, title: 'Settings' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach((to, from, next) => {
  const { state } = useAppStore()

  if (to.meta.requiresAuth && !state.token) {
    next('/login')
  } else if (to.path === '/login' && state.token) {
    next('/')
  } else {
    next()
  }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} — Audio Intelligence` : 'Audio Intelligence'
})

export default router
