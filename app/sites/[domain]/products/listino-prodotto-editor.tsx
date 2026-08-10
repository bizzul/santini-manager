"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  saveGrigliaRowAction,
  deleteGrigliaRowAction,
  saveMisuraAction,
  deleteMisuraAction,
  saveFissoAction,
} from "./actions/listino.actions";

type Modalita = "griglia" | "misure_standard" | "fisso" | "mq" | "mc" | null | undefined;

interface GrigliaRow {
  id: string;
  larghezza_min_mm: number;
  larghezza_max_mm: number;
  altezza_min_mm: number;
  altezza_max_mm: number;
  prezzo_base_chf: number;
  attivo: boolean;
}

interface MisuraRow {
  id: string;
  larghezza_mm: number;
  altezza_mm: number;
  prezzo_chf: number;
  attivo: boolean;
}

interface FissoRow {
  id: string;
  prezzo_chf: number;
  attivo: boolean;
}

type Props = {
  productId: number;
  domain?: string;
  siteId?: string;
  modalita: Modalita;
  famiglia?: string | null;
};

const CHF = (n: number) => `CHF ${Number(n).toFixed(2)}`;

const FISSO_LABEL: Record<string, { title: string; hint: string }> = {
  fisso: { title: "Prezzo fisso (CHF)", hint: "Prezzo unico del prodotto." },
  mq: { title: "Prezzo al m² (CHF/mq)", hint: "Moltiplicato per l'area (larghezza × altezza)." },
  mc: { title: "Tariffa al m³ (CHF/mc)", hint: "Moltiplicata per il volume (area × profondità)." },
};

