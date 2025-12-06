import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.peguy24.cogmpw',
  appName: 'COGMPW',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    StatusBar: {
      // This makes Android keep the webview BELOW the status bar / camera cutout
      overlaysWebView: false,
    },
  },
};

export default config;
