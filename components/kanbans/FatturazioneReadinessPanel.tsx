"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Plus, Receipt, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { useToast } from "@/components/ui/use-toast";
import {
  canConfirmFatturazioneReadiness,
  type FatturazioneCatalogSupplemento,
  type FatturazioneReadiness,
  type FatturazioneSupplementoRiga,
} from "@/lib/fatturazione-readiness";

type FatturazioneReadinessPanelProps = {
  taskId: number;
  siteId?: string | null;
  domain?: string;
  onChanged?: () => void;
};

function siteHeaders(siteId?: string | null, domain?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (siteId) headers["x-site-id"] = siteId;
  if (domain) headers["x-site-domain"] = domain;
  return headers;
}

export function FatturazioneReadinessPanel({
  taskId,
  siteId,
  domain,
  onChanged,
}: FatturazioneReadinessPanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [readiness, setReadiness] = useState<FatturazioneReadiness | null>(null);
  const [supplementi, setSupplementi] = useState<FatturazioneSupplementoRiga[]>(
    [],
  );
  const [catalog, setCatalog] = useState<FatturazioneCatalogSupplemento[]>([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>("");
  const [customDescrizione, setCustomDescrizione] = useState("");
  const [quantita, setQuantita] = useState("1");
  const [prezzo, setPrezzo] = useState("");

  const load = useCallback(async () => {
    if (domain && !siteId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/fatturazione/tasks/${taskId}/readiness`,
        { headers: siteHeaders(siteId, domain) },
      );
      if (!response.ok) {
        setEnabled(false);
        setReadiness(null);
        setSupplementi([]);
        setCatalog([]);
        return;
      }
      const data = await response.json();
      setEnabled(Boolean(data.enabled));
      setCanWrite(Boolean(data.canWrite));
      setReadiness(data.readiness || null);
      setSupplementi(Array.isArray(data.supplementi) ? data.supplementi : []);
      setCatalog(Array.isArray(data.catalog) ? data.catalog : []);
    } catch (error) {
      console.error(error);
      setEnabled(false);
      setReadiness(null);
      setSupplementi([]);
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  }, [domain, siteId, taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canConfirm = useMemo(
    () =>
      canConfirmFatturazioneReadiness({
        ugualeOfferta: Boolean(readiness?.uguale_offerta),
        supplementiCount: supplementi.length,
      }),
    [readiness?.uguale_offerta, supplementi.length],
  );

  const patchReadiness = async (body: Record<string, unknown>) => {
    const response = await fetch(`/api/fatturazione/tasks/${taskId}/readiness`, {
      method: "PATCH",
      headers: siteHeaders(siteId, domain),
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Aggiornamento non riuscito");
    }
    if (data.readiness) setReadiness(data.readiness);
    onChanged?.();
  };

  const handleUgualeOfferta = async (checked: boolean) => {
    if (!canWrite) return;
    setSaving(true);
    try {
      await patchReadiness({
        action: "set_uguale_offerta",
        ugualeOfferta: checked,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description:
          error instanceof Error ? error.message : "Impossibile aggiornare",
      });
    } finally {
      setSaving(false);
    }
  };

  const catalogOptions = useMemo(
    () =>
      catalog.map((item) => ({
        value: item.id,
        label: `${item.nome} · ${Number(item.valore).toLocaleString("it-CH", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })} Fr.`,
      })),
    [catalog],
  );

  const selectedCatalog = useMemo(
    () => catalog.find((item) => item.id === selectedCatalogId) || null,
    [catalog, selectedCatalogId],
  );

  const handleCatalogChange = (value: string | number) => {
    const nextId = String(value);
    setSelectedCatalogId(nextId);
    setCustomDescrizione("");
    const item = catalog.find((entry) => entry.id === nextId);
    if (item) {
      setPrezzo(String(Number(item.valore)));
    }
  };

  const handleCustomSelect = (label: string) => {
    setSelectedCatalogId("");
    setCustomDescrizione(label);
  };

  const parseOptionalNumber = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const handleAddRow = async () => {
    if (!canWrite) return;
    const qty = Number(quantita);
    const descrizione = customDescrizione.trim();
    if ((!selectedCatalogId && !descrizione) || !Number.isFinite(qty) || qty <= 0) {
      toast({
        variant: "destructive",
        title: "Dati incompleti",
        description:
          "Seleziona una tipologia dal catalogo oppure scrivi un testo libero, con quantitativo maggiore di zero",
      });
      return;
    }
    const price = parseOptionalNumber(prezzo);
    if (!selectedCatalogId && price == null) {
      toast({
        variant: "destructive",
        title: "Dati incompleti",
        description: "Inserisci un prezzo per il testo libero",
      });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(
        `/api/fatturazione/tasks/${taskId}/supplementi`,
        {
          method: "POST",
          headers: siteHeaders(siteId, domain),
          body: JSON.stringify({
            catalogSupplementoId: selectedCatalogId || undefined,
            descrizione: descrizione || undefined,
            quantita: qty,
            prezzo: price,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Creazione non riuscita");
      }
      setSelectedCatalogId("");
      setCustomDescrizione("");
      setQuantita("1");
      setPrezzo("");
      await load();
      onChanged?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description:
          error instanceof Error ? error.message : "Impossibile aggiungere la riga",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRow = async (id: string) => {
    if (!canWrite) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/fatturazione/supplementi/${id}`, {
        method: "DELETE",
        headers: siteHeaders(siteId, domain),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Eliminazione non riuscita");
      }
      await load();
      onChanged?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description:
          error instanceof Error ? error.message : "Impossibile eliminare la riga",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!canWrite) return;
    setSaving(true);
    try {
      await patchReadiness({ action: "confirm" });
      toast({
        title: "Pronto per fatturazione",
        description: "La card e ora verde. L'amministrazione puo inviare la fattura.",
      });
      await load();
      onChanged?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Conferma non possibile",
        description:
          error instanceof Error ? error.message : "Completa checkbox o supplementi",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!enabled && !loading) return null;

  const isPronto = readiness?.stato === "pronto";

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted p-3 dark:bg-background">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Receipt className="h-4 w-4" />
            Supplementi fatturazione
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Conferma se la fattura coincide con l&apos;offerta, oppure aggiungi i
            supplementi dal catalogo o come testo libero, con quantita e prezzo.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            isPronto
              ? "bg-success text-success-foreground"
              : "bg-warning text-warning-foreground"
          }`}
        >
          {isPronto ? "Pronto" : "In attesa"}
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Caricamento…</p>
      ) : (
        <>
          <div className="flex items-start gap-2 rounded-md border border-border bg-background/60 px-3 py-2">
            <Checkbox
              id={`uguale-offerta-${taskId}`}
              checked={Boolean(readiness?.uguale_offerta)}
              disabled={!canWrite || saving}
              onCheckedChange={(value) => handleUgualeOfferta(value === true)}
            />
            <Label
              htmlFor={`uguale-offerta-${taskId}`}
              className="cursor-pointer text-sm leading-snug"
            >
              Uguale all&apos;offerta (nessun supplemento)
            </Label>
          </div>

          <div className="space-y-2">
            {supplementi.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                Nessun supplemento. Se l&apos;offerta e invariata usa la checkbox
                sopra, altrimenti aggiungi una riga dal catalogo o come testo libero.
              </p>
            ) : (
              <div className="space-y-2">
                {supplementi.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-md border border-border bg-background/50 px-2 py-1.5 text-sm"
                  >
                    <span className="truncate">{row.descrizione}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {Number(row.quantita)}
                    </span>
                    <span className="tabular-nums">
                      {Number(row.prezzo).toLocaleString("it-CH", {
                        style: "currency",
                        currency: "CHF",
                      })}
                    </span>
                    {canWrite ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={() => handleDeleteRow(row.id)}
                        disabled={saving}
                        aria-label="Elimina riga"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <span />
                    )}
                  </div>
                ))}
              </div>
            )}

            {canWrite && !readiness?.uguale_offerta && (
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_4.5rem_5.5rem_auto] items-end gap-2">
                <div className="min-w-0 space-y-1">
                  <Label className="text-xs">Tipologia</Label>
                  <SearchSelect
                    value={selectedCatalogId || undefined}
                    onValueChange={handleCatalogChange}
                    options={catalogOptions}
                    allowCustom
                    customLabel={customDescrizione || null}
                    onCustomSelect={handleCustomSelect}
                    placeholder="Catalogo o testo libero"
                    emptyMessage="Nessun supplemento in catalogo. Scrivi un testo libero."
                    disabled={saving}
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <Label className="text-xs">Qta</Label>
                  <Input
                    type="number"
                    min="0.001"
                    step="1"
                    className="w-full min-w-0 px-1.5"
                    value={quantita}
                    onChange={(event) => setQuantita(event.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <Label className="text-xs">Prezzo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    className="w-full min-w-0 px-1.5"
                    value={prezzo}
                    onChange={(event) => setPrezzo(event.target.value)}
                    placeholder={
                      selectedCatalog ? String(Number(selectedCatalog.valore)) : "0.00"
                    }
                    disabled={saving}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={handleAddRow}
                  disabled={
                    saving || (!selectedCatalogId && !customDescrizione.trim())
                  }
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Riga
                </Button>
              </div>
            )}
          </div>

          {canWrite ? (
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={saving || !canConfirm || isPronto}
              className="w-full"
            >
              <Check className="mr-2 h-4 w-4" />
              {isPronto
                ? "Confermato: pronto per fatturazione"
                : "Conferma pronto per fatturazione"}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Solo il direttore o un admin puo confermare. L&apos;amministrazione
              lavora sulle card verdi.
            </p>
          )}
        </>
      )}
    </div>
  );
}
