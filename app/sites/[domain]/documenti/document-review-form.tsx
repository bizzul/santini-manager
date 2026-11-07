"use client";

import { useMemo, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  DocumentoArricchitoSchema,
  type DocumentoArricchito,
} from "@/validation/documenti/extracted-document";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { MatchBadge } from "@/components/documenti/match-badge";
import { DocumentPreview } from "@/components/documenti/document-preview";
import {
  getDocumentTemplateIssues,
  getDocumentTemplateMissingLabels,
  isDocumentTemplateConfigured,
  type DocumentTemplate,
} from "@/lib/documenti/template-types";
import type { DocumentTypeId } from "@/lib/documenti/document-types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  calcolaTotaleRiga,
  calcolaTotaliDocumento,
} from "@/lib/documenti/calcolo-totali";
import { assignArtCodes } from "@/lib/documenti/art-codes";
import {
  DOCUMENT_TYPES,
  getDocumentTypeConfig,
  isLetterType,
} from "@/lib/documenti/document-types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GenerateErrorsAlert } from "@/components/documenti/generate-errors-alert";
import {
  errorsFromGenerateApiPayload,
  type GenerateApiErrorPayload,
} from "@/lib/documenti/parse-generate-api-response";
import { RigheEditor } from "./righe-editor";
import { CondizioniStep } from "./condizioni-step";
import { OW } from "./wizard-ui";
import { riepilogaCalcoli } from "@/components/documenti/riga-calcolo";

interface DocumentReviewFormProps {
  domain: string;
  /**
   * Istanza react-hook-form del documento. Passata dall'esterno quando la
   * bozza attraversa piu' schermate (wizard a quattro passi): finche' il form
   * nasce qui dentro, nessun altro passo puo' leggerla o scriverla.
   * Se assente il componente ne crea una propria e si comporta come prima.
   */
  form?: UseFormReturn<DocumentoArricchito>;
  siteId: string;
  initialDocumento: DocumentoArricchito;
  templatesByType: Record<DocumentTypeId, DocumentTemplate>;
  sourceText: string;
  documentoId?: string | null;
  taskId?: number | null;
  onBack: () => void;
  onSaved?: () => void;
}

