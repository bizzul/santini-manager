import { isApiClientRequest } from "@/utils/supabase/api-client-request";

function headers(values: Record<string, string>) {
  return {
    get(name: string) {
      return values[name.toLowerCase()] ?? null;
    },
  };
}

describe("isApiClientRequest", () => {
  it("treats a fetch to an API route as a JSON client", () => {
    expect(
      isApiClientRequest(
        "/api/time-tracking/create",
        headers({ accept: "*/*" }),
      ),
    ).toBe(true);
  });

  it("keeps a full page navigation on the login redirect", () => {
    expect(
      isApiClientRequest(
        "/sites/santini/timetracking/create",
        headers({ accept: "text/html", "sec-fetch-mode": "navigate", "sec-fetch-dest": "document" }),
      ),
    ).toBe(false);
    expect(
      isApiClientRequest(
        "/api/time-tracking/create",
        headers({ accept: "text/html", "sec-fetch-mode": "navigate", "sec-fetch-dest": "document" }),
      ),
    ).toBe(false);
  });
});
