import { Capacitor } from "@capacitor/core";

export const openCogmpwApp = (deepLinkPath: string, fallbackUrl?: string) => {
  const normalized = deepLinkPath.replace(/^\//, "");
  const ua = navigator.userAgent || "";
  const isAndroid = /android/i.test(ua);
  const isAndroidWebView = /\bwv\b/i.test(ua) || /;\s*wv\)/i.test(ua);

  // Safety: if this runs inside the native app WebView, NEVER use intent://
  // because it can switch out to Chrome. Use the custom scheme instead.
  if (Capacitor.isNativePlatform() || isAndroidWebView) {
    window.location.href = `cogmpw://${normalized}`;
    return;
  }

  if (isAndroid) {
    const fallbackPart = fallbackUrl
      ? `;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)}`
      : "";

    // intent:// is generally the most reliable on Android from a browser context.
    const intentUrl = `intent://${normalized}#Intent;scheme=cogmpw;package=com.peguy24.cogmpw${fallbackPart};end`;
    window.location.href = intentUrl;
    return;
  }

  // iOS (and others): use the custom URL scheme.
  window.location.href = `cogmpw://${normalized}`;
};

