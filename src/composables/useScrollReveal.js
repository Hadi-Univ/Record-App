import { nextTick, onBeforeUnmount } from 'vue'

const REVEAL_SELECTOR = '[data-reveal]'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export function useScrollReveal() {
  let observer = null

  const markVisible = (element) => {
    element.classList.add('is-visible')
  }

  const ensureObserver = () => {
    if (observer || typeof window === 'undefined' || !('IntersectionObserver' in window)) return observer

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        markVisible(entry.target)
        observer?.unobserve(entry.target)
      })
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -8% 0px'
    })

    return observer
  }

  const observeReveals = async (root = document) => {
    if (typeof window === 'undefined' || !root) return

    await nextTick()

    const elements = Array.from(root.querySelectorAll(REVEAL_SELECTOR))
    if (!elements.length) return

    const reduceMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches
    if (reduceMotion) {
      elements.forEach((element) => markVisible(element))
      return
    }

    const activeObserver = ensureObserver()
    if (!activeObserver) {
      elements.forEach((element) => markVisible(element))
      return
    }

    elements.forEach((element) => {
      if (element.classList.contains('is-visible')) return
      element.classList.add('motion-reveal')

      const delay = Number(element.dataset.revealDelay || 0)
      if (Number.isFinite(delay) && delay > 0) {
        element.style.setProperty('--reveal-delay', `${Math.min(delay, 500)}ms`)
      } else {
        element.style.removeProperty('--reveal-delay')
      }

      activeObserver.observe(element)
    })
  }

  const disconnectReveals = () => {
    observer?.disconnect()
    observer = null
  }

  onBeforeUnmount(() => {
    disconnectReveals()
  })

  return {
    observeReveals,
    disconnectReveals
  }
}
