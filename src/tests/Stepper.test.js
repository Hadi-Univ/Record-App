import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Stepper from '../components/Stepper.vue'

const steps = [
  { id: 1, label: 'Upload' },
  { id: 2, label: 'Transcribe' },
  { id: 3, label: 'Summarize' },
  { id: 4, label: 'Visualize' }
]

describe('Stepper – step state helpers', () => {
  // Test the isCompleted / isActive / stepCircleClass / stepLabelClass logic
  // by inspecting the rendered markup with different prop combinations.

  it('renders all four step labels', () => {
    const wrapper = mount(Stepper, { props: { currentStep: 1 } })
    for (const step of steps) {
      expect(wrapper.text()).toContain(step.label)
    }
  })

  it('shows step numbers for future steps', () => {
    const wrapper = mount(Stepper, { props: { currentStep: 1 } })
    // Steps 2, 3, 4 are future – they should show their numeric id
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('4')
  })

  it('completed steps have emerald circle class', () => {
    const wrapper = mount(Stepper, { props: { currentStep: 3 } })
    // Steps 1 and 2 are completed (id < currentStep)
    const circles = wrapper.findAll('.rounded-full')
    // Step 1 (index 0)
    expect(circles[0].classes()).toContain('bg-emerald-500')
    // Step 2 (index 1)
    expect(circles[1].classes()).toContain('bg-emerald-500')
  })

  it('active step has indigo circle class', () => {
    const wrapper = mount(Stepper, { props: { currentStep: 2 } })
    const circles = wrapper.findAll('.rounded-full')
    // Step 2 (index 1) is active
    expect(circles[1].classes()).toContain('bg-indigo-600')
  })

  it('future steps have slate circle class', () => {
    const wrapper = mount(Stepper, { props: { currentStep: 1 } })
    const circles = wrapper.findAll('.rounded-full')
    // Steps 2, 3, 4 (indices 1, 2, 3) are future
    expect(circles[1].classes()).toContain('bg-slate-200')
    expect(circles[2].classes()).toContain('bg-slate-200')
    expect(circles[3].classes()).toContain('bg-slate-200')
  })

  it('completed steps have emerald label class', () => {
    const wrapper = mount(Stepper, { props: { currentStep: 3 } })
    const labels = wrapper.findAll('span.font-semibold')
    expect(labels[0].classes()).toContain('text-emerald-600')
    expect(labels[1].classes()).toContain('text-emerald-600')
  })

  it('active step has indigo label class', () => {
    const wrapper = mount(Stepper, { props: { currentStep: 2 } })
    const labels = wrapper.findAll('span.font-semibold')
    expect(labels[1].classes()).toContain('text-indigo-600')
  })

  it('future steps have slate label class', () => {
    const wrapper = mount(Stepper, { props: { currentStep: 1 } })
    const labels = wrapper.findAll('span.font-semibold')
    expect(labels[1].classes()).toContain('text-slate-400')
    expect(labels[2].classes()).toContain('text-slate-400')
  })

  it('renders a checkmark SVG for completed steps', () => {
    const wrapper = mount(Stepper, { props: { currentStep: 3 } })
    // Steps 1 and 2 are complete – each should have a checkmark path
    const paths = wrapper.findAll('path[d*="M5 13l4 4L19 7"]')
    expect(paths.length).toBe(2)
  })

  it('renders a spinner SVG for active running step', () => {
    const wrapper = mount(Stepper, { props: { currentStep: 2, isRunning: true } })
    const spinners = wrapper.findAll('.animate-spin')
    expect(spinners.length).toBeGreaterThan(0)
  })

  it('active running step has ring class', () => {
    const wrapper = mount(Stepper, { props: { currentStep: 2, isRunning: true } })
    const circles = wrapper.findAll('.rounded-full')
    expect(circles[1].classes()).toContain('ring-4')
  })

  it('does NOT show a spinner when isRunning is false', () => {
    const wrapper = mount(Stepper, { props: { currentStep: 2, isRunning: false } })
    const spinners = wrapper.findAll('.animate-spin')
    expect(spinners.length).toBe(0)
  })

  it('connector lines have emerald class for completed steps', () => {
    const wrapper = mount(Stepper, { props: { currentStep: 3 } })
    // There are 3 connectors (between 4 steps). First two connect completed steps.
    const connectors = wrapper.findAll('.h-0\\.5')
    expect(connectors[0].classes()).toContain('bg-emerald-400')
    expect(connectors[1].classes()).toContain('bg-emerald-400')
  })

  it('connector lines have slate class for upcoming steps', () => {
    const wrapper = mount(Stepper, { props: { currentStep: 1 } })
    const connectors = wrapper.findAll('.h-0\\.5')
    for (const c of connectors) {
      expect(c.classes()).toContain('bg-slate-200')
    }
  })
})

describe('Stepper – isCompleted / isActive logic', () => {
  // Test the pure logic directly by mounting with known props and inspecting DOM.

  it('step 1 is completed when currentStep is 2', () => {
    const wrapper = mount(Stepper, { props: { currentStep: 2 } })
    const circles = wrapper.findAll('.rounded-full')
    expect(circles[0].classes()).toContain('bg-emerald-500')
  })

  it('step 4 is active at currentStep 4', () => {
    const wrapper = mount(Stepper, { props: { currentStep: 4 } })
    const circles = wrapper.findAll('.rounded-full')
    expect(circles[3].classes()).toContain('bg-indigo-600')
  })

  it('all previous steps are completed when at step 4', () => {
    const wrapper = mount(Stepper, { props: { currentStep: 4 } })
    const circles = wrapper.findAll('.rounded-full')
    expect(circles[0].classes()).toContain('bg-emerald-500')
    expect(circles[1].classes()).toContain('bg-emerald-500')
    expect(circles[2].classes()).toContain('bg-emerald-500')
  })
})
