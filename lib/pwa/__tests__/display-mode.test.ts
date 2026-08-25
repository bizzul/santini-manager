import {
  isIosSafari,
  isStandaloneDisplay,
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
