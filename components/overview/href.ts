import type { OverviewFilters } from "@/types/overview-connector";

type FilterPatch = Partial<{
  spazio: OverviewFilters["spazio"];
  ambito: string | null;
  stato: OverviewFilters["stato"];
  azienda: string | null;
  persona: string | null;
}>;

/**
 * Costruisce l'href della home Overview con i filtri serializzati come
 * searchParams (condivisibili, sopravvivono al refresh). Passare `patch` per
 * modificare uno o piu' filtri partendo da quelli correnti; passare `null` per
 * rimuovere un filtro (utile per il toggle di attivazione/disattivazione).
 */
export function buildOverviewHref(
  domain: string,
  current: OverviewFilters,
  patch: FilterPatch = {},
): string {
  const next: OverviewFilters = { ...current, ...patch };
  const params = new URLSearchParams();

  if (next.spazio && next.spazio !== "tutto") params.set("spazio", next.spazio);
  if (next.ambito) params.set("ambito", next.ambito);
  if (next.stato) params.set("stato", next.stato);
  if (next.azienda) params.set("azienda", next.azienda);
  if (next.persona) params.set("persona", next.persona);

  const qs = params.toString();
  return `/sites/${domain}${qs ? `?${qs}` : ""}`;
}
