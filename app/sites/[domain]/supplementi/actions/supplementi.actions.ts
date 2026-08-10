"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { getSiteData } from "@/lib/fetchers";
import { validation } from "@/validation/supplementi/create";

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

async function syncCategorie(
  supabase: Awaited<ReturnType<typeof createClient>>,
  supplementoId: string,
  categorie: string[],
) {
  const { error: delError } = await supabase
    .from("supplementi_categorie")
    .delete()
    .eq("supplemento_id", supplementoId);

  if (delError) {
    console.error("Error clearing supplemento categorie:", delError);
    throw new Error("Impossibile aggiornare le categorie del supplemento");
  }

  if (categorie.length === 0) return;

  const rows = categorie.map((categoria) => ({
    supplemento_id: supplementoId,
    categoria,
  }));

  const { error: insError } = await supabase
    .from("supplementi_categorie")
    .insert(rows);

  if (insError) {
    console.error("Error inserting supplemento categorie:", insError);
    throw new Error("Impossibile salvare le categorie del supplemento");
  }
}

export async function createSupplementoAction(
  formData: unknown,
  domain?: string,
  siteIdParam?: string,
) {
  const result = validation.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.format() };
  }

  const siteId = await resolveSiteId(domain, siteIdParam);
  if (!siteId) {
    return { success: false, error: "Sito non trovato" };
  }

  const supabase = await createClient();
  const { categorie, descrizione, ...rest } = result.data;

  const { data: supplemento, error } = await supabase
    .from("supplementi")
    .insert({
      site_id: siteId,
      codice: rest.codice,
      nome: rest.nome,
      descrizione: descrizione || null,
      tipo_calcolo: rest.tipo_calcolo,
      valore: rest.valore,
      attivo: rest.attivo,
    })
    .select()
    .single();

  if (error || !supplemento) {
    console.error("Error creating supplemento:", error);
    return {
      success: false,
      error:
        error?.code === "23505"
          ? "Esiste gia un supplemento con questo codice"
          : "Creazione supplemento fallita",
    };
  }

  try {
    await syncCategorie(supabase, supplemento.id, categorie);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  revalidatePath(`/sites/${domain}/supplementi`);
  return { success: true, data: supplemento };
}

export async function updateSupplementoAction(
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
  if (!siteId) {
    return { success: false, error: "Sito non trovato" };
  }

  const supabase = await createClient();
  const { categorie, descrizione, ...rest } = result.data;

  const { data: supplemento, error } = await supabase
    .from("supplementi")
    .update({
      codice: rest.codice,
      nome: rest.nome,
      descrizione: descrizione || null,
      tipo_calcolo: rest.tipo_calcolo,
      valore: rest.valore,
      attivo: rest.attivo,
    })
    .eq("id", id)
    .eq("site_id", siteId)
    .select()
    .single();

  if (error || !supplemento) {
    console.error("Error updating supplemento:", error);
    return {
      success: false,
      error:
        error?.code === "23505"
          ? "Esiste gia un supplemento con questo codice"
          : "Modifica supplemento fallita",
    };
  }

  try {
    await syncCategorie(supabase, id, categorie);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  revalidatePath(`/sites/${domain}/supplementi`);
  return { success: true, data: supplemento };
}

export async function toggleSupplementoAttivoAction(
  id: string,
  attivo: boolean,
  domain?: string,
  siteIdParam?: string,
) {
  const siteId = await resolveSiteId(domain, siteIdParam);
  if (!siteId) {
    return { success: false, error: "Sito non trovato" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("supplementi")
    .update({ attivo })
    .eq("id", id)
    .eq("site_id", siteId);

  if (error) {
    console.error("Error toggling supplemento attivo:", error);
    return { success: false, error: "Aggiornamento stato fallito" };
  }

  revalidatePath(`/sites/${domain}/supplementi`);
  return { success: true };
}
