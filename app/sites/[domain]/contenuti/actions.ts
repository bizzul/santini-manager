"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getServerSiteContext } from "@/lib/server-data";
import { isCampagnaElettorale } from "@/lib/campagna/config";
import { contenutoSchema } from "@/validation/campagna/contenuto";
import { logger } from "@/lib/logger";

const log = logger.scope("CampagnaContenutiActions");

type ActionResult =
  | { success: true; id: string }
  | { success: false; error: string };

async function resolveCampagnaSiteId(domain: string): Promise<string | null> {
  const context = await getServerSiteContext(domain);
  if (!context) return null;
  if (!isCampagnaElettorale(context.siteData?.site_type)) return null;
  return context.siteId;
}

function buildPayload(data: {
  titolo: string;
  formato: string;
  stato: string;
  corpo_testo?: string;
  canale?: string;
  data_pubblicazione_prevista?: string;
}) {
  return {
    titolo: data.titolo.trim(),
    formato: data.formato,
    stato: data.stato,
    corpo_testo: data.corpo_testo?.trim() || null,
    canale: data.canale?.trim() || null,
    data_pubblicazione_prevista: data.data_pubblicazione_prevista || null,
  };
}

export async function createContenuto(
  domain: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = contenutoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dati non validi",
    };
  }

  const siteId = await resolveCampagnaSiteId(domain);
  if (!siteId) return { success: false, error: "Sito non valido" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("campagna_contenuti")
    .insert({ ...buildPayload(parsed.data), site_id: siteId, autore_id: user?.id ?? null })
    .select("id")
    .single();

  if (error) {
    log.error("Error creating contenuto:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/sites/${domain}/contenuti`);
  return { success: true, id: data.id };
}

export async function updateContenuto(
  domain: string,
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = contenutoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dati non validi",
    };
  }

  const siteId = await resolveCampagnaSiteId(domain);
  if (!siteId) return { success: false, error: "Sito non valido" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("campagna_contenuti")
    .update({ ...buildPayload(parsed.data), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("site_id", siteId);

  if (error) {
    log.error("Error updating contenuto:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/sites/${domain}/contenuti`);
  return { success: true, id };
}

export async function softDeleteContenuto(
  domain: string,
  id: string,
): Promise<ActionResult> {
  const siteId = await resolveCampagnaSiteId(domain);
  if (!siteId) return { success: false, error: "Sito non valido" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("campagna_contenuti")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("site_id", siteId);

  if (error) {
    log.error("Error deleting contenuto:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/sites/${domain}/contenuti`);
  return { success: true, id };
}
