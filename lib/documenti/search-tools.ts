import type { SupabaseClient } from "@supabase/supabase-js";
import { toPostgrestIlikePattern } from "@/lib/documenti/safe-supabase-ilike";

export interface ClienteMatch {
  id: number;
  nome: string;
  via: string | null;
  cap: string | null;
  citta: string | null;
}

export interface ArticoloMatch {
  id: string | number;
  codice: string | null;
  descrizione: string;
  prezzo: number | null;
  unita: string | null;
  immagineUrl: string | null;
  score: number;
  source: "sell_product";
}

interface CercaArticoloRow {
  id: number;
  codice: string | null;
  descrizione: string | null;
  unit: string | null;
  list_price: number | null;
  image_url: string | null;
  score: number | null;
}

function getClientDisplayName(client: {
  clientType?: string | null;
  businessName?: string | null;
  individualFirstName?: string | null;
  individualLastName?: string | null;
}): string {
  if (client.clientType === "BUSINESS" && client.businessName) {
    return client.businessName;
  }
  const parts = [
    client.individualFirstName,
    client.individualLastName,
  ].filter(Boolean);
  return parts.join(" ") || client.businessName || "";
}

export async function cercaCliente(
  supabase: SupabaseClient,
  siteId: string,
  query: string,
): Promise<ClienteMatch[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const pattern = toPostgrestIlikePattern(trimmed);

  const { data: clients, error } = await supabase
    .from("Client")
    .select(
      "id, clientType, businessName, individualFirstName, individualLastName, address, city, zipCode",
    )
    .eq("site_id", siteId)
    .or(
      `businessName.ilike.${pattern},individualFirstName.ilike.${pattern},individualLastName.ilike.${pattern}`,
    )
    .limit(10);

  if (error) {
    console.warn("[DocumentiSearch] cercaCliente:", error.message);
    return [];
  }

  if (!clients?.length) return [];

  return clients.map((c) => ({
    id: c.id,
    nome: getClientDisplayName(c),
    via: c.address ?? null,
    cap: c.zipCode != null ? String(c.zipCode) : null,
    citta: c.city ?? null,
  }));
}

export async function cercaClienteById(
  supabase: SupabaseClient,
  siteId: string,
  clientId: number,
): Promise<ClienteMatch | null> {
  const { data: client, error } = await supabase
    .from("Client")
    .select(
      "id, clientType, businessName, individualFirstName, individualLastName, address, city, zipCode",
    )
    .eq("site_id", siteId)
    .eq("id", clientId)
    .maybeSingle();

  if (error || !client) {
    if (error) {
      console.warn("[DocumentiSearch] cercaClienteById:", error.message);
    }
    return null;
  }

  return {
    id: client.id,
    nome: getClientDisplayName(client),
    via: client.address ?? null,
    cap: client.zipCode != null ? String(client.zipCode) : null,
    citta: client.city ?? null,
  };
}

export async function cercaArticolo(
  supabase: SupabaseClient,
  siteId: string,
  query: string,
): Promise<ArticoloMatch[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase.rpc("cerca_articolo", {
    p_site_id: siteId,
    p_query: trimmed,
  });

  if (error) {
    console.warn("[DocumentiSearch] cercaArticolo RPC:", error.message);
    return fallbackCercaArticolo(supabase, siteId, trimmed);
  }

  return ((data as CercaArticoloRow[] | null) ?? []).map((row) => ({
    id: row.id,
    codice: row.codice,
    descrizione: row.descrizione ?? trimmed,
    prezzo: row.list_price != null ? Number(row.list_price) : null,
    unita: row.unit,
    immagineUrl: row.image_url,
    score: Number(row.score ?? 0),
    source: "sell_product" as const,
  }));
}

async function fallbackCercaArticolo(
  supabase: SupabaseClient,
  siteId: string,
  query: string,
): Promise<ArticoloMatch[]> {
  const pattern = toPostgrestIlikePattern(query);

  const { data: sellProducts, error } = await supabase
    .from("SellProduct")
    .select(
      "id, name, description, internal_code, unit, list_price, image_url",
    )
    .eq("site_id", siteId)
    .or(
      `name.ilike.${pattern},description.ilike.${pattern},internal_code.ilike.${pattern}`,
    )
    .limit(5);

  if (error) {
    console.warn("[DocumentiSearch] cercaArticolo fallback:", error.message);
    return [];
  }

  return (sellProducts ?? []).map((p, index) => ({
    id: p.id,
    codice: p.internal_code ?? null,
    descrizione: p.description?.trim() || p.name || String(p.id),
    prezzo: p.list_price != null ? Number(p.list_price) : null,
    unita: p.unit ?? null,
    immagineUrl: p.image_url ?? null,
    score: Math.max(0.5 - index * 0.05, 0.2),
    source: "sell_product" as const,
  }));
}
