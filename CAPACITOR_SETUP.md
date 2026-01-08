# Capacitor Setup Guide for COGMPW Native App

## ✅ What's Been Configured

Capacitor has been set up for your church app with push notifications support:

- **App ID**: `app.lovable.91bc63e62d9d4af9af191c412e22cd15`
- **App Name**: COGMPW
- **Development Server**: Connected to Lovable preview for hot-reload
- **Push Notifications**: Fully configured with automatic token registration

## 📱 Testing on Physical Device/Emulator

To run your app on iOS or Android:

### Prerequisites
1. **Export to GitHub**: Click "Export to Github" button in Lovable
2. **Clone Repository**: 
   ```bash
   git clone <your-github-repo-url>
   cd <project-name>
   ```
3. **Install Dependencies**:
   ```bash
   npm install
   ```

### For Android Testing

1. **Add Android Platform**:
   ```bash
   npx cap add android
   ```

2. **Update Dependencies**:
   ```bash
   npx cap update android
   ```

3. **Build Web Assets**:
   ```bash
   npm run build
   ```

4. **Sync Project**:
   ```bash
   npx cap sync
   ```

5. **Run on Android**:
   ```bash
   npx cap run android
   ```

**Requirements**: Android Studio installed

### For iOS Testing

1. **Add iOS Platform**:
   ```bash
   npx cap add ios
   ```

2. **Update Dependencies**:
   ```bash
   npx cap update ios
   ```

3. **Build Web Assets**:
   ```bash
   npm run build
   ```

4. **Sync Project**:
   ```bash
   npx cap sync
   ```

5. **Run on iOS**:
   ```bash
   npx cap run ios
   ```

**Requirements**: 
- Mac with Xcode installed
- iOS Developer account for device testing

## 🔔 Push Notifications Setup

### Current Implementation

The app automatically:
- Requests push notification permissions on launch
- Registers device tokens with your backend
- Stores tokens in the `push_tokens` table
- Displays notifications when received

### Sending Notifications

Notifications are automatically sent when:
- New news posts are created
- New events are added

The `send-push-notification` edge function handles delivery.

### Firebase Cloud Messaging (FCM) Configuration

**⚠️ Important**: To send actual push notifications, you need to:

1. **Create a Firebase Project**: Go to [Firebase Console](https://console.firebase.google.com/)
2. **Add Android App**: Register your app with package name `app.lovable.91bc63e62d9d4af9af191c412e22cd15`
3. **Add iOS App**: Register your app with bundle ID `app.lovable.91bc63e62d9d4af9af191c412e22cd15`
4. **Download Config Files**:
   - Android: `google-services.json` → place in `android/app/`
   - iOS: `GoogleService-Info.plist` → place in `ios/App/App/`
5. **Get Server Key**: From Firebase Console → Project Settings → Cloud Messaging → Server Key
6. **Update Edge Function**: Modify `supabase/functions/send-push-notification/index.ts` with your FCM credentials

## 🔄 Development Workflow

### Making Changes

After you pull new changes from GitHub:

1. **Sync Capacitor**:
   ```bash
   npx cap sync
   ```

2. **Run App**:
   ```bash
   npx cap run android  # or ios
   ```

### Hot Reload During Development

The app is configured to connect to your Lovable preview URL, which means:
- Changes in Lovable appear immediately in the app
- No need to rebuild for UI/code changes
- Perfect for rapid iteration

## 📋 Next Steps

1. ✅ Export project to GitHub
2. ✅ Set up local development environment
3. ✅ Add Android/iOS platforms
4. ⚠️ Configure Firebase for push notifications
5. 🚀 Test on physical device
6. 📱 Prepare for app store submission

## 🆘 Troubleshooting

### Capacitor sync fails
- Ensure you've run `npm install` first
- Check that `capacitor.config.ts` exists

### Push notifications not working
- Verify Firebase is properly configured
- Check device permissions
- Review edge function logs in Lovable Cloud

### App won't build
- Clear build cache: `npm run build`
- Sync again: `npx cap sync`
- Check Android Studio/Xcode for specific errors

## 🔐 Face ID / Touch ID (Biometric Authentication)

To enable biometric authentication on iOS, you **must** add the following to your `ios/App/App/Info.plist`:

```xml
<key>NSFaceIDUsageDescription</key>
<string>We use Face ID to securely sign you in to your COGMPW account.</string>
```

### Steps:
1. Open your iOS project in Xcode: `npx cap open ios`
2. Click on `App` in the project navigator
3. Select the `Info` tab
4. Add a new row with:
   - Key: `Privacy - Face ID Usage Description`
   - Value: `We use Face ID to securely sign you in to your COGMPW account.`
5. Save and rebuild

Without this entry, Face ID/Touch ID will not be available and the biometric login button won't appear.

## 📚 Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Lovable Capacitor Guide](https://docs.lovable.dev/)
- [capacitor-native-biometric](https://github.com/nicedayz/capacitor-native-biometric)
