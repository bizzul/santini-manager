"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { getSiteData } from "@/lib/fetchers";

async function resolveSiteId(domain?: string, siteIdParam?: string) {
  if (siteIdParam) return siteIdParam;
  if (domain) {
    try {
      const siteResult = await getSiteData(domain);
      if (siteResult?.data) return siteResult.data.id as string;
    } catch (error) {
      console.error("Error fetching site data:", error);
    }
  }
  return null;
}

function num(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Griglia dimensionale (listino_griglia_base) — per famiglia apertura
// ---------------------------------------------------------------------------

type GrigliaInput = {
  id?: string;
  famigliaAperturaCod: string;
  larghezza_min_mm: unknown;
  larghezza_max_mm: unknown;
  altezza_min_mm: unknown;
  altezza_max_mm: unknown;
  prezzo_base_chf: unknown;
  attivo?: boolean;
};

export async function saveGrigliaRowAction(
  input: GrigliaInput,
  domain?: string,
  siteIdParam?: string,
) {
  const siteId = await resolveSiteId(domain, siteIdParam);
  if (!siteId) return { success: false, error: "Sito non trovato" };

  const famiglia = (input.famigliaAperturaCod ?? "").trim();
  if (!famiglia) {
    return {
      success: false,
      error: "Imposta prima la famiglia apertura del prodotto e salva.",
    };
  }

  const lMin = num(input.larghezza_min_mm);
  const lMax = num(input.larghezza_max_mm);
  const hMin = num(input.altezza_min_mm);
  const hMax = num(input.altezza_max_mm);
  const prezzo = num(input.prezzo_base_chf);

  if (lMin == null || lMax == null || hMin == null || hMax == null || prezzo == null) {
    return { success: false, error: "Compila tutti i campi della fascia." };
  }
  if (lMax < lMin || hMax < hMin) {
    return { success: false, error: "I valori max devono essere >= dei min." };
  }

  const supabase = await createClient();
  const payload = {
    famiglia_apertura_cod: famiglia,
    larghezza_min_mm: Math.round(lMin),
    larghezza_max_mm: Math.round(lMax),
    altezza_min_mm: Math.round(hMin),
    altezza_max_mm: Math.round(hMax),
    prezzo_base_chf: prezzo,
    attivo: input.attivo ?? true,
  };

  const query = input.id
    ? supabase
        .from("listino_griglia_base")
        .update(payload)
        .eq("id", input.id)
        .eq("site_id", siteId)
    : supabase
        .from("listino_griglia_base")
        .insert({ ...payload, site_id: siteId });

  const { error } = await query;
  if (error) {
    console.error("Error saving griglia row:", error);
    return { success: false, error: "Salvataggio fascia fallito" };
  }

  revalidatePath(`/sites/${domain}/products`);
  return { success: true };
}

export async function deleteGrigliaRowAction(
  id: string,
  domain?: string,
  siteIdParam?: string,
) {
  const siteId = await resolveSiteId(domain, siteIdParam);
  if (!siteId) return { success: false, error: "Sito non trovato" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("listino_griglia_base")
    .delete()
    .eq("id", id)
    .eq("site_id", siteId);

  if (error) {
    console.error("Error deleting griglia row:", error);
    return { success: false, error: "Eliminazione fascia fallita" };
  }

  revalidatePath(`/sites/${domain}/products`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Misure standard (listino_misure_standard) — per prodotto
// ---------------------------------------------------------------------------

type MisuraInput = {
  id?: string;
  sellProductId: number;
  larghezza_mm: unknown;
  altezza_mm: unknown;
  prezzo_chf: unknown;
  attivo?: boolean;
};

export async function saveMisuraAction(
  input: MisuraInput,
  domain?: string,
  siteIdParam?: string,
) {
  const siteId = await resolveSiteId(domain, siteIdParam);
  if (!siteId) return { success: false, error: "Sito non trovato" };

  const larghezza = num(input.larghezza_mm);
  const altezza = num(input.altezza_mm);
  const prezzo = num(input.prezzo_chf);
  if (larghezza == null || altezza == null || prezzo == null) {
    return { success: false, error: "Compila larghezza, altezza e prezzo." };
  }

  const supabase = await createClient();
  const payload = {
    larghezza_mm: Math.round(larghezza),
    altezza_mm: Math.round(altezza),
    prezzo_chf: prezzo,
    attivo: input.attivo ?? true,
  };

  const query = input.id
    ? supabase
        .from("listino_misure_standard")
        .update(payload)
        .eq("id", input.id)
        .eq("site_id", siteId)
    : supabase.from("listino_misure_standard").insert({
        ...payload,
        site_id: siteId,
        sell_product_id: input.sellProductId,
      });

  const { error } = await query;
  if (error) {
    console.error("Error saving misura standard:", error);
    return {
      success: false,
      error:
        error.code === "23505"
          ? "Esiste gia una misura standard con queste dimensioni."
          : "Salvataggio misura fallito",
    };
  }

  revalidatePath(`/sites/${domain}/products`);
  return { success: true };
}

export async function deleteMisuraAction(
  id: string,
  domain?: string,
  siteIdParam?: string,
) {
  const siteId = await resolveSiteId(domain, siteIdParam);
  if (!siteId) return { success: false, error: "Sito non trovato" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("listino_misure_standard")
    .delete()
    .eq("id", id)
    .eq("site_id", siteId);

  if (error) {
    console.error("Error deleting misura standard:", error);
    return { success: false, error: "Eliminazione misura fallita" };
  }

  revalidatePath(`/sites/${domain}/products`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Prezzo singolo (listino_fisso) — per prodotto (fisso / mq / mc)
// ---------------------------------------------------------------------------

export async function saveFissoAction(
  input: { sellProductId: number; prezzo_chf: unknown; attivo?: boolean },
  domain?: string,
  siteIdParam?: string,
) {
  const siteId = await resolveSiteId(domain, siteIdParam);
  if (!siteId) return { success: false, error: "Sito non trovato" };

  const prezzo = num(input.prezzo_chf);
  if (prezzo == null) {
    return { success: false, error: "Inserisci un prezzo valido." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("listino_fisso")
    .select("id")
    .eq("site_id", siteId)
    .eq("sell_product_id", input.sellProductId)
    .maybeSingle();

  const payload = { prezzo_chf: prezzo, attivo: input.attivo ?? true };

  const query = existing?.id
    ? supabase
        .from("listino_fisso")
        .update(payload)
        .eq("id", existing.id)
        .eq("site_id", siteId)
    : supabase.from("listino_fisso").insert({
        ...payload,
        site_id: siteId,
        sell_product_id: input.sellProductId,
      });

  const { error } = await query;
  if (error) {
    console.error("Error saving fisso:", error);
    return { success: false, error: "Salvataggio prezzo fallito" };
  }

  revalidatePath(`/sites/${domain}/products`);
  return { success: true };
}
