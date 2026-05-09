import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_BASE_URL || 'http://localhost:8000'

  return {
    plugins: [vue()],
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          headers: {
            'ngrok-skip-browser-warning': '1'
          }
        }
      }
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (id.includes('markdown-it') || id.includes('dompurify')) return 'markdown'
            if (id.includes('/src/i18n/')) return 'i18n'
            return 'vendor'
          }
        }
      }
    },
    test: {
      environment: 'happy-dom',
      globals: true,
      setupFiles: ['./src/tests/setup.js']
    }
  }
})
