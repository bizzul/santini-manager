"use client";

import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import {
  fetchOffertaTemplates,
  type OffertaTemplate,
} from "@/lib/documenti/offerta-template";

/**
 * Scelta delle categorie da offrire, nel passo 1.
 *
 * E' il pezzo che toglie la ricerca a catalogo dal percorso normale: scelta
 * la categoria, al passo 2 le posizioni ricorrenti sono gia' lì e restano da
 * compilare solo misure e quantita'.
 */

interface CategorieSelectorProps {
  domain: string;
  /** Id dei template scelti. */
  value: string[];
  onChange: (ids: string[]) => void;
  onTemplatesLoaded?: (templates: OffertaTemplate[]) => void;
}

export function CategorieSelector({
  domain,
  value,
  onChange,
  onTemplatesLoaded,
}: CategorieSelectorProps) {
  const [templates, setTemplates] = useState<OffertaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const t = await fetchOffertaTemplates(domain);
        if (!active) return;
        setTemplates(t);
        onTemplatesLoaded?.(t);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain]);

  const nRighe = templates
    .filter((t) => value.includes(t.id))
    .reduce((acc, t) => acc + t.righe.length, 0);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Caricamento categorie...
      </div>
    );
  }

  if (errore || templates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-muted/5 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">Categorie da offrire</p>
        <span className="text-xs text-muted-foreground">
          {value.length === 0
            ? "Nessuna selezionata"
            : `${value.length} selezionate · ${nRighe} righe base`}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Ogni categoria porta al passo successivo le sue posizioni ricorrenti,
        gia&apos; scritte. Restano da compilare misure e quantita&apos;.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => {
          const attivo = value.includes(t.id);
          return (
            <label
              key={t.id}
              htmlFor={`cat-${t.id}`}
              className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${
                attivo
                  ? "border-primary bg-primary/5"
                  : "bg-muted/10 hover:bg-muted/20"
              }`}
            >
              <Checkbox
                id={`cat-${t.id}`}
                checked={attivo}
                onCheckedChange={() =>
                  onChange(
                    attivo
                      ? value.filter((x) => x !== t.id)
                      : [...value, t.id],
                  )
                }
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{t.categoria}</span>
                <span className="block text-xs text-muted-foreground">
                  {t.righe.length}{" "}
                  {t.righe.length === 1 ? "riga base" : "righe base"}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
