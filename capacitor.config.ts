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
    // Live reload from Lovable preview
    url: 'https://91bc63e6-2d9d-4af9-af19-1c412e22cd15.lovableproject.com?forceHideBadge=true',
    cleartext: true,
    // Allow navigation to Stripe for payments + Lovable preview host
    allowNavigation: [
      'cogmpw.lovable.app',
      'checkout.stripe.com',
      '91bc63e6-2d9d-4af9-af19-1c412e22cd15.lovableproject.com',
      '*.lovableproject.com',
    ],
  },
};

export default config;
