# Publishing COGMPW App to App Stores

## 📋 Prerequisites

### For Both Stores
- ✅ Completed app with all features working
- ✅ App icons in all required sizes
- ✅ Screenshots for different device sizes
- ✅ App description, privacy policy, and terms of service
- ✅ GitHub repository with your code

### For Google Play Store
- **Developer Account**: $25 one-time fee
- **Android Studio** installed
- **Requirements**: 
  - Privacy Policy URL
  - App screenshots (phone & tablet)
  - Feature graphic (1024 x 500px)
  - High-res icon (512 x 512px)

### For Apple App Store
- **Apple Developer Account**: $99/year
- **Mac computer** with Xcode
- **Requirements**:
  - Privacy Policy URL
  - App screenshots (various iPhone/iPad sizes)
  - App preview videos (optional but recommended)

---

## 🚀 Step 1: Prepare Your App for Production

### 1.1 Update Capacitor Config for Production

Edit `capacitor.config.ts` and **remove** the development server configuration:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.91bc63e62d9d4af9af191c412e22cd15',
  appName: 'COGMPW',
  webDir: 'dist',
  // Remove the server section for production builds
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
```

### 1.2 Build Your Web Assets

```bash
# Export project to GitHub first
# Clone your repository
git clone <your-github-repo-url>
cd <project-name>

# Install dependencies
npm install

# Build for production
npm run build
```

---

## 📱 Publishing to Google Play Store

### Step 2.1: Set Up Android Studio

1. **Add Android Platform** (if not already done):
   ```bash
   npx cap add android
   npx cap update android
   npx cap sync
   ```

2. **Open in Android Studio**:
   ```bash
   npx cap open android
   ```

### Step 2.2: Configure App Details

In Android Studio, update these files:

**`android/app/build.gradle`**:
```gradle
android {
    defaultConfig {
        applicationId "app.lovable.91bc63e62d9d4af9af191c412e22cd15"
        minSdkVersion 22
        targetSdkVersion 34
        versionCode 1        // Increment for each release
        versionName "1.0.0"  // User-facing version
    }
}
```

**`android/app/src/main/res/values/strings.xml`**:
```xml
<resources>
    <string name="app_name">COGMPW</string>
    <string name="title_activity_main">COGMPW Church</string>
