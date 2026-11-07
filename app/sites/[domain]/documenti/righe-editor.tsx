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
import { OW } from "./wizard-ui";

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
  // Prima che il motore giri, una riga da template e' "da compilare", non
  // "da quotare": il conteggio rosso ha senso solo dopo un calcolo vero.
  const riepilogo = riepilogaCalcoli(
    (watched.righe ?? []).filter((r) => r.calcolo?.calcolatoIl),
  );

  const setMisura = (
    index: number,
    campo: "larghezzaMm" | "altezzaMm" | "profonditaMm",
    valore: string,
  ) => {
    const conf = form.getValues(`righe.${index}.configurazione`) ?? {};
    const n = valore === "" ? null : parseFloat(valore);
    form.setValue(
      `righe.${index}.configurazione`,
      { ...conf, [campo]: n != null && Number.isFinite(n) ? n : null },
      { shouldDirty: true },
    );
  };

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
      <div className={OW.cardFlush}>
        <div className={OW.cardHead}>
          <div className="flex items-center gap-2.5">
            <h2 className={OW.cardTitle}>Righe articolo</h2>
            {fields.length > 0 ? (
              <span className={OW.cardHint}>
                {fields.length}{" "}
                {fields.length === 1 ? "posizione" : "posizioni"}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={OW.btnSmall}
              onClick={() => setCatalogOpen(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Da catalogo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={OW.btnSmall}
              onClick={() => setTemplateOpen(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Da categoria
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={OW.btnSmall}
              onClick={addRiga}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Riga libera
            </Button>
          </div>
        </div>

        {riepilogo.bloccanti > 0 ||
        riepilogo.alta > 0 ||
        riepilogo.media > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--ow-border)] px-5 py-2.5 text-xs text-[var(--ow-text-3)]">
            {riepilogo.bloccanti > 0 ? (
              <span className={OW.pillDanger}>
                {riepilogo.bloccanti} da quotare
              </span>
            ) : null}
            {riepilogo.media > 0 ? (
              <span className={OW.pillWarn}>
                {riepilogo.media} da verificare
              </span>
            ) : null}
            <span className="min-w-0">
              {riepilogo.bloccanti > 0
                ? "Una o piu' posizioni non sono state quotate dal motore: vanno risolte o confermate a mano prima dell'invio."
                : "Controlla gli avvisi sulle posizioni prima di generare il PDF."}
            </span>
          </div>
        ) : null}

        {fields.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-10 text-center text-sm text-[var(--ow-text-3)]">
            <p>Nessuna posizione ancora.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={OW.btnSmall}
                onClick={() => setTemplateOpen(true)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Da categoria
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={OW.btnSmall}
                onClick={addRiga}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Riga libera
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 p-5">
            {fields.map((field, index) => {
              const riga = watched.righe?.[index];
              const conf = riga?.configurazione ?? null;
              const strutturata = Boolean(conf?.sellProductId);
              const calcolata = Boolean(riga?.calcolo?.calcolatoIl);
              const misureMancanti =
                strutturata &&
                !(conf?.larghezzaMm && conf?.altezzaMm) &&
                !calcolata;
              const importoRiga = calcolaTotaleRiga(
                riga?.quantita ?? 0,
                riga?.prezzoUnitario ?? 0,
                riga?.sconto,
                watched.tipoDocumento,
              );

              return (
                <div key={field.id} className={`${OW.posCard} space-y-3`}>
                  {/* Riga 1: numero, descrizione, quantita', prezzo, sconto, totale */}
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex items-center gap-1.5 pb-2">
                      <span className={OW.posIndex}>{index + 1}</span>
                      {riga?.immagineUrl ? (
                        <div className="group relative h-7 w-7">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={riga.immagineUrl}
                            alt=""
                            className="h-7 w-7 rounded-md border border-[var(--ow-border)] object-cover"
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
                            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--ow-danger-text)] text-[var(--ow-card)] shadow"
                            aria-label="Rimuovi immagine"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ) : (
                        <label
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-dashed border-[var(--ow-base-border)] text-[var(--ow-text-3)] transition-colors hover:border-[var(--ow-accent)] hover:text-[var(--ow-accent-text)]"
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
                        <FormItem className="min-w-[14rem] flex-[999_1_14rem] space-y-0">
                          <FormLabel className={OW.miniLabel}>
                            Descrizione
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              rows={1}
                              className={`min-h-[2rem] resize-y break-words py-1.5 leading-snug ${OW.inputSm} h-auto`}
                              {...f}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`righe.${index}.unita`}
                      render={({ field: f }) => (
                        <FormItem className="w-[4.5rem] space-y-0">
                          <FormLabel className={OW.miniLabel}>U</FormLabel>
                          <Select value={f.value} onValueChange={f.onChange}>
                            <FormControl>
                              <SelectTrigger className={OW.inputSm}>
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
                        <FormItem className="w-[3.9rem] space-y-0">
                          <FormLabel className={OW.miniLabel}>Q</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              className={`${OW.inputSm} text-right`}
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
                        <FormItem className="w-[6.5rem] space-y-0">
                          <FormLabel className={OW.miniLabel}>
                            Prezzo
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder="da listino"
                              className={`${OW.inputSm} text-right`}
                              {...f}
                              value={f.value === 0 ? "" : f.value}
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
                          <FormItem className="w-[4.4rem] space-y-0">
                            <FormLabel className={OW.miniLabel}>
                              % sc
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="any"
                                placeholder="—"
                                className={`${OW.inputSm} text-right`}
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
                    <div className="w-[6.5rem] space-y-0">
                      <p className={OW.miniLabel}>Totale</p>
                      <Input
                        readOnly
                        tabIndex={-1}
                        className={`${OW.inputReadonly} ${
                          importoRiga > 0 ? "" : "text-[var(--ow-text-3)]"
                        }`}
                        value={importoRiga > 0 ? importoRiga.toFixed(2) : "—"}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`${OW.btnGhostIcon} mb-0.5`}
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
                      <SelectTrigger className={`${OW.inputSm} h-7 text-xs`}>
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

                  {/* Testo descrittivo base, legato al prodotto a catalogo */}
                  <FormField
                    control={form.control}
                    name={`righe.${index}.descrizioneEstesa`}
                    render={({ field: f }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className={OW.miniLabel}>
                          Testo descrittivo base
                          {strutturata ? " — dal prodotto a catalogo" : ""}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            rows={3}
                            placeholder="Testo descrittivo del prodotto, note tecniche…"
                            className={OW.baseArea}
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
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={OW.tag}>
                      {riga?.isNuovo ? "Nuovo articolo" : "Da catalogo"}
                    </span>
                    {conf?.internalCode ? (
                      <span className={OW.code}>{conf.internalCode}</span>
                    ) : null}
                  </div>

                  {/* Misure */}
                  {strutturata ? (
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="w-[7rem] space-y-0">
                        <label
                          htmlFor={`riga-${index}-larghezza`}
                          className={OW.miniLabel}
                        >
                          Larghezza mm
                        </label>
                        <Input
                          id={`riga-${index}-larghezza`}
                          type="number"
                          inputMode="numeric"
                          step="1"
                          className={`${OW.inputSm} text-right`}
                          value={conf?.larghezzaMm ?? ""}
                          onChange={(e) =>
                            setMisura(index, "larghezzaMm", e.target.value)
                          }
                        />
                      </div>
                      <div className="w-[7rem] space-y-0">
                        <label
                          htmlFor={`riga-${index}-altezza`}
                          className={OW.miniLabel}
                        >
                          Altezza mm
                        </label>
                        <Input
                          id={`riga-${index}-altezza`}
                          type="number"
                          inputMode="numeric"
                          step="1"
                          className={`${OW.inputSm} text-right`}
                          value={conf?.altezzaMm ?? ""}
                          onChange={(e) =>
                            setMisura(index, "altezzaMm", e.target.value)
                          }
                        />
                      </div>
                      {conf?.profonditaMm != null ? (
                        <div className="w-[7rem] space-y-0">
                          <label
                            htmlFor={`riga-${index}-profondita`}
                            className={OW.miniLabel}
                          >
                            Profondita&apos; mm
                          </label>
                          <Input
                            id={`riga-${index}-profondita`}
                            type="number"
                            inputMode="numeric"
                            step="1"
                            className={`${OW.inputSm} text-right`}
                            value={conf?.profonditaMm ?? ""}
                            onChange={(e) =>
                              setMisura(index, "profonditaMm", e.target.value)
                            }
                          />
                        </div>
                      ) : null}
                      <p className="min-w-0 flex-1 pb-2 text-[11px] text-[var(--ow-text-3)]">
                        {misureMancanti
                          ? "Inserisci larghezza e altezza: il prezzo arriva dal listino quando elabori l'offerta."
                          : calcolata
                            ? "Prezzo calcolato dal listino su queste misure."
                            : "Il prezzo si calcola dal listino quando elabori l'offerta."}
                      </p>
                    </div>
                  ) : (
                    <FormField
                      control={form.control}
                      name={`righe.${index}.misure`}
                      render={({ field: f }) => (
                        <FormItem className="max-w-xs space-y-0">
                          <FormLabel className={OW.miniLabel}>
                            Misure
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="es. 1400x1600 mm"
                              className={OW.inputSm}
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
                  )}

                  {calcolata ? <RigaCalcolo calcolo={riga?.calcolo} /> : null}
                </div>
              );
            })}
          </div>
        )}
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
