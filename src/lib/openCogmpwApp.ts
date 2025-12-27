import { Capacitor } from "@capacitor/core";

export const openCogmpwApp = (deepLinkPath: string, fallbackUrl?: string) => {
  const normalized = deepLinkPath.replace(/^\//, "");

  // Use ONLY the custom URL scheme.
  // intent:// can cause an unwanted switch to Chrome (especially if mis-detected as "not native").
  window.location.href = `cogmpw://${normalized}`;

  // Optional web fallback (only relevant when this runs in a browser)
  if (fallbackUrl) {
    window.setTimeout(() => {
      // If the app didn't open, keep the user on the website
      if (document.visibilityState === "visible") {
        window.location.href = fallbackUrl;
      }
    }, 1200);
  }
};

