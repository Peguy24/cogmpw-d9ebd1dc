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
    // Load the published site so native users see updates immediately after publishing
    url: "https://cogmpw.lovable.app?forceHideBadge=true",
    // Allow navigation to Stripe for payments
    allowNavigation: ["cogmpw.lovable.app", "checkout.stripe.com"],
  },
};

export default config;
