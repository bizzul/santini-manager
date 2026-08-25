import {
  isIosSafari,
  isStandaloneDisplay,
  shouldShowPwaInstallPrompt,
} from "@/lib/pwa/display-mode";

describe("isStandaloneDisplay", () => {
  it("detects iOS navigator.standalone", () => {
    expect(isStandaloneDisplay({ navigator: { standalone: true } })).toBe(true);
  });

  it("detects the display-mode media query", () => {
    expect(
      isStandaloneDisplay({
        matchMedia: (query) => ({ matches: query.includes("standalone") }),
      }),
    ).toBe(true);
  });

  it("returns false in a normal browser tab", () => {
    expect(
      isStandaloneDisplay({
        matchMedia: () => ({ matches: false }),
        navigator: { standalone: false },
      }),
    ).toBe(false);
  });
});

describe("shouldShowPwaInstallPrompt", () => {
  it("hides the install banner on desktop Chrome", () => {
    expect(
      shouldShowPwaInstallPrompt({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        matchMedia: () => ({ matches: false }),
      }),
    ).toBe(false);
  });

  it("shows the banner on iPhone Safari", () => {
    expect(
      shouldShowPwaInstallPrompt({
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      }),
    ).toBe(true);
  });

  it("shows the banner on a narrow viewport even without a mobile UA", () => {
    expect(
      shouldShowPwaInstallPrompt({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        matchMedia: (query) => ({ matches: query.includes("max-width: 767px") }),
      }),
    ).toBe(true);
  });
});

describe("isIosSafari", () => {
  it("matches iPhone Safari", () => {
    expect(
      isIosSafari(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(true);
  });

  it("rejects Chrome on iOS", () => {
    expect(
      isIosSafari(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(false);
  });
});
