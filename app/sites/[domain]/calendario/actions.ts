"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getServerSiteContext } from "@/lib/server-data";
import { isCampagnaElettorale } from "@/lib/campagna/config";
import { eventoSchema } from "@/validation/campagna/evento";
import { logger } from "@/lib/logger";

const log = logger.scope("CampagnaEventiActions");

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
  tipo: string;
  stato: string;
  data_inizio: string;
  data_fine?: string;
  luogo?: string;
  comune?: string;
}) {
  return {
    titolo: data.titolo.trim(),
    tipo: data.tipo,
    stato: data.stato,
    data_inizio: data.data_inizio,
    data_fine: data.data_fine || null,
    luogo: data.luogo?.trim() || null,
    comune: data.comune?.trim() || null,
  };
}

export async function createEvento(
  domain: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = eventoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dati non validi",
    };
  }

  const siteId = await resolveCampagnaSiteId(domain);
  if (!siteId) return { success: false, error: "Sito non valido" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campagna_eventi")
    .insert({ ...buildPayload(parsed.data), site_id: siteId })
    .select("id")
    .single();

  if (error) {
    log.error("Error creating evento:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/sites/${domain}/calendario`);
  return { success: true, id: data.id };
}

export async function updateEvento(
  domain: string,
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = eventoSchema.safeParse(input);
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
    .from("campagna_eventi")
    .update({ ...buildPayload(parsed.data), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("site_id", siteId);

  if (error) {
    log.error("Error updating evento:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/sites/${domain}/calendario`);
  return { success: true, id };
}
