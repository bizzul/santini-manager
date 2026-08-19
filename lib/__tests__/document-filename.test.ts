import {
  buildDocumentFilename,
  formatDocumentDateStamp,
  sanitizeDocumentFilenamePart,
} from "@/lib/document-filename";

describe("document-filename", () => {
  it("strips accents and joins client name words", () => {
    expect(sanitizeDocumentFilenamePart("Müller SA")).toBe("MullerSA");
    expect(sanitizeDocumentFilenamePart("Santini SA")).toBe("SantiniSA");
  });

  it("keeps project numbers with hyphens", () => {
    expect(
      sanitizeDocumentFilenamePart("26-047-FATT", { joinWords: false }),
    ).toBe("26-047-FATT");
  });

  it("builds the convention filename", () => {
    expect(
      buildDocumentFilename({
        projectNumber: "26-047",
        documentType: "RiepilogoProgetto",
        clientName: "Santini SA",
        generatedAt: new Date(2026, 7, 19),
      }),
    ).toBe("26-047_RiepilogoProgetto_SantiniSA_20260819.pdf");
  });

  it("appends an incrementing suffix on collision", () => {
    const generatedAt = new Date(2026, 7, 19);
    const first = buildDocumentFilename({
      projectNumber: "P0142",
      documentType: "Offerta",
      clientName: "Müller",
      generatedAt,
    });
    expect(first).toBe("P0142_Offerta_Muller_20260819.pdf");

    const second = buildDocumentFilename({
      projectNumber: "P0142",
      documentType: "Offerta",
      clientName: "Müller",
      generatedAt,
      existingNames: [first],
    });
    expect(second).toBe("P0142_Offerta_Muller_20260819_2.pdf");

    const third = buildDocumentFilename({
      projectNumber: "P0142",
      documentType: "Offerta",
      clientName: "Müller",
      generatedAt,
      existingNames: [first, second],
    });
    expect(third).toBe("P0142_Offerta_Muller_20260819_3.pdf");
  });

  it("formats AAAAMMGG with eight digits", () => {
    expect(formatDocumentDateStamp(new Date(2026, 7, 19))).toBe("20260819");
  });
});
