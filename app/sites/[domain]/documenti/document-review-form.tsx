"use client";

import { useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  DocumentoArricchitoSchema,
  UnitaEnum,
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
import { AlertCircle, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
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

const UNITA_OPTIONS = UnitaEnum.options;

interface DocumentReviewFormProps {
  domain: string;
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
  const [uploadingImageIndex, setUploadingImageIndex] = useState<number | null>(
    null,
  );

  const form = useForm<DocumentoArricchito>({
    resolver: zodResolver(DocumentoArricchitoSchema),
    defaultValues: initialDocumento,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "righe",
  });

  const addRiga = () => {
    const newIndex = fields.length;
    append(
      {
        descrizione: "",
        descrizioneEstesa: null,
        misure: null,
        unita: "Pz.",
        quantita: 1,
        prezzoUnitario: 0,
        sconto: null,
        isTrasporto: false,
        articoloId: null,
        isNuovo: true,
        immagineUrl: null,
      },
      { focusName: `righe.${newIndex}.descrizione` },
    );
  };

  const uploadRigaImage = async (index: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        description: "Il file deve essere un'immagine (JPEG, PNG, WebP)",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        description: "Immagine troppo grande (max 5 MB)",
      });
      return;
    }

    setUploadingImageIndex(index);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `/api/sites/${domain}/documenti/riga-image`,
        {
          method: "POST",
          headers: { "x-site-domain": domain },
          body: formData,
        },
      );

      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Caricamento fallito");
      }

      form.setValue(`righe.${index}.immagineUrl`, data.url, {
        shouldDirty: true,
      });
      toast({ description: "Immagine caricata" });
    } catch (error) {
      toast({
        variant: "destructive",
        description:
          error instanceof Error
            ? error.message
            : "Errore nel caricamento dell'immagine",
      });
    } finally {
      setUploadingImageIndex(null);
    }
  };

  const watched = form.watch();
  const isLetter = isLetterType(watched.tipoDocumento);
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

        <h2 className="text-sm font-semibold tracking-tight">
          Verifica e correggi
        </h2>

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
          <div className="rounded-md border border-border/70 bg-muted/15 p-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Destinatario
              </p>
              <MatchBadge
                isNuovo={watched.destinatario?.isNuovo ?? true}
                label={
                  watched.destinatario?.isNuovo ? "Nuovo cliente" : undefined
                }
              />
            </div>
            <div className="grid grid-cols-6 gap-x-2 gap-y-1">
                <FormField
                  control={form.control}
                  name="destinatario.ragioneSociale"
                  render={({ field }) => (
                    <FormItem className="col-span-6 space-y-0">
                      <FormLabel className="text-[11px]">Ragione sociale</FormLabel>
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
                    <FormItem className="col-span-3 space-y-0">
                      <FormLabel className="text-[11px]">a.c.a</FormLabel>
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
                    <FormItem className="col-span-3 space-y-0">
                      <FormLabel className="text-[11px]">Email</FormLabel>
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
                    <FormItem className="col-span-6 space-y-0">
                      <FormLabel className="text-[11px]">Via</FormLabel>
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
                    <FormItem className="col-span-2 space-y-0">
                      <FormLabel className="text-[11px]">CAP</FormLabel>
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
                    <FormItem className="col-span-4 space-y-0">
                      <FormLabel className="text-[11px]">Città</FormLabel>
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

          <div className="grid gap-2 @md:grid-cols-[11rem_minmax(0,1fr)]">
          <div className="rounded-md border border-border/70 bg-muted/15 p-2">
            <FormField
              control={form.control}
              name="tipoDocumento"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="text-[11px]">Tipo documento</FormLabel>
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
          </div>

          <div className="rounded-md border border-border/70 bg-muted/15 p-2">
            <FormField
              control={form.control}
              name="oggetto"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="text-[11px]">Oggetto</FormLabel>
                  <FormControl>
                    <Input className="h-8 text-sm" {...field} />
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
                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem className="space-y-0.5">
                      <FormLabel className="text-xs">Note</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          className="text-sm"
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
              <div className="overflow-hidden rounded-md border border-border/70">
                <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-muted/20 px-3 py-2">
                  <p className="text-sm font-medium">Righe articolo</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={addRiga}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Nuova riga
                  </Button>
                </div>

                {fields.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
                    <p>Nessuna riga articolo.</p>
                    <Button type="button" variant="outline" size="sm" onClick={addRiga}>
                      <Plus className="mr-1.5 h-4 w-4" />
                      Aggiungi la prima riga
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
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
                          className="space-y-1.5 bg-muted/5 p-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="flex h-5 min-w-5 items-center justify-center rounded bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
                                {index + 1}
                              </span>
                              <MatchBadge
                                isNuovo={riga?.isNuovo ?? true}
                                label={
                                  riga?.isNuovo ? "Nuovo articolo" : "Da catalogo"
                                }
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => remove(index)}
                              aria-label={`Rimuovi riga ${index + 1}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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

                          <div className="grid gap-1.5 sm:grid-cols-[2.75rem_minmax(0,1fr)]">
                            <div>
                              {riga?.immagineUrl ? (
                                <div className="group relative h-11 w-11">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={riga.immagineUrl}
                                    alt=""
                                    className="h-11 w-11 rounded border object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      form.setValue(
                                        `righe.${index}.immagineUrl`,
                                        null,
                                        { shouldDirty: true },
                                      )
                                    }
                                    className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                                    aria-label="Rimuovi immagine"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              ) : (
                                <label
                                  className="flex h-11 w-11 cursor-pointer flex-col items-center justify-center rounded border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                                  title="Carica immagine"
                                >
                                  {uploadingImageIndex === index ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <ImagePlus className="h-3.5 w-3.5" />
                                  )}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={uploadingImageIndex === index}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) uploadRigaImage(index, file);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                            <FormField
                              control={form.control}
                              name={`righe.${index}.descrizione`}
                              render={({ field: f }) => (
                                <FormItem className="space-y-0">
                                  <FormLabel className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Descrizione
                                  </FormLabel>
                                  <FormControl>
                                    <Textarea
                                      rows={1}
                                      className="min-h-[2.25rem] resize-y py-1 text-sm leading-snug"
                                      {...f}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name={`righe.${index}.descrizioneEstesa`}
                            render={({ field: f }) => (
                              <FormItem className="space-y-0">
                                <FormLabel className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                  Dettaglio (opz.)
                                </FormLabel>
                                <FormControl>
                                  <Textarea
                                    rows={1}
                                    placeholder="Note tecniche, dettagli…"
                                    className="min-h-[2rem] resize-y py-1 text-sm leading-snug"
                                    {...f}
                                    value={f.value ?? ""}
                                    onChange={(e) =>
                                      f.onChange(e.target.value || null)
                                    }
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <div
                            className={`grid gap-1 ${
                              showDiscount
                                ? "grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)]"
                                : "grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)]"
                            }`}
                          >
                            <FormField
                              control={form.control}
                              name={`righe.${index}.unita`}
                              render={({ field: f }) => (
                                <FormItem className="space-y-0">
                                  <FormLabel className="text-[10px] font-medium uppercase text-muted-foreground">
                                    U
                                  </FormLabel>
                                  <Select
                                    value={f.value}
                                    onValueChange={f.onChange}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="h-7 px-1 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {UNITA_OPTIONS.map((u) => (
                                        <SelectItem key={u} value={u}>
                                          {u}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`righe.${index}.quantita`}
                              render={({ field: f }) => (
                                <FormItem className="space-y-0">
                                  <FormLabel className="text-[10px] font-medium uppercase text-muted-foreground">
                                    Q
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="any"
                                      className="h-7 px-1 text-center text-xs"
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
                                <FormItem className="space-y-0">
                                  <FormLabel className="text-[10px] font-medium uppercase text-muted-foreground">
                                    Prezzo
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="any"
                                      className="h-7 px-1 text-right text-xs"
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
                                  <FormItem className="space-y-0">
                                    <FormLabel className="text-[10px] font-medium uppercase text-muted-foreground">
                                      % Sc
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="any"
                                        className="h-7 px-1 text-center text-xs"
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
                            <div className="space-y-0">
                              <p className="text-[10px] font-medium uppercase text-muted-foreground">
                                Importo
                              </p>
                              <Input
                                readOnly
                                tabIndex={-1}
                                className="h-7 bg-muted/40 px-1 text-right text-xs font-medium"
                                value={importoRiga.toFixed(2)}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="border-t border-border/70 bg-muted/10 px-3 py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full border border-dashed border-border/80"
                    onClick={addRiga}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Aggiungi riga
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 rounded-md border border-border/70 bg-muted/10 p-2 md:grid-cols-2">
                <p className="text-sm font-medium md:col-span-2">Condizioni e note</p>
                <FormField
                  control={form.control}
                  name="condizioniPagamento"
                  render={({ field }) => (
                    <FormItem className="space-y-0 md:col-span-2">
                      <FormLabel className="text-[11px]">
                        Condizioni di pagamento
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          className="text-sm"
                          value={(field.value ?? []).join("\n")}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                .split("\n")
                                .map((line) => line.trim())
                                .filter(Boolean),
                            )
                          }
                          placeholder="Una condizione per riga"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="termineFornitura"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="text-[11px]">Termine di fornitura</FormLabel>
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
                  name="note"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="text-[11px]">Note / trasporto</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          className="min-h-[2.25rem] resize-y text-sm"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          placeholder="Note aggiuntive…"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </>
            )}

            <div className="sticky bottom-0 flex gap-2 border-t border-border/50 bg-background/95 py-2 backdrop-blur-sm">
              <Button type="button" variant="outline" size="sm" onClick={onBack}>
                Indietro
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  form.formState.isSubmitting ||
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
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Anteprima
            </p>
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
