"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { reverseGeocodeTicino } from "@/lib/treemap-reverse-geocode";
import type { TreemapAlberoMapRow } from "@/lib/treemap-data";

interface TreemapAddAlberoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: string;
  coords: { lat: number; lng: number } | null;
  onCreated: (albero: TreemapAlberoMapRow) => void;
}

export default function TreemapAddAlberoDialog({
  open,
  onOpenChange,
  domain,
  coords,
  onCreated,
}: TreemapAddAlberoDialogProps) {
  const [codice, setCodice] = React.useState("");
  const [specieComune, setSpecieComune] = React.useState("");
  const [specieBotanica, setSpecieBotanica] = React.useState("");
  const [comune, setComune] = React.useState("");
  const [indirizzo, setIndirizzo] = React.useState("");
  const [npa, setNpa] = React.useState("");
  const [loadingMeta, setLoadingMeta] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !coords) return;

    let cancelled = false;
    setError(null);
    setLoadingMeta(true);

    void (async () => {
      try {
        const [codiceRes, geo] = await Promise.all([
          fetch(`/api/sites/${domain}/treemap/alberi`),
          reverseGeocodeTicino(coords.lat, coords.lng),
        ]);

        if (cancelled) return;

        if (codiceRes.ok) {
          const body = (await codiceRes.json()) as { codice?: string };
          if (body.codice) setCodice(body.codice);
        }

        if (geo) {
          if (geo.comune) setComune(geo.comune);
          if (geo.indirizzo) setIndirizzo(geo.indirizzo);
          if (geo.npa) setNpa(geo.npa);
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, coords, domain]);

  React.useEffect(() => {
    if (!open) {
      setSpecieComune("");
      setSpecieBotanica("");
      setComune("");
      setIndirizzo("");
      setNpa("");
      setCodice("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!coords) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/sites/${domain}/treemap/alberi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codice: codice.trim(),
          specie_comune: specieComune.trim(),
          specie_botanica: specieBotanica.trim() || null,
          latitude: coords.lat,
          longitude: coords.lng,
          comune: comune.trim(),
          indirizzo: indirizzo.trim() || null,
          npa: npa.trim() || null,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Impossibile creare l'albero");
      }

      onCreated(body.albero as TreemapAlberoMapRow);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di rete");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aggiungi albero</DialogTitle>
          <DialogDescription>
            Nuovo albero nella posizione selezionata sulla mappa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {coords ? (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground tabular-nums">
              {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tm-codice">Codice</Label>
              <Input
                id="tm-codice"
                value={codice}
                onChange={(e) => setCodice(e.target.value)}
                required
                disabled={loadingMeta || submitting}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tm-specie">Specie comune</Label>
              <Input
                id="tm-specie"
                value={specieComune}
                onChange={(e) => setSpecieComune(e.target.value)}
                placeholder="es. Tiglio"
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tm-botanica">Specie botanica (opzionale)</Label>
              <Input
                id="tm-botanica"
                value={specieBotanica}
                onChange={(e) => setSpecieBotanica(e.target.value)}
                placeholder="es. Tilia cordata"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tm-comune">Comune</Label>
              <Input
                id="tm-comune"
                value={comune}
                onChange={(e) => setComune(e.target.value)}
                required
                disabled={loadingMeta || submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tm-npa">NPA</Label>
              <Input
                id="tm-npa"
                value={npa}
                onChange={(e) => setNpa(e.target.value)}
                disabled={loadingMeta || submitting}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tm-indirizzo">Indirizzo (opzionale)</Label>
              <Input
                id="tm-indirizzo"
                value={indirizzo}
                onChange={(e) => setIndirizzo(e.target.value)}
                disabled={loadingMeta || submitting}
              />
            </div>
          </div>

          {loadingMeta ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Recupero codice e località…
            </p>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={submitting || loadingMeta}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio…
                </>
              ) : (
                "Aggiungi albero"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
