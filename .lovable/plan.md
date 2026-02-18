

## Fix: Camera Package Version Conflict

### Problem
The `@capacitor/camera` package was installed at version 8.0.1, which requires `@capacitor/core` version 8+. Your project uses Capacitor 7 (`@capacitor/core@7.4.4`), causing the `npm install` failure.

### Solution
Downgrade `@capacitor/camera` from `^8.0.1` to `^7.0.1` in `package.json` to match the rest of your Capacitor 7 packages.

### What Changes
- **package.json**: Change `"@capacitor/camera": "^8.0.1"` to `"@capacitor/camera": "^7.0.1"`

The Camera plugin API is the same between v7 and v8, so no code changes are needed in `ProfileSettings.tsx`.

### After I Make This Change
Run these commands in your terminal:

```text
git stash
git pull
npm install
npm run build
npx cap sync ios
npx cap open ios
```

Then archive and submit in Xcode as before.

