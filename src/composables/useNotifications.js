import { useNotificationStore } from '../stores/notificationStore'

export function useNotifications() {
  const store = useNotificationStore()

  const notifyInfo = (message, options = {}) => store.push({ type: 'info', message, ...options })
  const notifyWarning = (message, options = {}) => store.push({ type: 'warning', message, ...options })
  const notifyError = (message, options = {}) => store.push({ type: 'error', message, ...options })

  return {
    notifications: store.state.items,
    notifyInfo,
    notifyWarning,
    notifyError,
    dismissNotification: store.remove,
    clearNotifications: store.clear,
  }
}
