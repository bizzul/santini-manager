"use client";

import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DocumentoArricchitoSchema,
  type DocumentoArricchito,
  type RigaArricchita,
} from "@/validation/documenti/extracted-document";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { getDocumentTypeConfig } from "@/lib/documenti/document-types";
import type { DocumentTypeId } from "@/lib/documenti/document-types";
import type { DocumentTemplate } from "@/lib/documenti/template-types";
import { useDocumentAllegati } from "@/hooks/use-document-allegati";
import {
  errorsFromFetchFailure,
  errorsFromGenerateApiPayload,
  type GenerateApiErrorPayload,
} from "@/lib/documenti/parse-generate-api-response";
import {
  DocumentCreateForm,
  type BozzaPasso1,
  type ClienteOption,
  type FornitoreOption,
  type OffertaOption,
} from "./document-create-form";
import { RigheEditor } from "./righe-editor";
import { CategorieSelector } from "./categorie-selector";
import {
  templateToRighe,
  type OffertaTemplate,
} from "@/lib/documenti/offerta-template";
import { ContestoStep } from "./contesto-step";
import { DocumentReviewForm } from "./document-review-form";

/**
 * Wizard di creazione offerta in quattro passi.
 *
 * Il flusso storico raccoglieva tutto in una schermata e passava il testo
 * libero all'AI, che costruiva il documento da zero. Qui la struttura viene
 * prima: si sceglie il cliente, si compongono le posizioni, e solo dopo
 * arrivano nota vocale e allegati. L'AI arricchisce qualcosa che esiste gia',
 * e il motore prezzi calcola su misure vere.
 */

type Passo = "impostazione" | "posizioni" | "contesto" | "verifica";

const PASSI: { id: Passo; etichetta: string }[] = [
  { id: "impostazione", etichetta: "Impostazione" },
  { id: "posizioni", etichetta: "Posizioni" },
  { id: "contesto", etichetta: "Contesto e condizioni" },
  { id: "verifica", etichetta: "Verifica ed export" },
];

function documentoVuoto(bozza: BozzaPasso1): DocumentoArricchito {
  return {
    tipoDocumento: bozza.tipoDocumento,
    destinatario: {
      ...bozza.destinatario,
      clienteId:
        bozza.destinatario.tipo === "cliente"
          ? (bozza.destinatario.entityId ?? null)
          : null,
      fornitoreId:
        bozza.destinatario.tipo === "fornitore"
          ? (bozza.destinatario.entityId ?? null)
          : null,
      isNuovo: false,
    },
    oggetto: bozza.oggetto,
    righe: [],
    condizioniPagamento: [],
    termineFornitura: null,
    note: null,
    corpoTesto: null,
    allegati: [],
  } as DocumentoArricchito;
}

/** Chiave per capire se una riga dell'AI duplica una gia' presente. */
function chiaveRiga(r: RigaArricchita): string {
  return (r.descrizione ?? "").trim().toLowerCase();
}

interface OffertaWizardProps {
  domain: string;
  siteId: string;
  clients: ClienteOption[];
  suppliers: FornitoreOption[];
  offers?: OffertaOption[];
  templatesByType: Record<DocumentTypeId, DocumentTemplate>;
  onCancel: () => void;
  onSaved?: () => void;
}

