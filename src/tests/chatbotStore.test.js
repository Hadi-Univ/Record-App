import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../services/chatbotApi.js', () => ({
  fetchChatbotSessions: vi.fn().mockResolvedValue({ sessions: [{ session_id: 's1', title: 'Conversation' }] }),
  fetchChatbotSession: vi.fn().mockResolvedValue({ messages: [{ role: 'assistant', content: 'hello' }] }),
  sendChatbotMessage: vi.fn().mockResolvedValue({
    session_id: 's1',
    session: { messages: [{ role: 'user', content: 'q' }, { role: 'assistant', content: 'a' }] }
  }),
  createChatbotSession: vi.fn().mockResolvedValue({ session_id: 's2', title: 'New' }),
  deleteChatbotSession: vi.fn().mockResolvedValue({ deleted: true })
}))

vi.mock('../composables/useNotifications', () => ({
  useNotifications: () => ({
    notifyInfo: vi.fn(),
    notifyWarning: vi.fn(),
    notifyError: vi.fn(),
    dismissNotification: vi.fn(),
    clearNotifications: vi.fn(),
    notifications: []
  })
}))

describe('chatbotStore', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('loads sessions and selects active messages', async () => {
    const { useChatbotStore } = await import('../stores/chatbotStore.js')
    const store = useChatbotStore()
    await store.loadSessions('job_1', { autoSelect: true })
    const state = store.ensureHistoryState('job_1')
    expect(state.sessions.length).toBe(1)
    expect(state.messages.length).toBe(1)
  })

  it('keeps prior chat stable and sets security warning when unsafe prompt is blocked', async () => {
    const chatbotApi = await import('../services/chatbotApi.js')
    chatbotApi.sendChatbotMessage.mockRejectedValueOnce({
      status: 422,
      message: 'Chat request failed',
      payload: {
        detail: {
          success: false,
          error: {
            type: 'prompt_injection_detected',
            message: 'Unsafe instruction detected'
          }
        }
      }
    })

    const { useChatbotStore } = await import('../stores/chatbotStore.js')
    const store = useChatbotStore()
    const state = store.ensureHistoryState('job_1')
    state.messages = [{ message_id: 'm-1', role: 'assistant', content: 'existing' }]

    await expect(store.sendMessage('job_1', 'unsafe prompt')).rejects.toBeTruthy()

    expect(state.sending).toBe(false)
    expect(state.messages).toEqual([{ message_id: 'm-1', role: 'assistant', content: 'existing' }])
    expect(state.securityWarning).toContain('Potential unsafe prompt detected')
    expect(state.error).toBe('')
  })
})
