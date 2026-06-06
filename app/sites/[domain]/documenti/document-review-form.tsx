"use client";

import { useMemo } from "react";
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
import type { DocumentTemplate } from "@/lib/documenti/template-types";
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

interface DocumentReviewFormProps {
  domain: string;
  siteId: string;
  initialDocumento: DocumentoArricchito;
  template: DocumentTemplate;
  sourceText: string;
  documentoId?: string | null;
  onBack: () => void;
  onSaved?: () => void;
}

export function DocumentReviewForm({
  domain,
  initialDocumento,
  template,
  sourceText,
  documentoId,
  onBack,
  onSaved,
}: DocumentReviewFormProps) {
  const { toast } = useToast();
  const router = useRouter();

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

  const onSubmit = async (values: DocumentoArricchito) => {
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
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          variant: "destructive",
          description: result.error ?? "Errore nel salvataggio",
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
            const pdfErr = await pdfRes.json();
            toast({
              variant: "destructive",
              description:
                pdfErr.message ??
                pdfErr.error ??
                "Documento salvato ma errore nella generazione PDF",
            });
          } else {
            toast({
              description: `Documento ${result.documento?.numero ?? ""} salvato e PDF generato`,
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
        toast({
          description: `Documento ${result.documento?.numero ?? ""} salvato`,
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

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Verifica e correggi</h2>
            <MatchBadge isNuovo={watched.destinatario?.isNuovo ?? true} />
          </div>

          <FormField
            control={form.control}
            name="tipoDocumento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo documento</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
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
              <FormItem>
                <FormLabel>Oggetto</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-3 rounded-lg border p-4">
            <p className="font-medium">Destinatario</p>
            <FormField
              control={form.control}
              name="destinatario.ragioneSociale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ragione sociale</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="destinatario.aca"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>a.c.a</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="destinatario.email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="destinatario.via"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Via</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="destinatario.cap"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CAP</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="destinatario.citta"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Città</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {isLetter ? (
            <FormField
              control={form.control}
              name="corpoTesto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Corpo lettera</FormLabel>
                  <FormControl>
                    <Textarea rows={14} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <>
              <div className="space-y-4">
                <p className="font-medium">Righe articolo</p>
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="space-y-3 rounded-lg border p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Riga {index + 1}
                      </span>
                      <MatchBadge
                        isNuovo={watched.righe?.[index]?.isNuovo ?? true}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name={`righe.${index}.descrizione`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Descrizione</FormLabel>
                          <FormControl>
                            <Textarea rows={3} {...f} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="grid gap-3 sm:grid-cols-4">
                      <FormField
                        control={form.control}
                        name={`righe.${index}.unita`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel>U</FormLabel>
                            <FormControl>
                              <Input {...f} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`righe.${index}.quantita`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel>Q</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="any"
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
                          <FormItem>
                            <FormLabel>Prezzo</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="any"
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
                            <FormItem>
                              <FormLabel>%</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="any"
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
                    </div>
                  </div>
                ))}
              </div>

              <FormField
                control={form.control}
                name="termineFornitura"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Termine di fornitura</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onBack}>
              Indietro
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
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
