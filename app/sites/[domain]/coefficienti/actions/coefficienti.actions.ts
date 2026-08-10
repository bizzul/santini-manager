"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { getSiteData } from "@/lib/fetchers";
import { validation } from "@/validation/coefficienti/create";

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

export async function createCoefficienteAction(
  formData: unknown,
  domain?: string,
  siteIdParam?: string,
) {
  const result = validation.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.format() };
  }

  const siteId = await resolveSiteId(domain, siteIdParam);
  if (!siteId) return { success: false, error: "Sito non trovato" };

  const supabase = await createClient();
  const { descrizione, ...rest } = result.data;

  const { data, error } = await supabase
    .from("listino_coefficienti")
    .insert({
      site_id: siteId,
      categoria: rest.categoria,
      codice: rest.codice,
      descrizione: descrizione || null,
      moltiplicatore: rest.moltiplicatore,
      attivo: rest.attivo,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Error creating coefficiente:", error);
    return {
      success: false,
      error:
        error?.code === "23505"
          ? "Esiste gia un coefficiente con questa categoria e codice"
          : "Creazione coefficiente fallita",
    };
  }

  revalidatePath(`/sites/${domain}/coefficienti`);
  return { success: true, data };
}

export async function updateCoefficienteAction(
  id: string,
  formData: unknown,
  domain?: string,
  siteIdParam?: string,
) {
  const result = validation.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.format() };
  }

  const siteId = await resolveSiteId(domain, siteIdParam);
  if (!siteId) return { success: false, error: "Sito non trovato" };

  const supabase = await createClient();
  const { descrizione, ...rest } = result.data;

  const { data, error } = await supabase
    .from("listino_coefficienti")
    .update({
      categoria: rest.categoria,
      codice: rest.codice,
      descrizione: descrizione || null,
      moltiplicatore: rest.moltiplicatore,
      attivo: rest.attivo,
    })
    .eq("id", id)
    .eq("site_id", siteId)
    .select()
    .single();

  if (error || !data) {
    console.error("Error updating coefficiente:", error);
    return {
      success: false,
      error:
        error?.code === "23505"
          ? "Esiste gia un coefficiente con questa categoria e codice"
          : "Modifica coefficiente fallita",
    };
  }

  revalidatePath(`/sites/${domain}/coefficienti`);
  return { success: true, data };
}

export async function toggleCoefficienteAttivoAction(
  id: string,
  attivo: boolean,
  domain?: string,
  siteIdParam?: string,
) {
  const siteId = await resolveSiteId(domain, siteIdParam);
  if (!siteId) return { success: false, error: "Sito non trovato" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("listino_coefficienti")
    .update({ attivo })
    .eq("id", id)
    .eq("site_id", siteId);

  if (error) {
    console.error("Error toggling coefficiente attivo:", error);
    return { success: false, error: "Aggiornamento stato fallito" };
  }

  revalidatePath(`/sites/${domain}/coefficienti`);
  return { success: true };
}

export async function deleteCoefficienteAction(
  id: string,
  domain?: string,
  siteIdParam?: string,
) {
  const siteId = await resolveSiteId(domain, siteIdParam);
  if (!siteId) return { success: false, error: "Sito non trovato" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("listino_coefficienti")
    .delete()
    .eq("id", id)
    .eq("site_id", siteId);

  if (error) {
    console.error("Error deleting coefficiente:", error);
    return { success: false, error: "Eliminazione coefficiente fallita" };
  }

  revalidatePath(`/sites/${domain}/coefficienti`);
  return { success: true };
}
