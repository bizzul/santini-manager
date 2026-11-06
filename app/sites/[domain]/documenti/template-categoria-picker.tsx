"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import type { RigaArricchita } from "@/validation/documenti/extracted-document";
import {
  fetchOffertaTemplates,
  templateToRighe,
  type OffertaTemplate,
} from "@/lib/documenti/offerta-template";

/**
 * Scelta delle categorie da offrire: ogni categoria porta nel documento le
 * sue righe base gia' scritte, cosi' all'utente restano solo misure e
 * quantita'.
 *
 * Le posizioni entrano SENZA prezzo e marcate da quotare: una riga da
 * template non e' quotabile finche' non ha le misure, e deve vedersi.
 */

type Props = {
  domain: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (righe: RigaArricchita[]) => void;
};

export function TemplateCategoriaPicker({
  domain,
  open,
  onOpenChange,
  onAdd,
}: Props) {
  const [templates, setTemplates] = useState<OffertaTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [scelti, setScelti] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setErrore(null);
    (async () => {
      try {
        const t = await fetchOffertaTemplates(domain);
        if (!active) return;
        setTemplates(t);
      } catch (e) {
        if (active) {
          setErrore(e instanceof Error ? e.message : "Errore di caricamento.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open, domain]);

  const toggle = useCallback((id: string) => {
    setScelti((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const selezionati = templates.filter((t) => scelti.includes(t.id));
  const nRighe = selezionati.reduce((acc, t) => acc + t.righe.length, 0);

  const conferma = () => {
    onAdd(selezionati.flatMap(templateToRighe));
    setScelti([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Categorie da offrire</DialogTitle>
          <DialogDescription>
            Ogni categoria porta nel documento le sue righe base. Restano da
            compilare misure e quantita&apos;.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Caricamento template...
          </div>
        ) : errore ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errore}
          </p>
        ) : templates.length === 0 ? (
          <p className="rounded-md border bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
            Nessun template configurato per questo spazio.
          </p>
        ) : (
          <div className="grid max-h-[50vh] gap-2 overflow-y-auto sm:grid-cols-2">
            {templates.map((t) => {
              const attivo = scelti.includes(t.id);
              return (
                <label
                  key={t.id}
                  htmlFor={`tpl-${t.id}`}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${
                    attivo ? "border-primary bg-primary/5" : "bg-muted/10"
                  }`}
                >
                  <Checkbox
                    id={`tpl-${t.id}`}
                    checked={attivo}
                    onCheckedChange={() => toggle(t.id)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {t.categoria}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {t.nome} &middot; {t.righe.length}{" "}
                      {t.righe.length === 1 ? "riga base" : "righe base"}
                    </span>
                    {t.descrizione ? (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {t.descrizione}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {nRighe > 0
              ? `${nRighe} ${nRighe === 1 ? "posizione" : "posizioni"} da aggiungere`
              : "Nessuna categoria selezionata"}
          </span>
          <span className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annulla
            </Button>
            <Button type="button" onClick={conferma} disabled={nRighe === 0}>
              Aggiungi al documento
            </Button>
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
