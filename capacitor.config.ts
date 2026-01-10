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
  ios: {
    allowsLinkPreview: false,
    scrollEnabled: true,
    contentInset: 'automatic',
  },
  server: {
    // Allow navigation to Stripe for payments and YouTube embeds
    allowNavigation: ["checkout.stripe.com", "www.youtube.com", "youtube.com"],
  },
};

export default config;
