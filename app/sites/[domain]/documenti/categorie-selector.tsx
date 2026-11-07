"use client";

import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import {
  fetchOffertaTemplates,
  type OffertaTemplate,
} from "@/lib/documenti/offerta-template";
import { OW } from "./wizard-ui";

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
      <div className="flex items-center gap-2 text-sm text-[var(--ow-text-3)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Caricamento categorie...
      </div>
    );
  }

  if (errore || templates.length === 0) {
    return null;
  }

  return (
    <div className={`${OW.card} space-y-3`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={OW.cardTitle}>Categorie da offrire</h2>
        <span className={OW.cardHint}>
          {value.length === 0
            ? "Nessuna selezionata"
            : `${value.length} selezionate · ${nRighe} righe base`}
        </span>
      </div>
      <p className={OW.cardHint}>
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
              className={attivo ? OW.tileActive : OW.tile}
            >
              <Checkbox
                id={`cat-${t.id}`}
                className="mt-0.5 border-[var(--ow-input-border)] data-[state=checked]:border-[var(--ow-accent)] data-[state=checked]:bg-[var(--ow-accent)] data-[state=checked]:text-[var(--ow-accent-fg)]"
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
                <span
                  className={`block text-sm font-semibold ${
                    attivo ? "text-[var(--ow-text)]" : "text-[var(--ow-text-2)]"
                  }`}
                >
                  {t.categoria}
                </span>
                <span className="mt-0.5 block text-[11px] text-[var(--ow-text-3)]">
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
