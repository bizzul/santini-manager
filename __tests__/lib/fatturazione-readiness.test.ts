import {
  canConfirmFatturazioneReadiness,
  fatturazioneApiErrorMessage,
  getFatturazioneReadinessBorderColor,
  getFatturazioneReadinessFillStyle,
  isFatturazioneKanban,
  isFatturazionePagataColumn,
  isFatturazioneSchemaMissing,
  isFatturazioneToDoColumn,
  isFatturazioneInviataColumn,
  resolveFatturazioneReadinessStato,
  shouldShowFatturazioneReadinessBadge,
  toFatturazioneTaskId,
} from "@/lib/fatturazione-readiness";
import { parseFatturazioneReadinessEnabled } from "@/lib/fatturazione-readiness-settings";

describe("fatturazione-readiness helpers", () => {
  it("detects invoicing boards by flag, identifier and category", () => {
    expect(isFatturazioneKanban({ is_invoicing_kanban: true })).toBe(true);
    expect(isFatturazioneKanban({ identifier: "fatture" })).toBe(true);
    expect(isFatturazioneKanban({ identifier: "fatture_out" })).toBe(true);
    expect(
      isFatturazioneKanban({ category: { identifier: "fatturazione" } }),
    ).toBe(true);
    expect(
      isFatturazioneKanban(undefined, { identifier: "to_do_fatture" }),
    ).toBe(true);
    expect(isFatturazioneKanban({ identifier: "0_offerte" })).toBe(false);
    expect(isFatturazioneKanban({ identifier: "1_progettazione" })).toBe(false);
  });

  it("does not treat other boards as fatturazione even with To Do columns", () => {
    expect(
      isFatturazioneKanban(
        { identifier: "0_offerte", is_offer_kanban: true as any },
        { identifier: "to_do_0_offerte" },
      ),
    ).toBe(false);
  });

  it("recognizes To Do and Pagata columns including localized titles", () => {
    expect(isFatturazioneToDoColumn({ identifier: "to_do_fatture", position: 1 })).toBe(true);
    expect(isFatturazioneToDoColumn({ title: "Zu erledigen", position: 1 })).toBe(true);
    expect(isFatturazionePagataColumn({ identifier: "pagata_fatture", position: 3 })).toBe(true);
    expect(isFatturazionePagataColumn({ title: "Bezahlt" })).toBe(true);
    expect(isFatturazionePagataColumn({ identifier: "inviata_fatture", position: 2 })).toBe(false);
    expect(isFatturazioneInviataColumn({ identifier: "inviata_fatture", position: 2 })).toBe(true);
    expect(isFatturazioneInviataColumn({ title: "Inviata" })).toBe(true);
    expect(isFatturazioneInviataColumn({ identifier: "to_do_fatture", position: 1 })).toBe(false);
  });

  it("shows the fill only on To Do, not on Inviata or Pagata", () => {
    const kanban = { identifier: "fatture", is_invoicing_kanban: true };
    expect(
      shouldShowFatturazioneReadinessBadge(kanban, {
        identifier: "to_do_fatture",
        position: 1,
      }),
    ).toBe(true);
    expect(
      shouldShowFatturazioneReadinessBadge(kanban, {
        identifier: "inviata_fatture",
        position: 2,
      }),
    ).toBe(false);
    expect(
      shouldShowFatturazioneReadinessBadge(kanban, {
        identifier: "pagata_fatture",
        position: 3,
      }),
    ).toBe(false);
  });

  it("allows confirm only with checkbox or at least one supplement row", () => {
    expect(
      canConfirmFatturazioneReadiness({ ugualeOfferta: true, supplementiCount: 0 }),
    ).toBe(true);
    expect(
      canConfirmFatturazioneReadiness({ ugualeOfferta: false, supplementiCount: 1 }),
    ).toBe(true);
    expect(
      canConfirmFatturazioneReadiness({ ugualeOfferta: false, supplementiCount: 0 }),
    ).toBe(false);
  });

  it("treats missing readiness as in_attesa (orange)", () => {
    expect(resolveFatturazioneReadinessStato(null)).toBe("in_attesa");
    expect(resolveFatturazioneReadinessStato({ stato: "pronto" })).toBe("pronto");
  });

  it("maps readiness stato to dashboard orange/green tints", () => {
    expect(getFatturazioneReadinessFillStyle("pronto").backgroundColor).toBe(
      "rgba(34, 197, 94, 0.35)",
    );
    expect(getFatturazioneReadinessFillStyle("in_attesa").backgroundColor).toBe(
      "rgba(249, 115, 22, 0.35)",
    );
    expect(getFatturazioneReadinessBorderColor("pronto")).toBe(
      "rgba(74, 222, 128, 0.7)",
    );
    expect(getFatturazioneReadinessBorderColor("in_attesa")).toBe(
      "rgba(251, 146, 60, 0.7)",
    );
  });

  it("enables the feature flag by default and disables only on explicit false", () => {
    expect(parseFatturazioneReadinessEnabled(undefined)).toBe(true);
    expect(parseFatturazioneReadinessEnabled(null)).toBe(true);
    expect(parseFatturazioneReadinessEnabled(true)).toBe(true);
    expect(parseFatturazioneReadinessEnabled(false)).toBe(false);
    expect(parseFatturazioneReadinessEnabled("false")).toBe(false);
  });

  it("detects missing fatturazione schema from PostgREST errors", () => {
    expect(
      isFatturazioneSchemaMissing({
        code: "42P01",
        message: 'relation "fatturazione_readiness" does not exist',
      }),
    ).toBe(true);
    expect(
      isFatturazioneSchemaMissing({
        code: "PGRST204",
        message: "Could not find the 'is_invoicing_kanban' column of 'Kanban' in the schema cache",
      }),
    ).toBe(true);
    expect(
      isFatturazioneSchemaMissing({
        code: "42501",
        message: "permission denied for table Task",
      }),
    ).toBe(false);
  });

  it("normalizes task ids and API error payloads", () => {
    expect(toFatturazioneTaskId(12)).toBe(12);
    expect(toFatturazioneTaskId("12")).toBe(12);
    expect(toFatturazioneTaskId(null)).toBeNull();
    expect(toFatturazioneTaskId("")).toBeNull();
    expect(fatturazioneApiErrorMessage({ error: "Manca il prezzo" }, "fallback")).toBe(
      "Manca il prezzo",
    );
    expect(
      fatturazioneApiErrorMessage(
        { error: { formErrors: ["Seleziona una tipologia"] } },
        "fallback",
      ),
    ).toBe("Seleziona una tipologia");
  });
});
