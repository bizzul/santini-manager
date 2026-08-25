import {
  decidePwaLaunch,
  isPwaHomeMode,
  oreRedirectPath,
  readPwaHomeModeFromCookieHeader,
  resolveOreLandingPath,
  sanitizeInternalNextPath,
  shouldOpenPwaHomeChooser,
  shouldOpenPwaLaunchFromRoot,
} from "../home-mode";

describe("isPwaHomeMode", () => {
  it("accepts manager and ore", () => {
    expect(isPwaHomeMode("manager")).toBe(true);
    expect(isPwaHomeMode("ore")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isPwaHomeMode("auto")).toBe(false);
    expect(isPwaHomeMode("")).toBe(false);
    expect(isPwaHomeMode(undefined)).toBe(false);
  });
});

describe("decidePwaLaunch", () => {
  it("sends ore mode to last-space time tracking", () => {
    expect(
      decidePwaLaunch({
        homeMode: "ore",
        sourcePwa: true,
        lastSpace: "santini",
      }),
    ).toEqual({ type: "ore", path: "/sites/santini/timetracking" });
  });

  it("falls back to space picker when ore has no last space", () => {
    expect(
      decidePwaLaunch({ homeMode: "ore", sourcePwa: false }),
    ).toEqual({ type: "ore", path: "/sites/select" });
  });

  it("lets an explicit home query overwrite the cookie", () => {
    expect(
      decidePwaLaunch({
        homeMode: "manager",
        homeParam: "ore",
        sourcePwa: true,
        lastSpace: "acme",
      }),
    ).toEqual({ type: "ore", path: "/sites/acme/timetracking" });
  });

  it("opens the chooser on PWA start when no preference exists", () => {
    expect(decidePwaLaunch({ sourcePwa: true })).toEqual({ type: "chooser" });
  });

  it("does not open the chooser in a normal browser tab", () => {
    expect(decidePwaLaunch({ sourcePwa: false })).toEqual({ type: "continue" });
  });

  it("continues into the manager when the preference is set", () => {
    expect(
      decidePwaLaunch({ homeMode: "manager", sourcePwa: true }),
    ).toEqual({ type: "continue", mode: "manager" });
  });
});

describe("oreRedirectPath", () => {
  it("keeps time tracking and the chooser reachable", () => {
    expect(oreRedirectPath("/sites/santini/timetracking")).toBeNull();
    expect(oreRedirectPath("/sites/santini/timetracking/create")).toBeNull();
    expect(oreRedirectPath("/pwa/home")).toBeNull();
    expect(oreRedirectPath("/sites/select")).toBeNull();
    expect(oreRedirectPath("/launch?source=pwa")).toBeNull();
  });

  it("sends other site pages back to time tracking", () => {
    expect(oreRedirectPath("/sites/santini/dashboard")).toBe(
      "/sites/santini/timetracking",
    );
    expect(oreRedirectPath("/sites/santini/clients")).toBe(
      "/sites/santini/timetracking",
    );
  });

  it("sends personale / admin to last-space hours", () => {
    expect(oreRedirectPath("/personale/focus", "santini")).toBe(
      "/sites/santini/timetracking",
    );
    expect(oreRedirectPath("/administration", "santini")).toBe(
      "/sites/santini/timetracking",
    );
  });
});

describe("resolveOreLandingPath", () => {
  it("uses last space when present", () => {
    expect(resolveOreLandingPath("foo")).toBe("/sites/foo/timetracking");
    expect(resolveOreLandingPath(undefined)).toBe("/sites/select");
  });
});

describe("sanitizeInternalNextPath", () => {
  it("allows manager return paths", () => {
    expect(sanitizeInternalNextPath("/launch?source=pwa")).toBe(
      "/launch?source=pwa",
    );
    expect(sanitizeInternalNextPath("/pwa/home")).toBe("/pwa/home");
    expect(sanitizeInternalNextPath("/sites/select")).toBe("/sites/select");
  });

  it("rejects open redirects", () => {
    expect(sanitizeInternalNextPath("https://evil.example")).toBeNull();
    expect(sanitizeInternalNextPath("//evil.example")).toBeNull();
    expect(sanitizeInternalNextPath("/login")).toBeNull();
  });
});

describe("readPwaHomeModeFromCookieHeader", () => {
  it("reads the preference cookie", () => {
    expect(
      readPwaHomeModeFromCookieHeader("fdm-last-space=acme; fdm-pwa-home=ore"),
    ).toBe("ore");
  });
});

describe("PWA home gate", () => {
  it("opens the chooser in standalone without a preference", () => {
    expect(
      shouldOpenPwaHomeChooser({
        standalone: true,
        pathname: "/sites/acme/dashboard",
        homeMode: undefined,
      }),
    ).toBe(true);
  });

  it("does not interrupt login or the chooser itself", () => {
    expect(
      shouldOpenPwaHomeChooser({
        standalone: true,
        pathname: "/login",
        homeMode: undefined,
      }),
    ).toBe(false);
    expect(
      shouldOpenPwaHomeChooser({
        standalone: true,
        pathname: "/pwa/home",
        homeMode: undefined,
      }),
    ).toBe(false);
  });

  it("sends a configured standalone root to /launch", () => {
    expect(
      shouldOpenPwaLaunchFromRoot({
        standalone: true,
        pathname: "/",
        homeMode: "manager",
      }),
    ).toBe(true);
  });
});