</resources>
```

### Step 2.3: Generate App Icons

1. Use [Icon Kitchen](https://icon.kitchen/) or Android Studio's Image Asset Studio
2. Generate all icon sizes:
   - `mipmap-mdpi` (48x48)
   - `mipmap-hdpi` (72x72)
   - `mipmap-xhdpi` (96x96)
   - `mipmap-xxhdpi` (144x144)
   - `mipmap-xxxhdpi` (192x192)
3. Place icons in `android/app/src/main/res/` folders

### Step 2.4: Create a Signed Release Build

1. **Generate a Keystore** (first time only):
   ```bash
   keytool -genkey -v -keystore cogmpw-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias cogmpw-key
   ```
   
   ⚠️ **IMPORTANT**: Keep this keystore file safe! You'll need it for all future updates.

2. **Configure Signing** in `android/app/build.gradle`:
   ```gradle
   android {
       signingConfigs {
           release {
               storeFile file('/path/to/cogmpw-release-key.jks')
               storePassword 'your-store-password'
               keyAlias 'cogmpw-key'
               keyPassword 'your-key-password'
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
               minifyEnabled false
               proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
           }
       }
   }
   ```

3. **Build the Release APK/Bundle**:
   ```bash
   cd android
   ./gradlew bundleRelease  # For App Bundle (recommended)
   # OR
   ./gradlew assembleRelease  # For APK
   ```

   Find your build at:
   - Bundle: `android/app/build/outputs/bundle/release/app-release.aab`
   - APK: `android/app/build/outputs/apk/release/app-release.apk`

### Step 2.5: Upload to Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new application
3. Fill in store listing:
   - App name: **COGMPW**
   - Short description (80 chars)
   - Full description (4000 chars)
   - App category: **Lifestyle** or **Social**
   - Screenshots (at least 2 for phone, 1 for tablet)
   - Feature graphic (1024x500)
   - Privacy policy URL
4. Set up content rating (fill out questionnaire)
5. Set pricing (Free)
6. Select countries for distribution
7. Upload your `.aab` file in **Production** track
8. Submit for review

**Timeline**: Usually 1-7 days for first review

---

## 🍎 Publishing to Apple App Store

### Step 3.1: Set Up Xcode

1. **Add iOS Platform** (if not already done):
   ```bash
   npx cap add ios
   npx cap update ios
   npx cap sync
   ```

2. **Open in Xcode**:
   ```bash
   npx cap open ios
   ```

### Step 3.2: Configure App Details in Xcode

1. Select your project in Xcode
2. Under **General** tab:
   - **Display Name**: COGMPW
   - **Bundle Identifier**: `app.lovable.91bc63e62d9d4af9af191c412e22cd15`
   - **Version**: 1.0.0
   - **Build**: 1
   - **Team**: Select your Apple Developer Team

3. Under **Signing & Capabilities**:
   - Enable **Automatically manage signing**
   - Select your Team
   - Ensure provisioning profiles are created

### Step 3.3: Add App Icons

1. In Xcode, open `Assets.xcassets`
2. Find **AppIcon** 
3. Drag and drop icon images for all required sizes:
   - iPhone: 20pt, 29pt, 40pt, 60pt (2x and 3x)
   - iPad: 20pt, 29pt, 40pt, 76pt, 83.5pt (1x and 2x)
   - App Store: 1024x1024 (1x)

Use [AppIcon.co](https://appicon.co/) to generate all sizes from one image.

### Step 3.4: Configure Push Notifications

1. In Xcode, under **Signing & Capabilities**:
   - Click **+ Capability**
   - Add **Push Notifications**
   - Add **Background Modes** (check "Remote notifications")

2. In [Apple Developer Portal](https://developer.apple.com/):
   - Go to **Certificates, Identifiers & Profiles**
   - Select your App ID
   - Enable **Push Notifications**
   - Create APNs Authentication Key (for FCM)

### Step 3.5: Create Archive for App Store

1. In Xcode, select **Any iOS Device** as the build target
2. Go to **Product** → **Archive**
3. Wait for archive to complete
4. In **Organizer** window that opens:
   - Select your archive
   - Click **Distribute App**
   - Choose **App Store Connect**
   - Click **Upload**

### Step 3.6: Submit via App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps** → **+ New App**
3. Fill in app information:
   - **Platform**: iOS
   - **Name**: COGMPW
   - **Primary Language**: English
   - **Bundle ID**: Select your app's bundle ID
   - **SKU**: cogmpw-app-001
4. In **App Information**:
   - Privacy Policy URL
   - App Category: **Lifestyle** or **Social Networking**
   - Content Rights declaration
5. Create **Version 1.0**:
   - Screenshots (all required iPhone sizes)
   - App preview videos (optional)
   - Description
   - Keywords
   - Support URL
   - Marketing URL (optional)
6. Select the build you uploaded from Xcode
7. Fill out **App Review Information**:
   - Contact information
   - Demo account (if login required)
   - Notes for reviewer
8. Submit for review

**Timeline**: Usually 1-3 days for review

---

## 🔒 Important Security Steps

### Firebase Configuration (for Push Notifications)

Before publishing, you **must** configure Firebase:

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create new project: "COGMPW"

2. **Add Android App**:
   - Package name: `app.lovable.91bc63e62d9d4af9af191c412e22cd15`
   - Download `google-services.json`
   - Place in `android/app/google-services.json`

3. **Add iOS App**:
   - Bundle ID: `app.lovable.91bc63e62d9d4af9af191c412e22cd15`
   - Download `GoogleService-Info.plist`
   - Place in `ios/App/App/GoogleService-Info.plist`
   - Add to Xcode project

4. **Configure FCM in Edge Function**:
   - Get Server Key from Firebase Console
   - Update `supabase/functions/send-push-notification/index.ts`

### Environment Variables for Production

Make sure your production app uses the correct Supabase URLs:
- Update in your published/deployed version
- Never expose API keys in client code

---

## 📝 App Store Requirements Checklist

### Google Play Store
- ✅ App Bundle (.aab) or APK signed with release key
- ✅ Privacy Policy URL
- ✅ Screenshots (min 2 for phone)
- ✅ Feature Graphic (1024x500)
- ✅ High-res icon (512x512)
- ✅ Content rating completed
- ✅ Target API level 33 or higher

### Apple App Store
- ✅ Archive uploaded via Xcode
- ✅ Screenshots for all device sizes
- ✅ App icon (1024x1024)
- ✅ Privacy Policy URL
- ✅ App description and keywords
- ✅ Support URL
- ✅ Demo account credentials (for review)

---

## 🔄 Updating Your App

### For Updates/New Versions:

1. **Increment version numbers**:
   - Android: `versionCode` and `versionName` in `build.gradle`
   - iOS: **Version** and **Build** in Xcode

2. **Make your changes in Lovable**

3. **Build and deploy**:
   ```bash
   npm run build
   npx cap sync
   ```

4. **Create new builds** following the same process

5. **Upload to stores** (usually faster approval for updates)

---

## 🆘 Common Issues & Solutions

### Android Build Fails
```bash
# Clear build cache
cd android
./gradlew clean
cd ..
npx cap sync
```

### iOS Code Signing Issues
- Ensure your Apple Developer account is active
- Regenerate provisioning profiles in Xcode
- Check bundle identifier matches exactly

### Push Notifications Not Working
- Verify Firebase configuration files are in place
- Check that capabilities are enabled in Xcode
- Test with Firebase Console before store submission

### App Rejected
- Read rejection reason carefully
- Common issues: Privacy policy, permissions explanation, content rating
- Fix and resubmit

---

## 📞 Need Help?

- **Google Play Console**: [support.google.com/googleplay](https://support.google.com/googleplay)
- **App Store Connect**: [developer.apple.com/support](https://developer.apple.com/support)
- **Capacitor Docs**: [capacitorjs.com/docs](https://capacitorjs.com/docs)
- **Firebase Support**: [firebase.google.com/support](https://firebase.google.com/support)

---

## 🎉 Launch Checklist

Before submitting:
- ✅ Test all features on physical devices
- ✅ Verify push notifications work
- ✅ Check all images and icons look good
- ✅ Test on different screen sizes
- ✅ Review privacy policy
- ✅ Prepare support email/website
- ✅ Have demo account ready for reviewers
- ✅ Double-check all store listing information

**Good luck with your launch! 🚀**
