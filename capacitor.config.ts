import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.91bc63e62d9d4af9af191c412e22cd15',
  appName: 'COGMPW',
  webDir: 'dist',
  server: {
    url: 'https://91bc63e6-2d9d-4af9-af19-1c412e22cd15.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
