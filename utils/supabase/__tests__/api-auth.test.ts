const mockGetUserToken = jest.fn();
const mockGetUserCookie = jest.fn();

jest.mock("@/utils/supabase/server", () => ({
  createTokenClient: jest.fn(() => ({ auth: { getUser: mockGetUserToken } })),
  createClient: jest.fn(async () => ({ auth: { getUser: mockGetUserCookie } })),
}));

import { bearerTokenFromRequest, resolveApiAuth } from "@/utils/supabase/api-auth";

function req(headers: Record<string, string>) {
  const lower: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    lower[key.toLowerCase()] = value;
  }
  return {
    headers: { get: (name: string) => lower[name.toLowerCase()] ?? null },
  };
}

describe("bearerTokenFromRequest", () => {
  it("parses a Bearer token", () => {
    expect(bearerTokenFromRequest(req({ Authorization: "Bearer abc.def" }))).toBe(
      "abc.def",
    );
  });

  it("returns null without an Authorization header", () => {
    expect(bearerTokenFromRequest(req({}))).toBeNull();
  });

  it("returns null for a non-Bearer scheme", () => {
    expect(bearerTokenFromRequest(req({ Authorization: "Basic xyz" }))).toBeNull();
  });
});

describe("resolveApiAuth", () => {
  beforeEach(() => {
    mockGetUserToken.mockReset();
    mockGetUserCookie.mockReset();
  });

  it("uses the Bearer token identity when the token is valid", async () => {
    mockGetUserToken.mockResolvedValue({
      data: { user: { id: "tab-user" } },
      error: null,
    });

    const result = await resolveApiAuth(req({ Authorization: "Bearer tok" }));

    expect(result.source).toBe("token");
    expect(result.user?.id).toBe("tab-user");
    expect(result.accessToken).toBe("tok");
    expect(mockGetUserToken).toHaveBeenCalledWith("tok");
    expect(mockGetUserCookie).not.toHaveBeenCalled();
  });

  it("falls back to the cookie session when the token is invalid", async () => {
    mockGetUserToken.mockResolvedValue({
      data: { user: null },
      error: { message: "invalid" },
    });
    mockGetUserCookie.mockResolvedValue({ data: { user: { id: "cookie-user" } } });

    const result = await resolveApiAuth(req({ Authorization: "Bearer bad" }));

    expect(result.source).toBe("cookie");
    expect(result.user?.id).toBe("cookie-user");
    expect(result.accessToken).toBeNull();
  });

  it("uses the cookie session when no token is present", async () => {
    mockGetUserCookie.mockResolvedValue({ data: { user: { id: "cookie-user" } } });

    const result = await resolveApiAuth(req({}));

    expect(result.source).toBe("cookie");
    expect(result.user?.id).toBe("cookie-user");
    expect(mockGetUserToken).not.toHaveBeenCalled();
  });
});
