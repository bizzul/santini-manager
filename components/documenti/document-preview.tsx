import type { ReactNode } from "react";
import type { DocumentoArricchito } from "@/validation/documenti/extracted-document";
import type { DocumentTemplate } from "@/lib/documenti/template-types";
import { getTipoDocumentoLabel } from "@/lib/documenti/template-types";
import { A4_ASPECT_RATIO, A4_PAGE_WIDTH_MM } from "@/lib/documenti/page-format";
import {
  getDocumentTypeConfig,
  isLetterType,
} from "@/lib/documenti/document-types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DocumentPreviewProps {
  documento: DocumentoArricchito;
  template: DocumentTemplate;
  numero?: string | null;
  dataDocumento?: string;
}

function buildTitoloDocumento(
  tipoDocumento: DocumentoArricchito["tipoDocumento"],
  oggetto: string,
  numero: string | null | undefined,
  showNumber: boolean,
): string {
  const tipo = getTipoDocumentoLabel(tipoDocumento);
  const trimmed = oggetto.trim();

  if (showNumber && /N°:/i.test(trimmed)) {
    return trimmed;
  }

  if (showNumber) {
    return `${tipo} N°: ${numero ?? "—"} - ${trimmed}`;
  }

  return `${tipo}: ${trimmed}`;
}

function ContactLine({ children }: { children: ReactNode }) {
  if (!children || (typeof children === "string" && !children.trim())) {
    return null;
  }
  return <p className="leading-snug">{children}</p>;
}