export function ListinoProdottoEditor({
  productId,
  domain,
  siteId,
  modalita,
  famiglia,
}: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [griglia, setGriglia] = useState<GrigliaRow[]>([]);
  const [misure, setMisure] = useState<MisuraRow[]>([]);
  const [fisso, setFisso] = useState<FissoRow | null>(null);
  const [pending, startTransition] = useTransition();

  // Form fasce griglia
  const [gLmin, setGLmin] = useState("");
  const [gLmax, setGLmax] = useState("");
  const [gHmin, setGHmin] = useState("");
  const [gHmax, setGHmax] = useState("");
  const [gPrezzo, setGPrezzo] = useState("");

  // Form misura standard
  const [mL, setML] = useState("");
  const [mH, setMH] = useState("");
  const [mPrezzo, setMPrezzo] = useState("");

  // Form prezzo fisso
  const [fPrezzo, setFPrezzo] = useState("");

  const famigliaTrim = (famiglia ?? "").trim();

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/listino/prodotto-listino?sellProductId=${productId}`,
        { headers: { "x-site-domain": domain ?? "" } },
      );
      if (!res.ok) throw new Error("Errore caricamento listino");
      const data = await res.json();
      setGriglia(data.griglia ?? []);
      setMisure(data.misure ?? []);
      setFisso(data.fisso ?? null);
      setFPrezzo(data.fisso ? String(data.fisso.prezzo_chf) : "");
    } catch {
      toast({ variant: "destructive", description: "Impossibile caricare il listino del prodotto." });
    } finally {
      setLoading(false);
    }
  }, [productId, domain, toast]);

  useEffect(() => {
    load();
    // Ricarica quando cambia la famiglia (le fasce griglia sono per famiglia).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, famigliaTrim]);

  const notify = (r: { success: boolean; error?: unknown }, okMsg: string) => {
    if (r.success) {
      toast({ description: okMsg });
      return true;
    }
    toast({
      variant: "destructive",
      description: typeof r.error === "string" ? r.error : "Operazione fallita",
    });
    return false;
  };

  const addGriglia = () => {
    startTransition(async () => {
      const r = await saveGrigliaRowAction(
        {
          famigliaAperturaCod: famigliaTrim,
          larghezza_min_mm: gLmin,
          larghezza_max_mm: gLmax,
          altezza_min_mm: gHmin,
          altezza_max_mm: gHmax,
          prezzo_base_chf: gPrezzo,
        },
        domain,
        siteId,
      );
      if (notify(r, "Fascia aggiunta")) {
        setGLmin("");
        setGLmax("");
        setGHmin("");
        setGHmax("");
        setGPrezzo("");
        await load();
      }
    });
  };

  const removeGriglia = (id: string) => {
    startTransition(async () => {
      const r = await deleteGrigliaRowAction(id, domain, siteId);
      if (notify(r, "Fascia eliminata")) await load();
    });
  };

  const addMisura = () => {
    startTransition(async () => {
      const r = await saveMisuraAction(
        {
          sellProductId: productId,
          larghezza_mm: mL,
          altezza_mm: mH,
          prezzo_chf: mPrezzo,
        },
        domain,
        siteId,
      );
      if (notify(r, "Misura aggiunta")) {
        setML("");
        setMH("");
        setMPrezzo("");
        await load();
      }
    });
  };

  const removeMisura = (id: string) => {
    startTransition(async () => {
      const r = await deleteMisuraAction(id, domain, siteId);
      if (notify(r, "Misura eliminata")) await load();
    });
  };

  const saveFisso = () => {
    startTransition(async () => {
      const r = await saveFissoAction(
        { sellProductId: productId, prezzo_chf: fPrezzo },
        domain,
        siteId,
      );
      if (notify(r, "Prezzo salvato")) await load();
    });
  };

  if (!modalita) {
    return (
      <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        Seleziona una <strong>modalità prezzo</strong> qui sopra per gestire il
        listino associato a questo prodotto.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Listino prezzi</Label>
        {loading || pending ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {/* GRIGLIA */}
      {modalita === "griglia" ? (
        <div className="space-y-3">
          {!famigliaTrim ? (
            <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              Imposta la <strong>Famiglia apertura</strong> qui sopra (le fasce
              sono condivise da tutti i prodotti della stessa famiglia).
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Fasce per la famiglia{" "}
              <Badge variant="secondary">{famigliaTrim}</Badge> — condivise tra
              tutti i prodotti della stessa famiglia.
            </p>
          )}

          {griglia.length > 0 ? (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1 text-left">Largh. (mm)</th>
                    <th className="px-2 py-1 text-left">Alt. (mm)</th>
                    <th className="px-2 py-1 text-right">Prezzo base</th>
                    <th className="px-2 py-1" />
                  </tr>
                </thead>
                <tbody>
                  {griglia.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-2 py-1">
                        {r.larghezza_min_mm}–{r.larghezza_max_mm}
                      </td>
                      <td className="px-2 py-1">
                        {r.altezza_min_mm}–{r.altezza_max_mm}
                      </td>
                      <td className="px-2 py-1 text-right">
                        {CHF(r.prezzo_base_chf)}
                      </td>
                      <td className="px-2 py-1 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeGriglia(r.id)}
                          disabled={pending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : famigliaTrim ? (
            <p className="text-xs text-muted-foreground">
              Nessuna fascia configurata per questa famiglia.
            </p>
          ) : null}

          {famigliaTrim ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
              <Input
                type="number"
                placeholder="Largh. min"
                value={gLmin}
                onChange={(e) => setGLmin(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Largh. max"
                value={gLmax}
                onChange={(e) => setGLmax(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Alt. min"
                value={gHmin}
                onChange={(e) => setGHmin(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Alt. max"
                value={gHmax}
                onChange={(e) => setGHmax(e.target.value)}
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Prezzo"
                value={gPrezzo}
                onChange={(e) => setGPrezzo(e.target.value)}
              />
              <Button type="button" onClick={addGriglia} disabled={pending}>
                <Plus className="mr-1 h-4 w-4" /> Aggiungi
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* MISURE STANDARD */}
      {modalita === "misure_standard" ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Taglie standard del prodotto con il relativo prezzo esatto.
          </p>
          {misure.length > 0 ? (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1 text-left">Largh. (mm)</th>
                    <th className="px-2 py-1 text-left">Alt. (mm)</th>
                    <th className="px-2 py-1 text-right">Prezzo</th>
                    <th className="px-2 py-1" />
                  </tr>
                </thead>
                <tbody>
                  {misure.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-2 py-1">{r.larghezza_mm}</td>
                      <td className="px-2 py-1">{r.altezza_mm}</td>
                      <td className="px-2 py-1 text-right">{CHF(r.prezzo_chf)}</td>
                      <td className="px-2 py-1 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeMisura(r.id)}
                          disabled={pending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nessuna misura standard configurata.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Input
              type="number"
              placeholder="Larghezza"
              value={mL}
              onChange={(e) => setML(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Altezza"
              value={mH}
              onChange={(e) => setMH(e.target.value)}
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Prezzo"
              value={mPrezzo}
              onChange={(e) => setMPrezzo(e.target.value)}
            />
            <Button type="button" onClick={addMisura} disabled={pending}>
              <Plus className="mr-1 h-4 w-4" /> Aggiungi
            </Button>
          </div>
        </div>
      ) : null}

      {/* PREZZO SINGOLO: fisso / mq / mc */}
      {modalita === "fisso" || modalita === "mq" || modalita === "mc" ? (
        <div className="space-y-2">
          <Label className="text-xs">
            {(FISSO_LABEL[modalita] ?? FISSO_LABEL.fisso).title}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              className="max-w-[200px]"
              placeholder="0.00"
              value={fPrezzo}
              onChange={(e) => setFPrezzo(e.target.value)}
            />
            <Button type="button" onClick={saveFisso} disabled={pending}>
              Salva prezzo
            </Button>
            {fisso ? (
              <span className="text-xs text-muted-foreground">
                Attuale: {CHF(fisso.prezzo_chf)}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {(FISSO_LABEL[modalita] ?? FISSO_LABEL.fisso).hint}
          </p>
        </div>
      ) : null}
    </div>
  );
}
