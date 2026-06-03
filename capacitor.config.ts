import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.hadiuniv.recordapp',
  appName: 'Record App',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '710746488463-b7drnesocml27tih4as8psqo1ib7l339.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
}

export default config
