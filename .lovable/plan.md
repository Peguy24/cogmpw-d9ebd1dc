

## Fix: App Crash When Taking Photo in Settings (Apple Guideline 2.1)

### Root Cause

The profile photo upload in Settings uses a standard HTML file input (`<input type="file" accept="image/*">`). On iOS, this presents a menu with "Take Photo" as an option. When the user selects it, iOS requires `NSCameraUsageDescription` in the app's `Info.plist`. Without it, **iOS kills the app instantly** -- this is the crash Apple reported.

### Solution

Two changes are needed:

**1. Add `NSCameraUsageDescription` to Capacitor config**

Update `capacitor.config.ts` to include the iOS camera usage description. This ensures `npx cap sync` automatically adds it to `Info.plist`:

```typescript
ios: {
  contentInset: 'always',
  // other existing iOS config...
},
```

However, Capacitor doesn't auto-inject arbitrary Info.plist keys from config. So the user must **manually add** this to `ios/App/App/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>COGMPW needs camera access to let you take a profile photo.</string>
```

**2. Add a safer camera fallback in ProfileSettings.tsx**

Wrap the file input handler with error handling so that even if camera access fails, the app shows a toast instead of crashing. Additionally, add `capture="environment"` as an option or use the Capacitor Camera plugin for more reliable native camera access.

The simpler and more reliable approach: install `@capacitor/camera` and use it on native platforms instead of the HTML file input.

### Implementation Steps

1. Install `@capacitor/camera` package
2. Update `ProfileSettings.tsx`:
   - On native (Capacitor) platforms: use `Camera.getPhoto()` from `@capacitor/camera` which handles permissions properly and shows a native photo picker
   - On web: keep the existing HTML file input as fallback
3. Add a `CAPACITOR_SETUP.md` note reminding to add `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` to `ios/App/App/Info.plist`

### Technical Details

**ProfileSettings.tsx changes:**
- Import `Camera, CameraResultType, CameraSource` from `@capacitor/camera`
- Modify `handleAvatarClick` to check `Capacitor.isNativePlatform()`
  - If native: call `Camera.getPhoto()` with `resultType: CameraResultType.DataUrl` and `source: CameraSource.Prompt` (shows both camera and gallery options)
  - If web: fall back to existing `fileInputRef.current?.click()`
- Convert the base64 data URL result to a Blob and upload to storage as before
- Wrap in try/catch to gracefully handle permission denials

**Required Info.plist entries (manual step for the user):**
```xml
<key>NSCameraUsageDescription</key>
<string>COGMPW needs camera access to let you take a profile photo.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>COGMPW needs photo library access to let you choose a profile photo.</string>
```

This fix directly resolves the Apple review crash and ensures camera access works properly on both iOS and Android.