export function OffertaWizard({
  domain,
  siteId,
  clients,
  suppliers,
  offers = [],
  templatesByType,
  onCancel,
  onSaved,
}: OffertaWizardProps) {
  const { toast } = useToast();
  const [passo, setPasso] = useState<Passo>("impostazione");
  const [bozza, setBozza] = useState<BozzaPasso1 | null>(null);
  const [testo, setTesto] = useState("");
  const [isElaborando, setIsElaborando] = useState(false);
  const [elaborazioneErrori, setElaborazioneErrori] = useState<string[]>([]);
  const [categorieScelte, setCategorieScelte] = useState<string[]>([]);
  const [templates, setTemplates] = useState<OffertaTemplate[]>([]);

  const { allegati, setAllegati, isUploading, uploadAttachment } =
    useDocumentAllegati(siteId);

  const form = useForm<DocumentoArricchito>({
    resolver: zodResolver(DocumentoArricchitoSchema),
    defaultValues: {
      tipoDocumento: "OFFERTA",
      destinatario: {
        tipo: "manuale",
        ragioneSociale: "",
        clienteId: null,
        isNuovo: false,
      },
      oggetto: "",
      righe: [],
      condizioniPagamento: [],
    } as unknown as DocumentoArricchito,
  });

  const tipoDocumento = form.watch("tipoDocumento");
  const showDiscount =
    getDocumentTypeConfig(tipoDocumento)?.showDiscount ?? true;

  const vaiA = useCallback((p: Passo) => {
    setPasso(p);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }, []);

  // Una lettera non ha posizioni: il passo 2 non avrebbe nulla da mostrare.
  const haPosizioni = (tipo: DocumentTypeId) =>
    getDocumentTypeConfig(tipo)?.hasLineItems ?? true;

  const avviaDaPasso1 = (b: BozzaPasso1) => {
    setBozza(b);
    const doc = documentoVuoto(b);
    if (haPosizioni(b.tipoDocumento) && categorieScelte.length > 0) {
      doc.righe = templates
        .filter((t) => categorieScelte.includes(t.id))
        .flatMap(templateToRighe);
    }
    form.reset(doc);
    vaiA(haPosizioni(b.tipoDocumento) ? "posizioni" : "contesto");
  };

  /**
   * Elabora: l'AI arricchisce il documento, poi il motore prezza le
   * posizioni. Le righe costruite a mano non vengono mai sostituite: quelle
   * che l'AI propone in piu' si accodano.
   */
  const elabora = async () => {
    if (!bozza) return;
    setIsElaborando(true);
    setElaborazioneErrori([]);
    try {
      const righeUtente = form.getValues("righe") ?? [];

      if (testo.trim()) {
        const response = await fetch("/api/documenti/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-site-domain": domain,
          },
          body: JSON.stringify({
            tipoDocumento: bozza.tipoDocumento,
            destinatario: bozza.destinatario,
            oggetto: bozza.oggetto,
            testo: testo.trim(),
            allegati,
            taskId: bozza.taskId,
            offertaCodice:
              bozza.taskId != null
                ? (offers.find((o) => o.id === bozza.taskId)?.unique_code ??
                  null)
                : null,
          }),
        });

        const responseText = await response.text();
        let result: GenerateApiErrorPayload & {
          documento?: DocumentoArricchito;
        } = {};
        try {
          result = responseText ? JSON.parse(responseText) : {};
        } catch {
          setElaborazioneErrori(
            errorsFromFetchFailure(new Error("Risposta server non JSON")),
          );
          return;
        }

        if (!response.ok || !result.documento) {
          setElaborazioneErrori(
            errorsFromGenerateApiPayload(result, response.status),
          );
          return;
        }

        const presenti = new Set(righeUtente.map(chiaveRiga));
        const aggiunte = (result.documento.righe ?? []).filter(
          (r) => !presenti.has(chiaveRiga(r)),
        );

        form.setValue("righe", [...righeUtente, ...aggiunte]);
        if (!form.getValues("corpoTesto")) {
          form.setValue("corpoTesto", result.documento.corpoTesto ?? null);
        }
        if ((form.getValues("condizioniPagamento") ?? []).length === 0) {
          form.setValue(
            "condizioniPagamento",
            result.documento.condizioniPagamento ?? [],
          );
        }
        if (!form.getValues("termineFornitura")) {
          form.setValue(
            "termineFornitura",
            result.documento.termineFornitura ?? null,
          );
        }
      }

      form.setValue("allegati", allegati);
      await prezzaRighe();
      vaiA("verifica");
    } catch (error) {
      setElaborazioneErrori(errorsFromFetchFailure(error));
    } finally {
      setIsElaborando(false);
    }
  };

  /** Chiede al motore un prezzo per ogni riga che ha una configurazione. */
  const prezzaRighe = async () => {
    const righe = form.getValues("righe") ?? [];
    for (let i = 0; i < righe.length; i += 1) {
      const conf = righe[i].configurazione;
      if (!conf?.sellProductId) continue;
      try {
        const res = await fetch("/api/listino/valuta-riga", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-site-domain": domain,
          },
          body: JSON.stringify({
            ...conf,
            quantita: righe[i].quantita,
            prezzoForzato:
              righe[i].prezzoUnitario > 0 ? righe[i].prezzoUnitario : null,
          }),
        });
        if (!res.ok) continue;
        const { riga } = await res.json();
        form.setValue(`righe.${i}.prezzoUnitario`, riga.prezzoUnitario ?? 0);
        form.setValue(`righe.${i}.calcolo`, {
          stato: riga.stato,
          prezzoUnitario: riga.prezzoUnitario ?? 0,
          codiceErrore: riga.codiceErrore ?? null,
          avvisi: riga.avvisi ?? [],
          breakdown: riga.breakdown ?? null,
          calcolatoIl: new Date().toISOString(),
        });
      } catch {
        // Una riga che non si riesce a prezzare resta come sta: la
        // schermata di verifica la segnalera' comunque.
      }
    }
  };

  const passiVisibili = useMemo(
    () =>
      bozza && !haPosizioni(bozza.tipoDocumento)
        ? PASSI.filter((p) => p.id !== "posizioni")
        : PASSI,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bozza],
  );
  const indiceCorrente = passiVisibili.findIndex((p) => p.id === passo);

  const stepper = useMemo(
    () => (
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Passi">
        {passiVisibili.map((p, i) => {
          const attivo = p.id === passo;
          const fatto = i < indiceCorrente;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => (fatto ? vaiA(p.id) : undefined)}
              disabled={!fatto && !attivo}
              aria-current={attivo ? "step" : undefined}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                attivo
                  ? "border-primary bg-primary/10 font-medium"
                  : fatto
                    ? "cursor-pointer border-border text-muted-foreground hover:bg-muted/40"
                    : "border-border/60 text-muted-foreground/60"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                  fatto
                    ? "bg-success text-success-foreground"
                    : attivo
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {fatto ? "✓" : i + 1}
              </span>
              {p.etichetta}
            </button>
          );
        })}
      </nav>
    ),
    [passo, indiceCorrente, passiVisibili, vaiA],
  );

  return (
    <div>
      {stepper}

      {passo === "impostazione" ? (
        <DocumentCreateForm
          domain={domain}
          siteId={siteId}
          clients={clients}
          suppliers={suppliers}
          offers={offers}
          mode="wizard"
          onNext={avviaDaPasso1}
          onGenerated={() => undefined}
          onCancel={onCancel}
          extra={
            <CategorieSelector
              domain={domain}
              value={categorieScelte}
              onChange={setCategorieScelte}
              onTemplatesLoaded={setTemplates}
            />
          }
        />
      ) : null}

      {passo === "posizioni" ? (
        <Form {...form}>
        <div className="space-y-4">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
            Le posizioni delle categorie scelte sono gia&apos; qui con il loro
            testo descrittivo: tocca solo misure e quantita&apos;.{" "}
            <strong>Lascia il prezzo vuoto</strong> per farlo calcolare dal
            listino quando elabori l&apos;offerta; scrivilo solo per forzarlo.
          </div>
          <RigheEditor
            form={form}
            domain={domain}
            showDiscount={showDiscount}
          />
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => vaiA("impostazione")}
            >
              Indietro
            </Button>
            <Button type="button" onClick={() => vaiA("contesto")}>
              Avanti &mdash; Contesto
            </Button>
          </div>
        </div>
        </Form>
      ) : null}

      {passo === "contesto" ? (
        <Form {...form}>
        <ContestoStep
          domain={domain}
          siteId={siteId}
          form={form}
          testo={testo}
          onTestoChange={(v) =>
            setTesto((prev) => (typeof v === "function" ? v(prev) : v))
          }
          allegati={allegati}
          setAllegati={setAllegati}
          isUploading={isUploading}
          uploadAttachment={uploadAttachment}
          elaborazioneErrori={elaborazioneErrori}
          isElaborando={isElaborando}
          onIndietro={() =>
            vaiA(
              bozza && !haPosizioni(bozza.tipoDocumento)
                ? "impostazione"
                : "posizioni",
            )
          }
          onElabora={elabora}
        />
        </Form>
      ) : null}

      {passo === "verifica" ? (
        <DocumentReviewForm
          domain={domain}
          siteId={siteId}
          form={form}
          initialDocumento={form.getValues()}
          templatesByType={templatesByType}
          sourceText={testo}
          taskId={bozza?.taskId ?? null}
          onBack={() => vaiA("contesto")}
          onSaved={() => {
            toast({ description: "Offerta salvata." });
            onSaved?.();
          }}
        />
      ) : null}
    </div>
  );
}
