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
  // Deep linking configuration for handling Stripe redirects
  server: {
    // Handle deep links with custom URL scheme
    allowNavigation: ['cogmpw.lovable.app', 'checkout.stripe.com'],
  },
};

export default config;
