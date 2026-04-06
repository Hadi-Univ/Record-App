import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NavIcon from '../components/NavIcon.vue'

describe('NavIcon', () => {
  it('renders an SVG element', () => {
    const wrapper = mount(NavIcon, { props: { name: 'home' } })
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('renders home icon path when name is "home"', () => {
    const wrapper = mount(NavIcon, { props: { name: 'home' } })
    // The home icon has a distinctive path fragment
    const paths = wrapper.findAll('path')
    expect(paths.length).toBeGreaterThan(0)
    const homePathD = paths[0].attributes('d')
    expect(homePathD).toContain('M3 12l2-2')
  })

  it('renders history icon path when name is "history"', () => {
    const wrapper = mount(NavIcon, { props: { name: 'history' } })
    const paths = wrapper.findAll('path')
    expect(paths.length).toBeGreaterThan(0)
    // History icon has a clock/circle path
    const historyPathD = paths[0].attributes('d')
    expect(historyPathD).toContain('M12 8v4l3 3')
  })

  it('renders settings icon paths when name is "settings"', () => {
    const wrapper = mount(NavIcon, { props: { name: 'settings' } })
    const paths = wrapper.findAll('path')
    // Settings icon has two paths (gear + inner circle)
    expect(paths.length).toBe(2)
    const gearPath = paths[0].attributes('d')
    expect(gearPath).toContain('M10.325 4.317')
  })

  it('renders no path for unknown icon name', () => {
    const wrapper = mount(NavIcon, { props: { name: 'unknown' } })
    const paths = wrapper.findAll('path')
    expect(paths.length).toBe(0)
  })

  it('SVG has correct view box and dimensions', () => {
    const wrapper = mount(NavIcon, { props: { name: 'home' } })
    const svg = wrapper.find('svg')
    expect(svg.attributes('viewBox')).toBe('0 0 24 24')
    expect(svg.classes()).toContain('w-5')
    expect(svg.classes()).toContain('h-5')
  })
})
