import {
  emptyTypedComments,
  formatTypedCommentsForDisplay,
  parseTypedComments,
  serializeTypedCommentsToOther,
} from "@/lib/task-typed-comments";

describe("task-typed-comments", () => {
  it("reads typed_comments json", () => {
    expect(
      parseTypedComments({
        typed_comments: { produzione: "taglio", posa: "cantiere", fatturazione: "" },
        other: "vecchio",
      }),
    ).toEqual({
      produzione: "taglio",
      posa: "cantiere",
      fatturazione: "",
    });
  });

  it("parses labeled blocks in other", () => {
    const other = `[Produzione]
taglio lastre

[Posa]
posa infissi

[Fatturazione]
acconto ok`;
    expect(parseTypedComments({ other })).toEqual({
      produzione: "taglio lastre",
      posa: "posa infissi",
      fatturazione: "acconto ok",
    });
  });

  it("puts unlabeled other into produzione", () => {
    expect(parseTypedComments({ other: "nota unica" })).toEqual({
      ...emptyTypedComments(),
      produzione: "nota unica",
    });
  });

  it("serializes only filled types and roundtrips", () => {
    const comments = {
      produzione: "taglio",
      posa: "",
      fatturazione: "acconto",
    };
    const other = serializeTypedCommentsToOther(comments);
    expect(other).toContain("[Produzione]");
    expect(other).not.toContain("[Posa]");
    expect(parseTypedComments({ other })).toEqual(comments);
  });

  it("formats display text without markers", () => {
    expect(
      formatTypedCommentsForDisplay({
        produzione: "taglio",
        posa: "",
        fatturazione: "acconto",
      }),
    ).toBe("Produzione\ntaglio\n\nFatturazione\nacconto");
  });
});
