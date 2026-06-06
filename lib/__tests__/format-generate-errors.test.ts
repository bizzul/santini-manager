import { buildErrorsFromMappedAiError } from "@/lib/documenti/format-generate-errors";
import { toPostgrestIlikePattern } from "@/lib/documenti/safe-supabase-ilike";

describe("toPostgrestIlikePattern", () => {
  it("quoting pattern con punti nel nome cliente", () => {
    expect(toPostgrestIlikePattern("Claudio Dr.med. Gaia")).toBe(
      '"%Claudio Dr.med. Gaia%"',
    );
  });
});

describe("buildErrorsFromMappedAiError", () => {
  it("estrae errori Zod annidati nel messaggio AI", () => {
    const errors = buildErrorsFromMappedAiError({
      status: 422,
      error: "L'AI non ha prodotto un documento valido",
      message:
        'No object generated — Error message: [{"path":["righe",0,"prezzoUnitario"],"expected":"number","received":"string","message":"Expected number, received string"}]',
    });

    expect(errors.some((e) => e.includes("righe.0.prezzoUnitario"))).toBe(
      true,
    );
  });
});
