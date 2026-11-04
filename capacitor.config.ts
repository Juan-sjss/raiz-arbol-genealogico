import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.raiz.arbolgenealogico',
  appName: 'Raíz',
  webDir: 'dist',
  android: {
    backgroundColor: '#f6f2ea',
    allowMixedContent: false,
  },
  backgroundColor: '#f6f2ea',
}

export default config
