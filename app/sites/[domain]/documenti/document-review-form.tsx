"use client";

import { useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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

interface DocumentReviewFormProps {
  domain: string;
  siteId: string;
  initialDocumento: DocumentoArricchito;
  template: DocumentTemplate;
  sourceText: string;
  documentoId?: string | null;
  taskId?: number | null;
  onBack: () => void;
  onSaved?: () => void;
}

export function DocumentReviewForm({
  domain,
  initialDocumento,
  template,
  sourceText,
  documentoId,
  taskId,
  onBack,
  onSaved,
}: DocumentReviewFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [saveErrors, setSaveErrors] = useState<string[]>([]);

  const form = useForm<DocumentoArricchito>({
    resolver: zodResolver(DocumentoArricchitoSchema),
    defaultValues: initialDocumento,
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "righe",
  });

  const watched = form.watch();
  const isLetter = isLetterType(watched.tipoDocumento);
  const typeConfig = getDocumentTypeConfig(watched.tipoDocumento);
  const showDiscount = typeConfig?.showDiscount ?? true;

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

  const applySuggestedArticolo = (
    index: number,
    candidate: NonNullable<
      DocumentoArricchito["righe"][number]["articoliSuggeriti"]
    >[number],
  ) => {
    const currentPrice = form.getValues(`righe.${index}.prezzoUnitario`);
    form.setValue(`righe.${index}.descrizione`, candidate.descrizione);
    form.setValue(`righe.${index}.articoloId`, candidate.id);
    form.setValue(`righe.${index}.articoloSource`, "sell_product");
    form.setValue(`righe.${index}.isNuovo`, false);
    form.setValue(`righe.${index}.immagineUrl`, candidate.immagineUrl ?? null);
    if (candidate.unita) {
      form.setValue(
        `righe.${index}.unita`,
        candidate.unita as DocumentoArricchito["righe"][number]["unita"],
      );
    }
    if (!(currentPrice > 0) && candidate.prezzo != null && candidate.prezzo > 0) {
      form.setValue(`righe.${index}.prezzoUnitario`, candidate.prezzo);
    }
    form.setValue(`righe.${index}.articoliSuggeriti`, undefined);
  };

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
    <div className="grid gap-5 lg:grid-cols-2">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
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

          <h2 className="text-base font-semibold">Verifica e correggi</h2>

          <div className="max-w-lg rounded-md border border-border/70 bg-muted/15 p-2.5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Destinatario
              </p>
              <MatchBadge isNuovo={watched.destinatario?.isNuovo ?? true} />
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              <FormField
                control={form.control}
                name="destinatario.ragioneSociale"
                render={({ field }) => (
                  <FormItem className="col-span-2 space-y-0.5">
                    <FormLabel className="text-xs">Ragione sociale</FormLabel>
                    <FormControl>
                      <Input className="h-8 text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="destinatario.aca"
                render={({ field }) => (
                  <FormItem className="space-y-0.5">
                    <FormLabel className="text-xs">a.c.a</FormLabel>
                    <FormControl>
                      <Input
                        className="h-8 text-sm"
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
                  <FormItem className="space-y-0.5">
                    <FormLabel className="text-xs">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        className="h-8 text-sm"
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
                  <FormItem className="col-span-2 space-y-0.5">
                    <FormLabel className="text-xs">Via</FormLabel>
                    <FormControl>
                      <Input
                        className="h-8 text-sm"
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
                  <FormItem className="space-y-0.5">
                    <FormLabel className="text-xs">CAP</FormLabel>
                    <FormControl>
                      <Input
                        className="h-8 text-sm"
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
                  <FormItem className="space-y-0.5">
                    <FormLabel className="text-xs">Città</FormLabel>
                    <FormControl>
                      <Input
                        className="h-8 text-sm"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)]">
            <FormField
              control={form.control}
              name="tipoDocumento"
              render={({ field }) => (
                <FormItem className="space-y-0.5">
                  <FormLabel className="text-xs">Tipo documento</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-8 text-sm">
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

            <FormField
              control={form.control}
              name="oggetto"
              render={({ field }) => (
                <FormItem className="space-y-0.5">
                  <FormLabel className="text-xs">Oggetto</FormLabel>
                  <FormControl>
                    <Input className="h-8 text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {isLetter ? (
            <FormField
              control={form.control}
              name="corpoTesto"
              render={({ field }) => (
                <FormItem className="space-y-0.5">
                  <FormLabel className="text-xs">Corpo lettera</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={12}
                      className="text-sm"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Righe articolo</p>
                {fields.map((field, index) => {
                  const riga = watched.righe?.[index];
                  const importoRiga = calcolaTotaleRiga(
                    riga?.quantita ?? 0,
                    riga?.prezzoUnitario ?? 0,
                    riga?.sconto,
                    watched.tipoDocumento,
                  );

                  return (
                    <div
                      key={field.id}
                      className="space-y-2 rounded-md border border-border/70 bg-muted/10 p-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex h-5 min-w-5 items-center justify-center rounded bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground">
                          {index + 1}
                        </span>
                        <MatchBadge isNuovo={riga?.isNuovo ?? true} />
                      </div>

                      {(riga?.articoliSuggeriti?.length ?? 0) > 0 ? (
                        <Select
                          onValueChange={(value) => {
                            const candidate = riga?.articoliSuggeriti?.find(
                              (item) => String(item.id) === value,
                            );
                            if (candidate) {
                              applySuggestedArticolo(index, candidate);
                            }
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Corrispondenze catalogo…" />
                          </SelectTrigger>
                          <SelectContent>
                            {riga?.articoliSuggeriti?.map((item) => (
                              <SelectItem
                                key={String(item.id)}
                                value={String(item.id)}
                              >
                                {item.codice ? `${item.codice} — ` : ""}
                                {item.descrizione}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}

                      <div className="flex gap-2">
                        {riga?.immagineUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={riga.immagineUrl}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded border object-cover"
                          />
                        ) : null}
                        <FormField
                          control={form.control}
                          name={`righe.${index}.descrizione`}
                          render={({ field: f }) => (
                            <FormItem className="flex-1 space-y-0.5">
                              <FormLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Descrizione
                              </FormLabel>
                              <FormControl>
                                <Textarea
                                  rows={2}
                                  className="min-h-[3.5rem] resize-y py-1.5 text-sm leading-snug"
                                  {...f}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div
                        className={`grid gap-x-2 gap-y-1 ${
                          showDiscount ? "grid-cols-5" : "grid-cols-4"
                        }`}
                      >
                        <FormField
                          control={form.control}
                          name={`righe.${index}.unita`}
                          render={({ field: f }) => (
                            <FormItem className="space-y-0.5">
                              <FormLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                U
                              </FormLabel>
                              <FormControl>
                                <Input
                                  className="h-8 px-1.5 text-center text-sm"
                                  {...f}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`righe.${index}.quantita`}
                          render={({ field: f }) => (
                            <FormItem className="space-y-0.5">
                              <FormLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Q
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="any"
                                  className="h-8 px-1.5 text-center text-sm"
                                  {...f}
                                  onChange={(e) =>
                                    f.onChange(parseFloat(e.target.value) || 0)
                                  }
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`righe.${index}.prezzoUnitario`}
                          render={({ field: f }) => (
                            <FormItem className="space-y-0.5">
                              <FormLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Prezzo
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="any"
                                  className="h-8 px-1.5 text-right text-sm"
                                  {...f}
                                  onChange={(e) =>
                                    f.onChange(parseFloat(e.target.value) || 0)
                                  }
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        {showDiscount ? (
                          <FormField
                            control={form.control}
                            name={`righe.${index}.sconto`}
                            render={({ field: f }) => (
                              <FormItem className="space-y-0.5">
                                <FormLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  % Sc
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="any"
                                    className="h-8 px-1.5 text-center text-sm"
                                    value={f.value ?? ""}
                                    onChange={(e) =>
                                      f.onChange(
                                        e.target.value
                                          ? parseFloat(e.target.value)
                                          : null,
                                      )
                                    }
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        ) : null}
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Importo
                          </p>
                          <Input
                            readOnly
                            tabIndex={-1}
                            className="h-8 bg-muted/40 px-1.5 text-right text-sm font-medium"
                            value={importoRiga.toFixed(2)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <FormField
                control={form.control}
                name="termineFornitura"
                render={({ field }) => (
                  <FormItem className="space-y-0.5">
                    <FormLabel className="text-xs">Termine di fornitura</FormLabel>
                    <FormControl>
                      <Input
                        className="h-8 text-sm"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onBack}>
              Indietro
            </Button>
            <Button
              type="submit"
              disabled={
                form.formState.isSubmitting || !isDocumentTemplateConfigured(template)
              }
            >
              {form.formState.isSubmitting
                ? "Salvataggio..."
                : "Salva e genera PDF"}
            </Button>
          </div>
        </form>
      </Form>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <p className="mb-3 text-sm font-medium text-muted-foreground">
          Anteprima
        </p>
        <DocumentPreview documento={previewDocumento} template={template} />
      </div>
    </div>
  );
}
