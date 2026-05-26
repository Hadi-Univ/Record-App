import { reactive } from 'vue'
import {
  getSttProviderConfig,
  getSttProviderHealth,
  getSttProviders,
  testSttProvider,
  updateSttProviderConfig
} from '../services/sttApi'

const state = reactive({
  loading: false,
  saving: false,
  testing: false,
  healthLoading: false,
  error: '',
  providers: [],
  config: null,
  health: null,
  lastTest: null
})

const load = async () => {
  state.loading = true
  state.error = ''
  try {
    const [providers, config, health] = await Promise.all([
      getSttProviders(),
      getSttProviderConfig(),
      getSttProviderHealth()
    ])
    state.providers = providers?.providers || []
    state.config = config || null
    state.health = health || null
  } catch (err) {
    state.error = err.message || 'Failed to load STT provider settings'
  } finally {
    state.loading = false
  }
}

const save = async (payload) => {
  state.saving = true
  state.error = ''
  try {
    const updated = await updateSttProviderConfig(payload)
    state.config = updated
    return updated
  } catch (err) {
    state.error = err.message || 'Failed to update STT provider config'
    throw err
  } finally {
    state.saving = false
  }
}

const refreshHealth = async () => {
  state.healthLoading = true
  state.error = ''
  try {
    const health = await getSttProviderHealth()
    state.health = health
    return health
  } catch (err) {
    state.error = err.message || 'Failed to load STT provider health'
    throw err
  } finally {
    state.healthLoading = false
  }
}

const runTest = async (provider) => {
  state.testing = true
  state.error = ''
  try {
    const result = await testSttProvider(provider)
    state.lastTest = result
    return result
  } catch (err) {
    state.error = err.message || 'Failed to test STT provider'
    throw err
  } finally {
    state.testing = false
  }
}

export const useSttProviderStore = () => ({
  state,
  load,
  save,
  refreshHealth,
  runTest
})
