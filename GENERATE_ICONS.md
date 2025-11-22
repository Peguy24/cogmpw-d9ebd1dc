# Generate App Icons for COGMPW

Your church logo has been saved to `public/logo-source.webp`. Now you need to generate all required icon sizes for both Android and iOS.

## 🎯 Quick Method: Use Icon Kitchen (Recommended)

**Icon Kitchen** automatically generates all required sizes for both platforms:

1. **Go to**: [icon.kitchen](https://icon.kitchen/)

2. **Upload** your logo: `public/logo-source.webp`

3. **Configure**:
   - **Name**: COGMPW
   - **Background**: Keep transparent or use #1e40af (blue)
   - **Padding**: Adjust to ensure logo looks good at small sizes
   - **Shape**: Circle (matches your logo)

4. **Generate and Download**

5. **Extract the zip** and copy files:
   - **Android**: Copy all files from `android/` folder to your project's `android/app/src/main/res/` folder
   - **iOS**: Import all icons into Xcode's `Assets.xcassets/AppIcon`
   - **Web**: Copy `favicon.ico`, `android-chrome-*.png`, `apple-touch-icon.png` to `public/` folder

---

## 🔧 Alternative Method: Manual Generation

If you prefer to generate icons manually, here are the required sizes:

### Android Icons (place in `android/app/src/main/res/`)

Create these in `mipmap-*` folders:

| Folder | Size | File Name |
|--------|------|-----------|
| `mipmap-mdpi` | 48x48 | `ic_launcher.png` |
| `mipmap-hdpi` | 72x72 | `ic_launcher.png` |
| `mipmap-xhdpi` | 96x96 | `ic_launcher.png` |
| `mipmap-xxhdpi` | 144x144 | `ic_launcher.png` |
| `mipmap-xxxhdpi` | 192x192 | `ic_launcher.png` |

Also create:
- `ic_launcher_round.png` (same sizes as above, for round icons)
- `ic_launcher_foreground.png` (same sizes, if using adaptive icons)

### iOS Icons (add to Xcode's `Assets.xcassets/AppIcon`)

Required sizes in Xcode:

| Device | Size | Scale |
|--------|------|-------|
| iPhone Notification | 20pt | 2x, 3x (40x40, 60x60) |
| iPhone Settings | 29pt | 2x, 3x (58x58, 87x87) |
| iPhone Spotlight | 40pt | 2x, 3x (80x80, 120x120) |
| iPhone App | 60pt | 2x, 3x (120x120, 180x180) |
| iPad Notifications | 20pt | 1x, 2x (20x20, 40x40) |
| iPad Settings | 29pt | 1x, 2x (29x29, 58x58) |
| iPad Spotlight | 40pt | 1x, 2x (40x40, 80x80) |
| iPad App | 76pt | 1x, 2x (76x76, 152x152) |
| iPad Pro | 83.5pt | 2x (167x167) |
| App Store | 1024pt | 1x (1024x1024) |

### Web Icons (place in `public/` folder)

- `favicon.ico` - 32x32, 16x16 (multi-resolution ICO file)
- `favicon-16x16.png` - 16x16
- `favicon-32x32.png` - 32x32
- `apple-touch-icon.png` - 180x180
- `android-chrome-192x192.png` - 192x192
- `android-chrome-512x512.png` - 512x512

---

## 🛠️ Tools for Manual Generation

### Online Tools:
1. **Icon Kitchen**: [icon.kitchen](https://icon.kitchen/) - Best all-in-one solution
2. **App Icon Generator**: [appicon.co](https://appicon.co/) - iOS focus
3. **Android Asset Studio**: [romannurik.github.io/AndroidAssetStudio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html)

### Design Tools:
- **Figma**: Create artboards for each size
- **Photoshop**: Batch process to create all sizes
- **GIMP**: Free alternative to Photoshop

---

## 📱 Adding Icons to Your Build

### For Android:

1. **Place icons** in `android/app/src/main/res/mipmap-*` folders

2. **Verify** `AndroidManifest.xml` references the icon:
   ```xml
   <application
       android:icon="@mipmap/ic_launcher"
       android:roundIcon="@mipmap/ic_launcher_round"
       ...>
   ```

3. **Sync project**:
   ```bash
   npx cap sync android
   ```

### For iOS:

1. **Open Xcode**:
   ```bash
   npx cap open ios
   ```

2. **In Xcode**:
   - Open `Assets.xcassets`
   - Click `AppIcon`
   - Drag and drop each icon size into the correct slot
   - Ensure all sizes are filled (no missing icons)

3. **Build to verify**:
   ```bash
   npx cap run ios
   ```

### For Web (PWA):

1. **Place icons** in `public/` folder:
   - `favicon.ico`
   - `favicon-16x16.png`
   - `favicon-32x32.png`
   - `apple-touch-icon.png`
   - `android-chrome-192x192.png`
   - `android-chrome-512x512.png`

2. **Verify `manifest.json`** references the icons (already configured)

3. **Update `index.html`** with icon links (already configured)

---

## ✅ Verification Checklist

### Android:
- [ ] All `mipmap-*` folders have icons
- [ ] Icons appear correctly on home screen
- [ ] Icons appear correctly in app drawer
- [ ] Round icons work (Android 7.1+)

### iOS:
- [ ] All AppIcon slots filled in Xcode
- [ ] No missing icon warnings in Xcode
- [ ] Icon appears correctly on home screen
- [ ] Icon appears correctly in Settings
- [ ] 1024x1024 App Store icon included

### Web:
- [ ] Favicon appears in browser tab
- [ ] Apple touch icon works on iOS Safari
- [ ] Android Chrome shows correct icon when "Add to Home Screen"
- [ ] PWA icon displays correctly when installed

---

## 🎨 Design Tips for App Icons

1. **Keep it Simple**: Icons are viewed at small sizes - avoid fine details
2. **High Contrast**: Ensure logo is visible against various backgrounds
3. **No Text**: At small sizes, text becomes unreadable
4. **Padding**: Leave 10-15% padding around edges
5. **Test at Size**: View icons at actual device sizes (not zoomed in)
6. **Consistent Brand**: Use your church's primary colors
7. **Background**: Consider both light and dark mode appearances

---

## 🔍 Current Logo Analysis

Your COGMPW logo is:
- ✅ **Circular design** - Perfect for app icons
- ✅ **Gold border** - Provides nice contrast
- ✅ **Clear symbolism** - Church with cross is recognizable
- ✅ **Good contrast** - Blue and white work well at small sizes
- ⚠️ **Text detail** - "CHURCH OF GOD" text may be hard to read at 16x16

**Recommendation**: For very small sizes (16x16, 20x20), consider a simplified version showing just the church symbol without the text ring.

---

## 📞 Need Help?

If you encounter issues:
1. Double-check file names match exactly (case-sensitive)
2. Ensure PNG format with transparency
3. Verify image dimensions are exact (no scaling)
4. Clear app cache and reinstall for testing
5. Check Xcode/Android Studio for any warnings

**Your logo is ready** at `public/logo-source.webp` - just use Icon Kitchen to generate all sizes automatically! 🚀
