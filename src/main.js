import { createApp } from 'vue'
import './assets/main.css'
import App from './App.vue'
import router from './router/index.js'

const app = createApp(App)

app.config.errorHandler = (error, instance, info) => {
  console.error('[Vue Error]', { error, info, component: instance?.$options?.name || 'anonymous' })
}

app.use(router).mount('#app')
