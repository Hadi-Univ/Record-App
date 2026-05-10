import { nextTick } from 'vue'

const REVEAL_SELECTOR = '[data-reveal]'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const MAX_REVEAL_DELAY_MS = 500
let sharedObserver = null

export function useScrollReveal() {
  const markVisible = (element) => {
    element.classList.add('is-visible')
  }

  const ensureObserver = () => {
    if (sharedObserver || typeof window === 'undefined' || !('IntersectionObserver' in window)) return sharedObserver

    sharedObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        markVisible(entry.target)
        sharedObserver?.unobserve(entry.target)
      })
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -8% 0px'
    })

    return sharedObserver
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
        element.style.setProperty('--reveal-delay', `${Math.min(delay, MAX_REVEAL_DELAY_MS)}ms`)
      } else {
        element.style.removeProperty('--reveal-delay')
      }

      activeObserver.observe(element)
    })
  }

  const disconnectReveals = () => {
    sharedObserver?.disconnect()
    sharedObserver = null
  }

  return {
    observeReveals,
    disconnectReveals
  }
}
