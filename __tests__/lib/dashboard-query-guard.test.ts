import {
  assertDashboardQuery,
  isFatalDashboardError,
  FATAL_DASHBOARD_ERROR_CODES,
} from "@/lib/dashboard-query-guard";

jest.mock("@/lib/logger", () => ({
  logger: {
    scope: () => ({
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    }),
  },
}));

describe("lib/dashboard-query-guard", () => {
  describe("isFatalDashboardError", () => {
    it("returns false for nullish codes", () => {
      expect(isFatalDashboardError(null)).toBe(false);
      expect(isFatalDashboardError(undefined)).toBe(false);
      expect(isFatalDashboardError("")).toBe(false);
    });

    it("matches every configured Postgres fatal code", () => {
      for (const code of FATAL_DASHBOARD_ERROR_CODES) {
        expect(isFatalDashboardError(code)).toBe(true);
      }
    });

    it("matches every PostgREST-prefixed code", () => {
      expect(isFatalDashboardError("PGRST116")).toBe(true);
      expect(isFatalDashboardError("PGRST200")).toBe(true);
    });

    it("does not match unrelated codes", () => {
      expect(isFatalDashboardError("22P02")).toBe(false);
      expect(isFatalDashboardError("23505")).toBe(false);
    });
  });

  describe("assertDashboardQuery", () => {
    it("is a no-op when the result has no error", () => {
      expect(() =>
        assertDashboardQuery({ error: null }, "Overview:Task"),
      ).not.toThrow();
      expect(() =>
        assertDashboardQuery({}, "Overview:Task"),
      ).not.toThrow();
    });

    it("throws on 42703 (undefined column) - the Task.hours regression case", () => {
      expect(() =>
        assertDashboardQuery(
          {
            error: {
              code: "42703",
              message: "column Task.hours does not exist",
            },
          },
          "Overview:Task",
          { siteId: "abc" },
        ),
      ).toThrow(/42703/);
    });

    it("throws on 42P01 undefined_table", () => {
      expect(() =>
        assertDashboardQuery(
          { error: { code: "42P01", message: "relation does not exist" } },
          "Overview:Task",
        ),
      ).toThrow(/42P01/);
    });

    it("throws on PGRST errors", () => {
      expect(() =>
        assertDashboardQuery(
          { error: { code: "PGRST116", message: "not found" } },
          "Overview:Task",
        ),
      ).toThrow(/PGRST116/);
    });

    it("does NOT throw on non-fatal errors (e.g. optional auth column)", () => {
      expect(() =>
        assertDashboardQuery(
          { error: { code: "22P02", message: "invalid text representation" } },
          "Overview:Task",
        ),
      ).not.toThrow();
    });

    it("includes the label in the thrown error message", () => {
      expect(() =>
        assertDashboardQuery(
          { error: { code: "42703", message: "boom" } },
          "Vendita:Task",
        ),
      ).toThrow(/Vendita:Task/);
    });
  });
});
