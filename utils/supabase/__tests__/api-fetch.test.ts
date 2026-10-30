// jsdom (the configured test environment) ships no fetch primitives, so we
// provide the minimal `Headers`/`Request` surface `apiFetch` relies on.
class TestHeaders {
  private map = new Map<string, string>();
  constructor(init?: unknown) {
    if (!init) return;
    if (init instanceof TestHeaders) {
      init.map.forEach((value, key) => this.map.set(key, value));
      return;
    }
    if (Array.isArray(init)) {
      for (const [key, value] of init as [string, string][]) {
        this.map.set(String(key).toLowerCase(), String(value));
      }
      return;
    }
    for (const [key, value] of Object.entries(init as Record<string, string>)) {
      this.map.set(key.toLowerCase(), String(value));
    }
  }
  has(key: string) {
    return this.map.has(key.toLowerCase());
  }
  set(key: string, value: string) {
    this.map.set(key.toLowerCase(), value);
  }
  get(key: string) {
    return this.map.get(key.toLowerCase()) ?? null;
  }
}

(globalThis as unknown as { Headers: unknown }).Headers = TestHeaders;
(globalThis as unknown as { Request: unknown }).Request = class Request {};

const mockGetSession = jest.fn();
jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({ auth: { getSession: mockGetSession } }),
}));

import { apiFetch } from "@/utils/supabase/api-fetch";

describe("apiFetch", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "tab-token" } },
    });
    fetchMock = jest.fn(async () => ({ status: 200 }));
    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
  });

  function lastInit(): RequestInit | undefined {
    return fetchMock.mock.calls[0]?.[1];
  }

  function authHeaderSent(): string | null {
    const headers = lastInit()?.headers as TestHeaders | undefined;
    return headers?.get?.("Authorization") ?? null;
  }

  it("attaches the tab token on same-origin /api requests", async () => {
    await apiFetch("/api/time-tracking/create", { method: "POST" });
    expect(mockGetSession).toHaveBeenCalledTimes(1);
    expect(authHeaderSent()).toBe("Bearer tab-token");
  });

  it("never sends the token to a cross-origin URL", async () => {
    await apiFetch("https://evil.example.com/api/steal", { method: "POST" });
    expect(mockGetSession).not.toHaveBeenCalled();
    expect(authHeaderSent()).toBeNull();
  });

  it("leaves same-origin non-/api requests untouched", async () => {
    await apiFetch("/dashboard/data");
    expect(mockGetSession).not.toHaveBeenCalled();
    expect(authHeaderSent()).toBeNull();
  });

  it("preserves an explicit Authorization header", async () => {
    await apiFetch("/api/x", {
      headers: { Authorization: "Bearer explicit" },
    });
    expect(authHeaderSent()).toBe("Bearer explicit");
  });

  it("falls back to a plain fetch when the tab has no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await apiFetch("/api/x");
    expect(authHeaderSent()).toBeNull();
  });
});
