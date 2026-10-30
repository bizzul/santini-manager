/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QueryHydration } from "@/components/QueryHydration";
import type { UserContext } from "@/lib/auth-utils";

const mockRefresh = jest.fn();
const mockGetSession = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({ auth: { getSession: mockGetSession } }),
}));

jest.mock("@/lib/cache-utils", () => ({
  validateCacheForUser: jest.fn(() => true),
}));

function userContext(id: string, extra: Partial<UserContext> = {}): UserContext {
  return { user: { id }, ...extra } as unknown as UserContext;
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const removeQueries = jest.spyOn(queryClient, "removeQueries");
  const utils = render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
  return { queryClient, removeQueries, ...utils };
}

async function flushMicrotasks() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("QueryHydration tab-identity autocorrect", () => {
  beforeEach(() => {
    mockRefresh.mockClear();
    mockGetSession.mockReset();
  });

  it("drops user-context and refreshes once when the tab token differs from the SSR user", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "tab-user" } } },
    });

    const { removeQueries } = renderWithClient(
      <QueryHydration data={{ userContext: userContext("ssr-user") }} />,
    );

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(removeQueries).toHaveBeenCalledWith({ queryKey: ["user-context"] });
  });

  it("does nothing when the tab token matches the SSR user", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "same-user" } } },
    });

    renderWithClient(
      <QueryHydration data={{ userContext: userContext("same-user") }} />,
    );

    await waitFor(() => expect(mockGetSession).toHaveBeenCalledTimes(1));
    await flushMicrotasks();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("never refreshes while impersonating, even if the identities differ", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "superadmin" } } },
    });

    renderWithClient(
      <QueryHydration
        data={{
          userContext: userContext("impersonated", { isImpersonating: true }),
        }}
      />,
    );

    await flushMicrotasks();
    expect(mockRefresh).not.toHaveBeenCalled();
    // The tab session is never even consulted when impersonation is active.
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it("does not refresh when the tab has no session yet", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    renderWithClient(
      <QueryHydration data={{ userContext: userContext("ssr-user") }} />,
    );

    await waitFor(() => expect(mockGetSession).toHaveBeenCalledTimes(1));
    await flushMicrotasks();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