export function DocumentPreview({
  documento,
  template,
  numero,
  dataDocumento,
}: DocumentPreviewProps) {
  const isLetter = isLetterType(documento.tipoDocumento);
  const typeConfig = getDocumentTypeConfig(documento.tipoDocumento);
  const showSconto = typeConfig?.showDiscount ?? true;
  const showNumber = typeConfig?.hasNumber ?? true;
  const totali = documento.totali ?? {
    totNetto: 0,
    iva: 0,
    totaleCHF: 0,
  };
  const data =
    dataDocumento ??
    new Date().toLocaleDateString("it-CH", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const titoloDocumento = buildTitoloDocumento(
    documento.tipoDocumento,
    documento.oggetto,
    numero,
    showNumber,
  );

  const hasContactBox =
    documento.destinatario.aca ||
    documento.destinatario.via ||
    documento.destinatario.cap ||
    documento.destinatario.citta ||
    documento.destinatario.email;

  return (
    <div
      className="mx-auto w-full shadow-md"
      style={{ maxWidth: `${A4_PAGE_WIDTH_MM}mm` }}
    >
      <div
        className="document-print-preview overflow-y-auto"
        style={{
          aspectRatio: A4_ASPECT_RATIO,
          minHeight: "min(297mm, 75vh)",
        }}
      >
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-0.5">
          {template.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={template.logoUrl}
              alt="Logo"
              className="mb-1.5 h-10 w-auto object-contain"
            />
          ) : null}
          <p className="font-semibold leading-tight">
            {template.mittente.ragioneSociale}
          </p>
          <p className="text-xs leading-snug text-neutral-700">
            {template.mittente.via}
          </p>
          <p className="text-xs leading-snug text-neutral-700">
            {template.mittente.cap} {template.mittente.citta}
          </p>
          <p className="text-xs leading-snug text-neutral-700">
            IVA: {template.mittente.iva}
          </p>
        </div>
        <p className="shrink-0 text-xs text-neutral-600">{data}</p>
      </div>

      <div className="mb-3 space-y-1.5">
        <p className="font-medium leading-tight">
          Spettabile {documento.destinatario.ragioneSociale}
        </p>

        {hasContactBox ? (
          <div className="inline-block max-w-full rounded border border-neutral-300 bg-neutral-50 px-2.5 py-1.5 text-xs leading-snug text-black">
            <ContactLine>
              {documento.destinatario.aca
                ? `a.c.a ${documento.destinatario.aca}`
                : null}
            </ContactLine>
            <ContactLine>{documento.destinatario.via}</ContactLine>
            <ContactLine>
              {[documento.destinatario.cap, documento.destinatario.citta]
                .filter(Boolean)
                .join(" ")}
            </ContactLine>
            <ContactLine>{documento.destinatario.email}</ContactLine>
          </div>
        ) : null}
      </div>

      <p className="mb-2 font-semibold leading-tight">{titoloDocumento}</p>

      {isLetter ? (
        <div className="mb-3 whitespace-pre-wrap text-sm leading-snug">
          {documento.corpoTesto ?? ""}
        </div>
      ) : (
        <>
          <div className="mb-3 overflow-x-auto rounded border border-neutral-300">
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-300 bg-neutral-100 hover:bg-neutral-100">
                  <TableHead className="h-8 px-2 py-1 text-xs font-semibold text-black">
                    Art.
                  </TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs font-semibold text-black">
                    Descrizione
                  </TableHead>
                  <TableHead className="h-8 w-12 px-2 py-1 text-right text-xs font-semibold text-black">
                    U
                  </TableHead>
                  <TableHead className="h-8 w-14 px-2 py-1 text-right text-xs font-semibold text-black">
                    Q
                  </TableHead>
                  <TableHead className="h-8 w-20 px-2 py-1 text-right text-xs font-semibold text-black">
                    Prezzo
                  </TableHead>
                  {showSconto ? (
                    <TableHead className="h-8 w-10 px-2 py-1 text-right text-xs font-semibold text-black">
                      %
                    </TableHead>
                  ) : null}
                  <TableHead className="h-8 w-24 px-2 py-1 text-right text-xs font-semibold text-black">
                    Totale
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documento.righe.map((riga, index) => (
                  <TableRow
                    key={index}
                    className="border-neutral-200 hover:bg-white"
                  >
                    <TableCell className="px-2 py-1.5 align-top text-xs font-medium text-black">
                      {riga.art ?? "—"}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 align-top text-xs text-black">
                      <div className="flex gap-2">
                        {riga.immagineUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={riga.immagineUrl}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded border border-neutral-200 object-cover"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <p className="leading-snug">{riga.descrizione}</p>
                          {riga.descrizioneEstesa ? (
                            <p className="mt-0.5 whitespace-pre-wrap text-xs leading-snug text-neutral-700">
                              {riga.descrizioneEstesa}
                            </p>
                          ) : null}
                          {riga.misure ? (
                            <p className="mt-0.5 text-xs text-neutral-600">
                              Misure: {riga.misure}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-right align-top text-xs text-black">
                      {riga.unita}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-right align-top text-xs text-black">
                      {riga.quantita}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-right align-top text-xs text-black">
                      {riga.prezzoUnitario.toFixed(2)}
                    </TableCell>
                    {showSconto ? (
                      <TableCell className="px-2 py-1.5 text-right align-top text-xs text-black">
                        {riga.sconto != null ? `${riga.sconto}%` : "—"}
                      </TableCell>
                    ) : null}
                    <TableCell className="px-2 py-1.5 text-right align-top text-xs font-medium text-black">
                      {(riga.totaleRiga ?? 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mb-3 flex justify-end">
            <div className="w-52 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Tot. Netto</span>
                <span>{totali.totNetto.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA 8.1%</span>
                <span>{totali.iva.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-neutral-300 pt-1 font-semibold">
                <span>Totale CHF</span>
                <span>{totali.totaleCHF.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {documento.condizioniPagamento.length > 0 ? (
            <div className="mb-2 text-xs">
              <p className="font-semibold">Condizioni di pagamento:</p>
              <ul className="mt-0.5 list-inside list-disc leading-snug">
                {documento.condizioniPagamento.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {documento.termineFornitura ? (
            <div className="mb-2 text-xs">
              <p className="font-semibold">Termine di fornitura:</p>
              <p className="leading-snug">{documento.termineFornitura}</p>
            </div>
          ) : null}
        </>
      )}

      <div className="mt-3 border-t border-neutral-300 pt-2 text-xs leading-snug text-neutral-700">
        <p>{template.banca.nome}</p>
        <p>IBAN: {template.banca.iban}</p>
      </div>
      </div>
      <p className="mt-1 text-center text-[10px] text-muted-foreground">
        Anteprima A4 ({A4_PAGE_WIDTH_MM} × 297 mm)
      </p>
    </div>
  );
}
