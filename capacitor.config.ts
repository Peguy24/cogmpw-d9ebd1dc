import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.peguy24.cogmpw',
  appName: 'COGMPW',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    StatusBar: {
      overlaysWebView: false,
    },
  },
  server: {
    // Allow navigation to Stripe for payments
    allowNavigation: ["checkout.stripe.com"],
  },
};

export default config;