export function DocumentReviewForm({
  domain,
  form: formEsterno,
  initialDocumento,
  templatesByType,
  sourceText,
  documentoId,
  taskId,
  onBack,
  onSaved,
}: DocumentReviewFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [bloccantiConfermati, setBloccantiConfermati] = useState(false);

  // Gli hook vanno chiamati sempre: si crea comunque l'istanza interna e si
  // usa quella esterna quando c'e'.
  const formInterno = useForm<DocumentoArricchito>({
    resolver: zodResolver(DocumentoArricchitoSchema),
    defaultValues: initialDocumento,
  });
  const form = formEsterno ?? formInterno;






  const watched = form.watch();
  const isLetter = isLetterType(watched.tipoDocumento);
  const riepilogo = riepilogaCalcoli(watched.righe ?? []);
  const exportBloccato = riepilogo.bloccanti > 0 && !bloccantiConfermati;

  const typeConfig = getDocumentTypeConfig(watched.tipoDocumento);
  const showDiscount = typeConfig?.showDiscount ?? true;

  const template = useMemo(
    () =>
      templatesByType[watched.tipoDocumento as DocumentTypeId] ??
      templatesByType.OFFERTA,
    [templatesByType, watched.tipoDocumento],
  );

  const previewDocumento = useMemo(() => {
    if (isLetter) {
      return watched;
    }
    const artCodes = assignArtCodes(watched.righe ?? []);
    const righe = (watched.righe ?? []).map((riga, index) => ({
      ...riga,
      art: artCodes[index],
      totaleRiga: calcolaTotaleRiga(
        riga.quantita,
        riga.prezzoUnitario,
        riga.sconto,
        watched.tipoDocumento,
      ),
    }));
    const totali = calcolaTotaliDocumento(righe, watched.tipoDocumento);
    return { ...watched, righe, totali } as DocumentoArricchito;
  }, [watched, isLetter]);


  const onSubmit = async (values: DocumentoArricchito) => {
    setSaveErrors([]);
    try {
      const response = await fetch("/api/documenti", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-domain": domain,
        },
        body: JSON.stringify({
          ...values,
          sourceText,
          documentoId: documentoId ?? undefined,
          taskId: taskId ?? undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errors = errorsFromGenerateApiPayload(
          result as GenerateApiErrorPayload,
          response.status,
        );
        setSaveErrors(errors);
        toast({
          variant: "destructive",
          title: `Salvataggio fallito (${errors.length})`,
          description: errors[0],
        });
        return;
      }

      const savedId = result.documento?.id as string | undefined;

      if (savedId) {
        try {
          const pdfRes = await fetch(`/api/documenti/${savedId}/pdf`, {
            headers: { "x-site-domain": domain },
          });
          if (!pdfRes.ok) {
            const pdfErr = (await pdfRes.json()) as GenerateApiErrorPayload;
            const errors = errorsFromGenerateApiPayload(pdfErr, pdfRes.status);
            setSaveErrors(errors);
            toast({
              variant: "destructive",
              title: `PDF non generato (${errors.length})`,
              description: pdfErr.message ?? errors[0],
            });
          } else {
            setSaveErrors([]);
            const offerNote = result.documento?.offerCreated
              ? ` Offerta kanban ${result.documento.offerCode ?? ""} creata.`
              : "";
            toast({
              description: `Documento ${result.documento?.numero ?? ""} salvato e PDF generato.${offerNote}`,
            });
          }
        } catch {
          toast({
            variant: "destructive",
            description:
              "Documento salvato ma errore di rete nella generazione PDF",
          });
        }
      } else {
        const offerNote = result.documento?.offerCreated
          ? ` Offerta kanban ${result.documento.offerCode ?? ""} creata.`
          : "";
        toast({
          description: `Documento ${result.documento?.numero ?? ""} salvato.${offerNote}`,
        });
      }

      router.refresh();
      onSaved?.() ?? onBack();
    } catch {
      toast({
        variant: "destructive",
        description: "Errore nel salvataggio del documento",
      });
    }
  };

  const templateIssues = useMemo(
    () => getDocumentTemplateIssues(template),
    [template],
  );
  const hasBlockingTemplateIssues = templateIssues.some((issue) => issue.blocking);
  const missingTemplateLabels = useMemo(
    () => getDocumentTemplateMissingLabels(template),
    [template],
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="@container flex w-full min-w-0 flex-col gap-4"
      >
        <GenerateErrorsAlert errors={saveErrors} />
        {templateIssues.length > 0 ? (
          <Alert
            variant={hasBlockingTemplateIssues ? "destructive" : "default"}
            className="py-2"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-sm">
              {hasBlockingTemplateIssues
                ? "Carta intestata incompleta"
                : "Completa la carta intestata"}
            </AlertTitle>
            <AlertDescription className="text-xs">
              {hasBlockingTemplateIssues
                ? `Mancano: ${missingTemplateLabels.join(", ")}. Configurali nelle impostazioni del sito prima di generare il PDF definitivo.`
                : `Per un PDF completo aggiungi: ${missingTemplateLabels.join(", ")} nelle impostazioni del sito.`}
            </AlertDescription>
          </Alert>
        ) : null}

        <h2 className={OW.cardTitle}>Verifica e correggi</h2>

        {/* Due colonne fisse 50/50 (stile inline: bypassa Tailwind) */}
        <div
          className="w-full"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            alignItems: "start",
            gap: "1.5rem",
          }}
        >
          {/* Colonna sinistra */}
          <div className="min-w-0 space-y-3" style={{ minWidth: 0 }}>
          <div className={OW.card}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className={OW.cardTitle}>Destinatario</h3>
              <MatchBadge
                isNuovo={watched.destinatario?.isNuovo ?? true}
                label={
                  watched.destinatario?.isNuovo ? "Nuovo cliente" : undefined
                }
              />
            </div>
            <div className="grid grid-cols-6 gap-x-3 gap-y-2.5">
                <FormField
                  control={form.control}
                  name="destinatario.ragioneSociale"
                  render={({ field }) => (
                    <FormItem className="col-span-6 space-y-0">
                      <FormLabel className={OW.label}>Ragione sociale</FormLabel>
                      <FormControl>
                        <Input className={OW.input} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="destinatario.aca"
                  render={({ field }) => (
                    <FormItem className="col-span-3 space-y-0">
                      <FormLabel className={OW.label}>a.c.a</FormLabel>
                      <FormControl>
                        <Input
                          className={OW.input}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="destinatario.email"
                  render={({ field }) => (
                    <FormItem className="col-span-3 space-y-0">
                      <FormLabel className={OW.label}>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          className={OW.input}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="destinatario.via"
                  render={({ field }) => (
                    <FormItem className="col-span-6 space-y-0">
                      <FormLabel className={OW.label}>Via</FormLabel>
                      <FormControl>
                        <Input
                          className={OW.input}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="destinatario.cap"
                  render={({ field }) => (
                    <FormItem className="col-span-2 space-y-0">
                      <FormLabel className={OW.label}>CAP</FormLabel>
                      <FormControl>
                        <Input
                          className={OW.input}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="destinatario.citta"
                  render={({ field }) => (
                    <FormItem className="col-span-4 space-y-0">
                      <FormLabel className={OW.label}>Città</FormLabel>
                      <FormControl>
                        <Input
                          className={OW.input}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
          </div>

          <div className="grid gap-3 @md:grid-cols-[12rem_minmax(0,1fr)]">
          <div className={OW.card}>
            <FormField
              control={form.control}
              name="tipoDocumento"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className={OW.label}>Tipo documento</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className={OW.input}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className={OW.card}>
            <FormField
              control={form.control}
              name="oggetto"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className={OW.label}>Oggetto</FormLabel>
                  <FormControl>
                    <Input className={OW.input} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

            {isLetter ? (
              <>
                <FormField
                  control={form.control}
                  name="corpoTesto"
                  render={({ field }) => (
                    <FormItem className="space-y-0.5">
                      <FormLabel className={OW.label}>Corpo lettera</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={12}
                          className={`text-sm ${OW.input}`}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem className="space-y-0.5">
                      <FormLabel className={OW.label}>Note</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          className={`text-sm ${OW.input}`}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </>
            ) : (
            <>
              <RigheEditor
                form={form}
                domain={domain}
                showDiscount={showDiscount}
              />

                <CondizioniStep form={form} />
            </>
            )}

            <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-[var(--ow-border)] bg-[var(--ow-page)]/95 py-3 backdrop-blur-sm">
              <Button
                type="button"
                variant="outline"
                className={OW.btnSecondary}
                onClick={onBack}
              >
                Indietro
              </Button>
              {riepilogo.bloccanti > 0 ? (
                <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--ow-warn-text)]">
                  <input
                    type="checkbox"
                    checked={bloccantiConfermati}
                    onChange={(e) => setBloccantiConfermati(e.target.checked)}
                    className="h-4 w-4 accent-current"
                  />
                  Ho quotato a mano le posizioni segnalate
                </label>
              ) : null}
              <Button
                type="submit"
                className={`ml-auto ${OW.btnPrimary}`}
                disabled={
                  form.formState.isSubmitting ||
                  exportBloccato ||
                  !isDocumentTemplateConfigured(template)
                }
              >
                {form.formState.isSubmitting
                  ? "Salvataggio..."
                  : "Salva e genera PDF"}
              </Button>
            </div>
          </div>

          <aside
            className="w-full"
            style={{ minWidth: 0, position: "sticky", top: "1rem" }}
          >
            <p className={`mb-2 ${OW.cardTitle}`}>Anteprima</p>
            <DocumentPreview
              documento={previewDocumento}
              template={template}
            />
          </aside>
        </div>
      </form>
    </Form>
  );
}
