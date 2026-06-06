import type { DocumentoArricchito } from "@/validation/documenti/extracted-document";
import type { DocumentTemplate } from "@/lib/documenti/template-types";
import {
  getDestinatarioLabel,
  getTipoDocumentoLabel,
} from "@/lib/documenti/template-types";
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

  return (
    <div
      className="rounded-lg border bg-card p-6 text-sm shadow-sm"
      style={{ color: template.colori.testo }}
    >
      <div className="mb-6 flex items-start justify-between gap-6">
        <div className="space-y-1">
          {template.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={template.logoUrl}
              alt="Logo"
              className="mb-3 h-12 w-auto object-contain"
            />
          ) : null}
          <p className="font-semibold">{template.mittente.ragioneSociale}</p>
          <p>{template.mittente.via}</p>
          <p>
            {template.mittente.cap} {template.mittente.citta}
          </p>
          <p>IVA: {template.mittente.iva}</p>
        </div>
        <p className="text-muted-foreground">{data}</p>
      </div>

      <div className="mb-6 flex justify-end">
        <div className="space-y-1 text-right">
          <p className="font-medium">Spettabile</p>
          <p>{documento.destinatario.ragioneSociale}</p>
          {documento.destinatario.aca ? (
            <p>a.c.a {documento.destinatario.aca}</p>
          ) : null}
          {documento.destinatario.via ? (
            <p>{documento.destinatario.via}</p>
          ) : null}
          {documento.destinatario.cap || documento.destinatario.citta ? (
            <p>
              {[documento.destinatario.cap, documento.destinatario.citta]
                .filter(Boolean)
                .join(" ")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-baseline gap-2">
        <span className="font-semibold">
          {getTipoDocumentoLabel(documento.tipoDocumento)}
          {showNumber ? " N°:" : ":"}
        </span>
        {showNumber ? <span>{numero ?? "—"}</span> : null}
        {showNumber ? <span>-</span> : null}
        <span>{documento.oggetto}</span>
      </div>

      {isLetter ? (
        <div className="mb-6 whitespace-pre-wrap leading-relaxed">
          {documento.corpoTesto ?? ""}
        </div>
      ) : (
        <>
          <p className="mb-4">
            <span className="font-semibold">
              {getDestinatarioLabel(documento.tipoDocumento)}{" "}
            </span>
            {documento.destinatario.ragioneSociale}
          </p>

          <div className="mb-6 overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Art.</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead className="w-14 text-right">U</TableHead>
                  <TableHead className="w-20 text-right">Q</TableHead>
                  <TableHead className="w-24 text-right">Prezzo</TableHead>
                  {showSconto ? (
                    <TableHead className="w-14 text-right">%</TableHead>
                  ) : null}
                  <TableHead className="w-28 text-right">Totale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documento.righe.map((riga, index) => (
                  <TableRow key={index}>
                    <TableCell className="align-top font-medium">
                      {riga.art ?? "—"}
                    </TableCell>
                    <TableCell className="align-top">
                      <p>{riga.descrizione}</p>
                      {riga.misure ? (
                        <p className="mt-1 text-muted-foreground">
                          Misure: {riga.misure}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right align-top">
                      {riga.unita}
                    </TableCell>
                    <TableCell className="text-right align-top">
                      {riga.quantita}
                    </TableCell>
                    <TableCell className="text-right align-top">
                      {riga.prezzoUnitario.toFixed(2)}
                    </TableCell>
                    {showSconto ? (
                      <TableCell className="text-right align-top">
                        {riga.sconto != null ? `${riga.sconto}%` : "—"}
                      </TableCell>
                    ) : null}
                    <TableCell className="text-right align-top font-medium">
                      {(riga.totaleRiga ?? 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mb-6 flex justify-end">
            <div className="w-56 space-y-2">
              <div className="flex justify-between">
                <span>Tot. Netto</span>
                <span>{totali.totNetto.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA 8.1%</span>
                <span>{totali.iva.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Totale CHF</span>
                <span>{totali.totaleCHF.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {documento.condizioniPagamento.length > 0 ? (
            <div className="mb-4">
              <p className="font-semibold">Condizioni di pagamento:</p>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {documento.condizioniPagamento.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {documento.termineFornitura ? (
            <div className="mb-4">
              <p className="font-semibold">Termine di fornitura:</p>
              <p className="text-muted-foreground">
                {documento.termineFornitura}
              </p>
            </div>
          ) : null}
        </>
      )}

      <div className="mt-6 border-t pt-4">
        <p>{template.banca.nome}</p>
        <p>IBAN: {template.banca.iban}</p>
      </div>
    </div>
  );
}
