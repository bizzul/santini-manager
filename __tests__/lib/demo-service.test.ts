import {
  buildDemoPublicUrlFromTokenId,
  buildRawDemoToken,
} from "@/lib/demo/service";
import {
  filterDemoWorkspaceList,
  getDemoLandingAvailability,
} from "@/lib/demo/list-utils";

describe("lib/demo/service - token helpers", () => {
  beforeEach(() => {
    process.env.DEMO_TOKEN_SECRET = "demo-test-secret";
    process.env.NEXT_PUBLIC_URL = "https://app.example.com";
  });

  it("builds deterministic raw demo tokens", () => {
    const first = buildRawDemoToken("workspace-token-id");
    const second = buildRawDemoToken("workspace-token-id");

    expect(first).toBe(second);
    expect(first).toMatch(/^workspace-token-id\./);
  });

  it("builds the public demo URL from a token id", () => {
    const url = buildDemoPublicUrlFromTokenId("token-123");

    expect(url.endsWith(`/demo/${buildRawDemoToken("token-123")}`)).toBe(true);
  });
});

describe("lib/demo/service - landing availability", () => {
  it("marks revoked tokens as revoked", () => {
    expect(
      getDemoLandingAvailability({
        workspaceStatus: "active",
        tokenRevokedAt: new Date().toISOString(),
        tokenUsePolicy: "multi_use",
        tokenUsesCount: 0,
      }),
    ).toBe("revoked");
  });

  it("marks expired workspaces as expired", () => {
    expect(
      getDemoLandingAvailability({
        workspaceStatus: "active",
        workspaceExpiresAt: "2020-01-01T00:00:00.000Z",
        tokenUsePolicy: "multi_use",
        tokenUsesCount: 0,
      }),
    ).toBe("expired");
  });

  it("marks single use tokens as used after the first access", () => {
    expect(
      getDemoLandingAvailability({
        workspaceStatus: "active",
        tokenUsePolicy: "single_use",
        tokenUsesCount: 1,
      }),
    ).toBe("used");
  });

  it("keeps active tokens available", () => {
    expect(
      getDemoLandingAvailability({
        workspaceStatus: "active",
        tokenUsePolicy: "multi_use",
        tokenUsesCount: 2,
        tokenMaxUses: 10,
      }),
    ).toBe("active");
  });
});

describe("lib/demo/service - demo list filters", () => {
  const baseWorkspace = {
    organization_id: "org-1",
    site_id: "site-1",
    demo_user_id: "user-1",
    scenario_type: "full_suite",
    customer_contact_name: "Mario Rossi",
    customer_contact_email: "mario@example.com",
    branding_config: {
      customerName: "Mario Rossi",
    },
    landing_config: {
      landingTitle: "Demo",
      painPoints: [],
      recommendedModules: [],
    },
    seed_config: {
      templateKey: "full_suite_arredo",
      sectorKey: "arredo",
      scenarioType: "full_suite",
      enabledModules: [],
      dataIntensity: "medium" as const,
      desiredOutcomes: [],
    },
    login_count: 0,
    landing_view_count: 0,
    magic_link_count: 0,
    created_by: "admin-1",
    updated_at: "2026-04-03T12:00:00.000Z",
  };

  const demos = [
    {
      workspace: {
        ...baseWorkspace,
        id: "demo-1",
        template_key: "full_suite_arredo",
        sector_key: "arredo",
        display_name: "Demo Rossi",
        customer_name: "Rossi",
        customer_company: "Rossi Contract",
        status: "active" as const,
        first_landing_view_at: "2026-04-01T10:00:00.000Z",
        first_login_at: "2026-04-01T11:00:00.000Z",
        last_login_at: "2026-04-02T10:00:00.000Z",
        last_accessed_at: "2026-04-02T10:00:00.000Z",
        last_magic_link_at: "2026-04-02T09:00:00.000Z",
        last_ip_address: "1.1.1.1",
        last_user_agent: "Chrome",
        expires_at: "2026-04-10T12:00:00.000Z",
        created_at: "2026-04-01T09:00:00.000Z",
        login_count: 2,
      },
      site: { id: "site-1", name: "Site 1", subdomain: "rossi-demo" },
      activeToken: null,
      activeUrl: null,
    },
    {
      workspace: {
        ...baseWorkspace,
        id: "demo-2",
        template_key: "full_suite_arredo",
        sector_key: "contract",
        display_name: "Demo Bianchi",
        customer_name: "Bianchi",
        customer_company: "Bianchi Hotel",
        status: "expired" as const,
        first_landing_view_at: "2026-03-20T10:00:00.000Z",
        first_login_at: "2026-03-20T11:00:00.000Z",
        last_login_at: "2026-03-21T10:00:00.000Z",
        last_accessed_at: "2026-03-21T10:00:00.000Z",
        last_magic_link_at: "2026-03-21T09:00:00.000Z",
        last_ip_address: "2.2.2.2",
        last_user_agent: "Safari",
        expires_at: "2026-04-05T12:00:00.000Z",
        created_at: "2026-03-20T09:00:00.000Z",
        login_count: 5,
      },
      site: { id: "site-2", name: "Site 2", subdomain: "bianchi-demo" },
      activeToken: null,
      activeUrl: null,
    },
  ];

  it("filters by query across workspace and site fields", () => {
    const result = filterDemoWorkspaceList(demos, { query: "rossi" });

    expect(result).toHaveLength(1);
    expect(result[0].workspace.id).toBe("demo-1");
  });

  it("filters by status and sorts by most logins", () => {
    const result = filterDemoWorkspaceList(demos, {
      status: "expired",
      sort: "most-logins",
    });

    expect(result).toHaveLength(1);
    expect(result[0].workspace.id).toBe("demo-2");
  });

  it("sorts by nearest expiration", () => {
    const result = filterDemoWorkspaceList(demos, { sort: "expiring" });

    expect(result.map((item) => item.workspace.id)).toEqual(["demo-2", "demo-1"]);
  });
});
