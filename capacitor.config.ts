import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.hadiuniv.recordapp',
  appName: 'Record App',
  webDir: 'dist',
  plugins: {
    App: {
      launchUrl: 'https://localhost'
    }
  },
  ios: {
    contentInset: 'automatic'
  },
  android: {
    allowMixedContent: false
  }
}

export default config
