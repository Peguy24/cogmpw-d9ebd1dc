export const openCogmpwApp = (deepLinkPath: string, fallbackUrl?: string) => {
  const normalized = deepLinkPath.replace(/^\//, "");
  const ua = navigator.userAgent || "";
  const isAndroid = /android/i.test(ua);

  if (isAndroid) {
    const fallbackPart = fallbackUrl
      ? `;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)}`
      : "";

    // intent:// is generally the most reliable on Android for custom scheme routing.
    const intentUrl = `intent://${normalized}#Intent;scheme=cogmpw;package=com.peguy24.cogmpw${fallbackPart};end`;
    window.location.href = intentUrl;
    return;
  }

  // iOS (and others): use the custom URL scheme.
  window.location.href = `cogmpw://${normalized}`;
};
