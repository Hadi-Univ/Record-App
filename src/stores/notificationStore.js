import { reactive } from 'vue'

const state = reactive({
  items: []
})

const push = ({ type = 'info', message = '', timeoutMs = 4500 } = {}) => {
  if (!String(message || '').trim()) return ''
  const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  state.items.push({ id, type, message: String(message), timeoutMs })
  if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
    setTimeout(() => remove(id), timeoutMs)
  }
  return id
}

const remove = (id) => {
  const index = state.items.findIndex(item => item.id === id)
  if (index >= 0) state.items.splice(index, 1)
}

const clear = () => {
  state.items.splice(0, state.items.length)
}

export const useNotificationStore = () => ({
  state,
  push,
  remove,
  clear
})
