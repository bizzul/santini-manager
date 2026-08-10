/**
 * @jest-environment node
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { buildCatalogRiga } from "@/lib/listino/build-riga";
import { calcolaTotaliDocumento } from "@/lib/documenti/calcolo-totali";
import { generateDocumentPdfBytes } from "@/lib/documenti/generate-document-pdf";
import { DEFAULT_DOCUMENT_TEMPLATE } from "@/lib/documenti/template-types";
import type { DocumentoArricchito } from "@/validation/documenti/extracted-document";

// ---------------------------------------------------------------------------
// Genera un PDF REALE con il generatore di produzione (pdf-lib), simulando il
// round-trip DB della route /api/documenti/[id]/pdf: righe salvate in
// righe_documento e rilette (la route NON rilegge descrizione_estesa).
// Attivare con: RUN_PDF_CHECK=1 npx jest lib/__tests__/listino-pdf-check.test.ts
// ---------------------------------------------------------------------------

const RUN = process.env.RUN_PDF_CHECK === "1";
const d = RUN ? describe : describe.skip;

d("PDF catalogo (generatore di produzione)", () => {
  it("genera un PDF con riga da catalogo + riga a testo libero", async () => {
    // 1) Riga come la produce il configuratore
    const rigaCatalogo = buildCatalogRiga({
      productId: 916,
      productName: "Finestra alluminio FIN_SING",
      modalita: "griglia",
      larghezzaMm: 800,
      altezzaMm: 1400,
      codMateriale: "ALU",
      codVetroTelaio: "VC2",
      supplementiNomi: ["Posa in opera"],
      quantita: 2,
      prezzoUnitario: 500,
    });

    // 2) Come finisce in righe_documento (snake_case) — save-document.ts
    const righeDocumento = [
      {
        posizione: 1,
        art: "ZZTEST-GRID",
        descrizione: rigaCatalogo.descrizione,
        descrizione_estesa: rigaCatalogo.descrizioneEstesa ?? null,
        misure: rigaCatalogo.misure,
        unita: rigaCatalogo.unita,
        quantita: 2,
        prezzo_unitario: 500,
        sconto: null,
        is_trasporto: false,
        articolo_id: 916,
        totale_riga: 1000,
        immagine_url: null,
      },
      {
        posizione: 2,
        art: null,
        descrizione: "Consulenza in cantiere",
        descrizione_estesa: null,
        misure: null,
        unita: "h",
        quantita: 4,
        prezzo_unitario: 90,
        sconto: null,
        is_trasporto: false,
        articolo_id: null,
        totale_riga: 360,
        immagine_url: null,
      },
    ];

    // 3) documento come lo ricostruisce la route PDF (NB: niente descrizione_estesa)
    const documento: DocumentoArricchito = {
      tipoDocumento: "OFFERTA",
      destinatario: {
        ragioneSociale: "Cliente Test SA",
        aca: null,
        via: "Via Prova 1",
        cap: "6900",
        citta: "Lugano",
        clienteId: null,
        isNuovo: false,
      },
      oggetto: "Fornitura serramenti (verifica PDF)",
      corpoTesto: null,
      righe: righeDocumento.map((r) => ({
        descrizione: r.descrizione,
        misure: r.misure,
        unita: r.unita as DocumentoArricchito["righe"][number]["unita"],
        quantita: Number(r.quantita),
        prezzoUnitario: Number(r.prezzo_unitario),
        sconto: r.sconto != null ? Number(r.sconto) : null,
        isTrasporto: r.is_trasporto,
        articoloId: r.articolo_id,
        isNuovo: false,
        art: r.art ?? undefined,
        totaleRiga: r.totale_riga != null ? Number(r.totale_riga) : undefined,
        immagineUrl: r.immagine_url ?? null,
      })),
      condizioniPagamento: ["30 giorni netti"],
      termineFornitura: "4 settimane",
      note: null,
      totali: calcolaTotaliDocumento(
        righeDocumento.map((r) => ({
          quantita: Number(r.quantita),
          prezzoUnitario: Number(r.prezzo_unitario),
          sconto: r.sconto,
        })),
        "OFFERTA",
      ),
    };

    const template = {
      ...DEFAULT_DOCUMENT_TEMPLATE,
      mittente: {
        ragioneSociale: "Santini SA",
        via: "Via Test 1",
        cap: "6500",
        citta: "Bellinzona",
        iva: "CHE-123.456.789",
      },
      banca: { nome: "Banca Test", iban: "CH00 0000 0000 0000 0000 0" },
    };

    // eslint-disable-next-line no-console
    console.log("\n[PDF] totali:", JSON.stringify(documento.totali));

    const { bytes, filename } = await generateDocumentPdfBytes({
      documento,
      righe: righeDocumento,
      template,
      numero: "OFF-TEST-001",
      createdAt: new Date("2026-08-10").toISOString(),
    });

    const outPath = path.join(process.cwd(), "pdf-catalogo-check.pdf");
    writeFileSync(outPath, Buffer.from(bytes));
    // eslint-disable-next-line no-console
    console.log(`[PDF] scritto: ${outPath} (${bytes.length} bytes) file=${filename}`);

    expect(bytes.length).toBeGreaterThan(1000);
  });
});
