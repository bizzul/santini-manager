jest.mock("next/server", () => ({
  NextResponse: {
    redirect: jest.fn((url: string) => ({
      headers: {
        get: (key: string) => (key === "location" ? url : null),
      },
    })),
  },
}));

describe("auth callback - demo flow", () => {
  const mockExchangeCodeForSession = jest.fn();
  const mockGetUser = jest.fn();
  const mockFrom = jest.fn();
  let GET: typeof import("@/app/(auth)/auth/callback/route").GET;
  let createClientMock: jest.Mock;
  let recordDemoLoginFromTokenMock: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.doMock("@/utils/supabase/server", () => ({
      createClient: jest.fn(),
    }));
    jest.doMock("@/lib/demo/service", () => ({
      recordDemoLoginFromToken: jest.fn(),
    }));

    GET = (await import("@/app/(auth)/auth/callback/route")).GET;
    const { createClient } = await import("@/utils/supabase/server");
    const { recordDemoLoginFromToken } = await import("@/lib/demo/service");

    createClientMock = createClient as jest.Mock;
    recordDemoLoginFromTokenMock = recordDemoLoginFromToken as jest.Mock;

    createClientMock.mockResolvedValue({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
        verifyOtp: jest.fn(),
        getUser: mockGetUser,
      },
      from: mockFrom,
    });
  });

  it("records demo login and redirects enabled users to the requested demo path", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "auth-user-1",
          email: "demo@example.com",
          user_metadata: {},
        },
      },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              authId: "auth-user-1",
              email: "demo@example.com",
              given_name: "Demo",
              family_name: "User",
              role: "admin",
              enabled: true,
            },
            error: null,
          }),
        }),
      }),
    });

    const request = {
      url: "https://app.example.com/auth/callback?code=abc&next=%2Fsites%2Fdemo-site%2Fdashboard&demo_token=demo-token",
      headers: new Headers({
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "Jest",
        "referer": "https://ref.example.com",
      }),
    };

    const response = await GET(request as any);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(recordDemoLoginFromTokenMock).toHaveBeenCalledWith(
      "demo-token",
      expect.objectContaining({
        ipAddress: "10.0.0.1",
        userAgent: "Jest",
        referrer: "https://ref.example.com",
        redirectPath: "/sites/demo-site/dashboard",
      }),
    );
    expect(response.headers.get("location")).toBe(
      "https://app.example.com/sites/demo-site/dashboard",
    );
  });

  it("keeps the legacy redirect for non-demo enabled users", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "auth-user-1",
          email: "user@example.com",
          user_metadata: {},
        },
      },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              authId: "auth-user-1",
              email: "user@example.com",
              given_name: "Mario",
              family_name: "Rossi",
              role: "admin",
              enabled: true,
            },
            error: null,
          }),
        }),
      }),
    });

    const request = {
      url: "https://app.example.com/auth/callback?code=abc",
      headers: new Headers(),
    };

    const response = await GET(request as any);

    expect(recordDemoLoginFromTokenMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://app.example.com/sites/select",
    );
  });
});
