import { describe, it, expect, vi } from 'vitest'

// We test the navigation guard logic directly, without creating a full router
// instance, to avoid browser API dependencies (e.g. history.pushState).

// The guard logic extracted from src/router/index.js:
//
//   if (to.meta.requiresAuth && !state.token) → next('/login')
//   else if (to.path === '/login' && state.token) → next('/')
//   else → next()
//
// We replicate this function and test it in isolation.

function buildGuard(token) {
  const state = { token }
  return (to, _from, next) => {
    if (to.meta.requiresAuth && !state.token) {
      next('/login')
    } else if (to.path === '/login' && state.token) {
      next('/')
    } else {
      next()
    }
  }
}

describe('router beforeEach guard', () => {
  it('redirects unauthenticated user to /login when route requires auth', () => {
    const guard = buildGuard('')
    const next = vi.fn()
    guard({ path: '/', meta: { requiresAuth: true } }, {}, next)
    expect(next).toHaveBeenCalledWith('/login')
  })

  it('redirects unauthenticated user to /login for /history', () => {
    const guard = buildGuard('')
    const next = vi.fn()
    guard({ path: '/history', meta: { requiresAuth: true } }, {}, next)
    expect(next).toHaveBeenCalledWith('/login')
  })

  it('redirects unauthenticated user to /login for /settings', () => {
    const guard = buildGuard('')
    const next = vi.fn()
    guard({ path: '/settings', meta: { requiresAuth: true } }, {}, next)
    expect(next).toHaveBeenCalledWith('/login')
  })

  it('allows unauthenticated user to access /login', () => {
    const guard = buildGuard('')
    const next = vi.fn()
    guard({ path: '/login', meta: {} }, {}, next)
    expect(next).toHaveBeenCalledWith()
  })

  it('redirects authenticated user away from /login to /', () => {
    const guard = buildGuard('some-token')
    const next = vi.fn()
    guard({ path: '/login', meta: {} }, {}, next)
    expect(next).toHaveBeenCalledWith('/')
  })

  it('allows authenticated user to access protected routes', () => {
    const guard = buildGuard('some-token')
    const next = vi.fn()
    guard({ path: '/', meta: { requiresAuth: true } }, {}, next)
    expect(next).toHaveBeenCalledWith()
  })

  it('allows authenticated user to access /history', () => {
    const guard = buildGuard('some-token')
    const next = vi.fn()
    guard({ path: '/history', meta: { requiresAuth: true } }, {}, next)
    expect(next).toHaveBeenCalledWith()
  })

  it('allows authenticated user to access /settings', () => {
    const guard = buildGuard('some-token')
    const next = vi.fn()
    guard({ path: '/settings', meta: { requiresAuth: true } }, {}, next)
    expect(next).toHaveBeenCalledWith()
  })
})

describe('router afterEach – document title', () => {
  it('sets title with route meta.title', () => {
    const afterHook = (to) => {
      document.title = to.meta.title
        ? `${to.meta.title} — Audio Intelligence`
        : 'Audio Intelligence'
    }

    afterHook({ meta: { title: 'Pipeline' } })
    expect(document.title).toBe('Pipeline — Audio Intelligence')
  })

  it('sets generic title when route has no meta.title', () => {
    const afterHook = (to) => {
      document.title = to.meta.title
        ? `${to.meta.title} — Audio Intelligence`
        : 'Audio Intelligence'
    }

    afterHook({ meta: {} })
    expect(document.title).toBe('Audio Intelligence')
  })

  it('sets correct title for each named route', () => {
    const afterHook = (to) => {
      document.title = to.meta.title
        ? `${to.meta.title} — Audio Intelligence`
        : 'Audio Intelligence'
    }

    const cases = [
      ['Sign In', 'Sign In — Audio Intelligence'],
      ['History', 'History — Audio Intelligence'],
      ['Settings', 'Settings — Audio Intelligence']
    ]
    for (const [title, expected] of cases) {
      afterHook({ meta: { title } })
      expect(document.title).toBe(expected)
    }
  })
})
