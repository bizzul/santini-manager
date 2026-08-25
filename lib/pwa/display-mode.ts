export function isStandaloneDisplay(input: {
  matchMedia?: (query: string) => { matches: boolean };
  navigator?: { standalone?: boolean } | Navigator;
}): boolean {
  const standalone =
    input.navigator && "standalone" in input.navigator
      ? Boolean((input.navigator as { standalone?: boolean }).standalone)
      : false;
  if (standalone) return true;
  return Boolean(input.matchMedia?.("(display-mode: standalone)")?.matches);
}

export function isIosSafari(userAgent: string): boolean {
  const ua = userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Mac") && ua.includes("Mobile"));
  const isWebKit = /WebKit/.test(ua);
  const isOtherBrowser = /CriOS|FxiOS|OPiOS|EdgiOS|Chrome|Firefox|Android/.test(
    ua,
  );
  return isIos && isWebKit && !isOtherBrowser;
}

export const PWA_INSTALL_DISMISSED_KEY = "fdm-pwa-install-dismissed";
