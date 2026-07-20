"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MapPin, MapPinOff, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  FORNITORE_CATEGORIA_LABEL,
  type EvFornitore,
} from "./types";
import { updateFornitoreLocation } from "@/app/sites/[domain]/momentum/actions";

export default function FornitoriClient({
  domain,
  fornitori,
}: {
  domain: string;
  fornitori: EvFornitore[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = React.useTransition();
  const [editing, setEditing] = React.useState<EvFornitore | null>(null);

  const conMappa = fornitori.filter(
    (f) => f.lat != null && f.lng != null
  ).length;

  function handleSave(input: {
    indirizzo: string | null;
    citta: string | null;
    lat: number | null;
    lng: number | null;
  }) {
    if (!editing) return;
    const id = editing.id;
    startTransition(async () => {
      try {
        const res = await updateFornitoreLocation(domain, id, input);
        toast({
          title: "Fornitore aggiornato",
          description:
            res.lat != null && res.lng != null
              ? res.geocoded
                ? "Posizione ricavata dall'indirizzo e salvata."
                : "Posizione salvata."
              : "Salvato senza coordinate: non è stato possibile geolocalizzare l'indirizzo.",
        });
        setEditing(null);
        router.refresh();
      } catch (e) {
        toast({
          title: "Errore",
          description: e instanceof Error ? e.message : "Operazione fallita",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {fornitori.length} fornitori · {conMappa} con posizione sulla mappa
        </p>
      </div>

      {fornitori.length === 0 ? (
        <p className="rounded-xl border bg-card/60 p-6 text-center text-sm text-muted-foreground">
          Nessun fornitore registrato.
        </p>
      ) : (
        <div className="space-y-2">
          {fornitori.map((f) => {
            const hasCoords = f.lat != null && f.lng != null;
            const luogo = [f.indirizzo, f.citta].filter(Boolean).join(", ");
            return (
              <div
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/60 p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {f.nome}
                    </p>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {FORNITORE_CATEGORIA_LABEL[f.categoria] ?? f.categoria}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {luogo || "Nessun indirizzo"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      hasCoords
                        ? "bg-success/15 text-success"
                        : "bg-warning/15 text-warning"
                    )}
                  >
                    {hasCoords ? (
                      <MapPin className="h-3.5 w-3.5" />
                    ) : (
                      <MapPinOff className="h-3.5 w-3.5" />
                    )}
                    {hasCoords ? "Sulla mappa" : "Senza posizione"}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => setEditing(f)}
                  >
                    <Pencil className="mr-1 h-4 w-4" /> Posizione
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EditPosizioneDialog
        fornitore={editing}
        pending={pending}
        onClose={() => setEditing(null)}
        onSave={handleSave}
      />
    </div>
  );
}

function EditPosizioneDialog({
  fornitore,
  pending,
  onClose,
  onSave,
}: {
  fornitore: EvFornitore | null;
  pending: boolean;
  onClose: () => void;
  onSave: (input: {
    indirizzo: string | null;
    citta: string | null;
    lat: number | null;
    lng: number | null;
  }) => void;
}) {
  const [indirizzo, setIndirizzo] = React.useState("");
  const [citta, setCitta] = React.useState("");
  const [lat, setLat] = React.useState("");
  const [lng, setLng] = React.useState("");

  React.useEffect(() => {
    if (!fornitore) return;
    setIndirizzo(fornitore.indirizzo ?? "");
    setCitta(fornitore.citta ?? "");
    setLat(fornitore.lat != null ? String(fornitore.lat) : "");
    setLng(fornitore.lng != null ? String(fornitore.lng) : "");
  }, [fornitore]);

  const open = fornitore !== null;

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Posizione sulla mappa</DialogTitle>
          <DialogDescription>
            {fornitore?.nome}. Lascia latitudine e longitudine vuote per
            ricavarle automaticamente dall&apos;indirizzo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Indirizzo</Label>
            <Input
              value={indirizzo}
              onChange={(e) => setIndirizzo(e.target.value)}
              placeholder="es. Via Nassa 5"
            />
          </div>
          <div>
            <Label>Città</Label>
            <Input
              value={citta}
              onChange={(e) => setCitta(e.target.value)}
              placeholder="es. Lugano"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Latitudine</Label>
              <Input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="opzionale"
              />
            </div>
            <div>
              <Label>Longitudine</Label>
              <Input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="opzionale"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Annulla
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              onSave({
                indirizzo: indirizzo.trim() || null,
                citta: citta.trim() || null,
                lat: lat.trim() ? Number(lat) : null,
                lng: lng.trim() ? Number(lng) : null,
              })
            }
          >
            {pending ? "Salvataggio…" : "Salva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
