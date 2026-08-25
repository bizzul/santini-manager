import {
  extractDomainFromPath,
  mediaTargetSupportsDirectFileRow,
  resolveMediaTarget,
} from "@/lib/media/resolve-media-target";

describe("extractDomainFromPath", () => {
  it("reads the site domain from a manager path", () => {
    expect(extractDomainFromPath("/sites/matrispro/products/12")).toBe(
      "matrispro",
    );
  });

  it("returns null when the path is not a site route", () => {
    expect(extractDomainFromPath("/personale/focus")).toBeNull();
  });
});

describe("resolveMediaTarget", () => {
  it("binds a product detail page to sellProductId", () => {
    const target = resolveMediaTarget("/sites/demo/products/42");
    expect(target).toMatchObject({
      kind: "sellProduct",
      id: 42,
      domain: "demo",
    });
    expect(mediaTargetSupportsDirectFileRow(target)).toBe(true);
  });

  it("does not treat product create as a record target", () => {
    const target = resolveMediaTarget("/sites/demo/products/create");
    expect(target.kind).toBe("unbound");
  });

  it("binds errortracking edit to the numeric id", () => {
    const target = resolveMediaTarget("/sites/demo/errortracking/edit/9");
    expect(target).toMatchObject({ kind: "errortracking", id: 9 });
  });

  it("keeps the errortracking list as a contextual but unbound error sink", () => {
    const target = resolveMediaTarget("/sites/demo/errortracking");
    expect(target.kind).toBe("errortracking");
    expect(target.id).toBeUndefined();
    expect(mediaTargetSupportsDirectFileRow(target)).toBe(false);
  });

  it("binds a task query param even outside kanban", () => {
    const target = resolveMediaTarget("/sites/demo/kanban/produzione", {
      get: (name: string) => (name === "taskId" ? "77" : null),
    });
    expect(target).toMatchObject({ kind: "task", id: 77 });
  });

  it("recognises the documenti module", () => {
    expect(resolveMediaTarget("/sites/demo/documenti").kind).toBe(
      "documentiList",
    );
    expect(resolveMediaTarget("/sites/demo/documenti/abc-1")).toMatchObject({
      kind: "documento",
      id: "abc-1",
    });
  });

  it("falls back to unbound on generic list pages", () => {
    const target = resolveMediaTarget("/sites/demo/clients");
    expect(target.kind).toBe("unbound");
    expect(mediaTargetSupportsDirectFileRow(target)).toBe(false);
  });
});
