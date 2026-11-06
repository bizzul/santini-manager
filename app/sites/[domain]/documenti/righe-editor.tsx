"use client";

import { useState } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import {
  UnitaEnum,
  type DocumentoArricchito,
  type RigaArricchita,
} from "@/validation/documenti/extracted-document";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { MatchBadge } from "@/components/documenti/match-badge";
import { ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { calcolaTotaleRiga } from "@/lib/documenti/calcolo-totali";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CatalogLineConfigurator } from "./catalog-line-configurator";
import { TemplateCategoriaPicker } from "./template-categoria-picker";
import {
  RigaCalcolo,
  riepilogaCalcoli,
} from "@/components/documenti/riga-calcolo";

const UNITA_OPTIONS = UnitaEnum.options;

/**
 * Editor delle posizioni d'offerta.
 *
 * Estratto da document-review-form per poter vivere in una schermata propria:
 * nel wizard a quattro passi le posizioni sono il passo 2, separate da
 * anteprima e condizioni. Riceve l'istanza react-hook-form del documento,
 * quindi lo stato non cambia casa e il comportamento resta identico.
 */

interface RigheEditorProps {
  form: UseFormReturn<DocumentoArricchito>;
  domain: string;
  showDiscount: boolean;
}

export function RigheEditor({ form, domain, showDiscount }: RigheEditorProps) {
  const { toast } = useToast();
  const [templateOpen, setTemplateOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [uploadingImageIndex, setUploadingImageIndex] = useState<number | null>(
    null,
  );

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "righe",
  });

  const watched = form.watch();
  const riepilogo = riepilogaCalcoli(watched.righe ?? []);

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

  const addCatalogLine = (riga: RigaArricchita) => {
    append(riga, { shouldFocus: false });
  };

  const addTemplateLines = (righe: RigaArricchita[]) => {
    if (righe.length === 0) return;
    append(righe, { shouldFocus: false });
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

  return (
    <>
      <div className="overflow-hidden rounded-md border border-border/70">
        <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-muted/20 px-3 py-2">
          <p className="text-sm font-medium">Righe articolo</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setCatalogOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Da catalogo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setTemplateOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Da categoria
            </Button>
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
        </div>

        {riepilogo.bloccanti > 0 ||
        riepilogo.alta > 0 ||
        riepilogo.media > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/20 px-3 py-2 text-xs">
            {riepilogo.bloccanti > 0 ? (
              <span className="rounded bg-destructive px-2 py-0.5 font-semibold text-destructive-foreground">
                {riepilogo.bloccanti} da quotare
              </span>
            ) : null}
            {riepilogo.media > 0 ? (
              <span className="rounded border border-warning/40 bg-warning/10 px-2 py-0.5 font-semibold text-warning">
                {riepilogo.media} da verificare
              </span>
            ) : null}
            <span className="text-muted-foreground">
              {riepilogo.bloccanti > 0
                ? "Una o piu' posizioni non sono state quotate dal motore: vanno risolte o confermate a mano prima dell'invio."
                : "Controlla gli avvisi sulle posizioni prima di generare il PDF."}
            </span>
          </div>
        ) : null}

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

                  <RigaCalcolo calcolo={riga?.calcolo} />

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

        <div className="grid grid-cols-1 gap-2 border-t border-border/70 bg-muted/10 px-3 py-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full border border-dashed border-border/80"
            onClick={() => setCatalogOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Aggiungi da catalogo
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full border border-dashed border-border/80"
            onClick={() => setTemplateOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Aggiungi righe da categoria
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full border border-dashed border-border/80"
            onClick={addRiga}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Aggiungi riga libera
          </Button>
        </div>
      </div>

      <CatalogLineConfigurator
        domain={domain}
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        onAdd={addCatalogLine}
      />

      <TemplateCategoriaPicker
        domain={domain}
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        onAdd={addTemplateLines}
      />
    </>
  );
}
