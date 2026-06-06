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
  nome: string;
  prezzo: number | null;
  unita: string | null;
  source: "sell_product" | "inventory";
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

  const pattern = toPostgrestIlikePattern(trimmed);
  const results: ArticoloMatch[] = [];

  const { data: sellProducts, error: sellError } = await supabase
    .from("SellProduct")
    .select("id, name, description, internal_code")
    .eq("site_id", siteId)
    .or(
      `name.ilike.${pattern},description.ilike.${pattern},internal_code.ilike.${pattern}`,
    )
    .limit(5);

  if (sellError) {
    console.warn("[DocumentiSearch] cercaArticolo SellProduct:", sellError.message);
  }

  for (const p of sellProducts ?? []) {
    results.push({
      id: p.id,
      nome: p.name || p.internal_code || String(p.id),
      prezzo: null,
      unita: null,
      source: "sell_product",
    });
  }

  const { data: inventoryItems, error: inventoryError } = await supabase
    .from("inventory_items")
    .select("id, name, description")
    .eq("site_id", siteId)
    .or(`name.ilike.${pattern},description.ilike.${pattern}`)
    .limit(5);

  if (inventoryError) {
    console.warn(
      "[DocumentiSearch] cercaArticolo inventory:",
      inventoryError.message,
    );
  }

  for (const item of inventoryItems ?? []) {
    results.push({
      id: item.id,
      nome: item.name,
      prezzo: null,
      unita: null,
      source: "inventory",
    });
  }

  return results.slice(0, 10);
}
