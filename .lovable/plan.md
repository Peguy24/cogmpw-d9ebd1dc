

## Fix: Excessive Top Spacing on iOS

### Problem
Three separate layers are all adding safe-area top padding, stacking on top of each other:
1. The `html` element in CSS has `padding: env(safe-area-inset-top)`
2. The `.app-safe-area` wrapper div adds another `padding-top: env(safe-area-inset-top)`
3. Capacitor's `contentInset: 'automatic'` setting adds its own native inset

### Solution
Keep only ONE source of safe-area padding -- the `.app-safe-area` CSS class -- and remove the other two.

### Changes

**1. `src/index.css`** -- Remove the `html` safe-area padding (lines ~128-131)
- Delete the `html { padding: env(safe-area-inset-top) ... }` rule since `.app-safe-area` already handles this

**2. `capacitor.config.ts`** -- Change `contentInset` from `'automatic'` to `'never'`
- This stops Capacitor from natively adding its own top inset, letting the CSS handle it

### After the Change
Run these commands in your terminal to apply:

```text
npm run build
npx cap sync ios
npx cap open ios
```

Then rebuild and test on your device. The excessive top space should be gone, with just the correct amount of padding below the status bar / notch.

