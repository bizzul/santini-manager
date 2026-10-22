import { readApiJson, SESSION_EXPIRED_MESSAGE } from "@/utils/api/read-api-json";

if (typeof globalThis.Response === "undefined") {
  class TestResponse {
    status: number;
    ok: boolean;
    redirected = false;
    url = "";
    private body: string;
    private headerMap: Map<string, string>;

    constructor(body?: BodyInit | null, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = typeof body === "string" ? body : "";
      this.status = init?.status ?? 200;
      this.ok = this.status >= 200 && this.status < 300;
      this.headerMap = new Map(
        Object.entries(init?.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
      );
    }

    get headers() {
      return { get: (name: string) => this.headerMap.get(name.toLowerCase()) ?? null };
    }

    text() {
      return Promise.resolve(this.body);
    }

    json() {
      return Promise.resolve(JSON.parse(this.body));
    }

    clone() {
      return new TestResponse(this.body, {
        status: this.status,
        headers: Object.fromEntries(this.headerMap),
      });
    }
  }

  (globalThis as unknown as { Response: typeof TestResponse }).Response = TestResponse;
}

describe("readApiJson", () => {
  it("does not throw a JSON parse error when the time-tracking response is an empty redirect", async () => {
    const response = new Response(null, {
      status: 307,
      headers: { location: "/login" },
    });

    await expect(readApiJson(response)).rejects.toThrow(SESSION_EXPIRED_MESSAGE);
    await expect(readApiJson(response)).rejects.not.toThrow(/Unexpected end of JSON input/);
  });

  it("turns a 401 unauthorized body into the session message", async () => {
    const response = new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });

    await expect(readApiJson(response)).rejects.toThrow(SESSION_EXPIRED_MESSAGE);
  });

  it("keeps a real API error message", async () => {
    const response = new Response(JSON.stringify({ error: "Manca il progetto" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });

    await expect(readApiJson(response)).rejects.toThrow("Manca il progetto");
  });

  it("returns JSON when the response is ok", async () => {
    const response = new Response(JSON.stringify({ saved: 1 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

    await expect(readApiJson(response)).resolves.toEqual({ saved: 1 });
  });
});
