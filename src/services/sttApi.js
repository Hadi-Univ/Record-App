import { requestJson } from './httpClient'
import { useAppStore } from '../stores/appStore'

const store = useAppStore()

const authHeaders = () => {
  const token = (store.state.settings.configAdminToken || '').trim()
  return token ? { 'X-Config-Token': token } : {}
}

export const getSttProviders = () =>
  requestJson(`${store.getBaseUrl()}/api/v1/stt/providers`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    timeoutMs: 10000,
    retries: 0,
    errorLabel: 'Failed to load STT providers'
  })

export const getSttProviderConfig = () =>
  requestJson(`${store.getBaseUrl()}/api/v1/stt/providers/config`, {
    method: 'GET',
    headers: { Accept: 'application/json', ...authHeaders() },
    timeoutMs: 10000,
    retries: 0,
    errorLabel: 'Failed to load STT provider config'
  })

export const updateSttProviderConfig = (payload) =>
  requestJson(`${store.getBaseUrl()}/api/v1/stt/providers/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
    timeoutMs: 15000,
    retries: 0,
    errorLabel: 'Failed to update STT provider config'
  })

export const testSttProvider = (provider) =>
  requestJson(`${store.getBaseUrl()}/api/v1/stt/providers/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...authHeaders() },
    body: JSON.stringify({ provider }),
    timeoutMs: 10000,
    retries: 0,
    errorLabel: 'Failed to test STT provider'
  })

export const getSttProviderHealth = () =>
  requestJson(`${store.getBaseUrl()}/api/v1/stt/providers/health`, {
    method: 'GET',
    headers: { Accept: 'application/json', ...authHeaders() },
    timeoutMs: 10000,
    retries: 0,
    errorLabel: 'Failed to load STT provider health'
  })
