"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getServerSiteContext } from "@/lib/server-data";
import { isCampagnaElettorale } from "@/lib/campagna/config";
import { contattoSchema } from "@/validation/campagna/contatto";
import { logger } from "@/lib/logger";

const log = logger.scope("CampagnaContattiActions");

type ActionResult =
  | { success: true; id: string }
  | { success: false; error: string };

async function resolveCampagnaSiteId(domain: string): Promise<string | null> {
  const context = await getServerSiteContext(domain);
  if (!context) return null;
  if (!isCampagnaElettorale(context.siteData?.site_type)) return null;
  return context.siteId;
}

function normalizeInput(data: Record<string, unknown>) {
  const empty = (v: unknown) =>
    typeof v === "string" && v.trim() === "" ? null : v;
  return {
    nome: (data.nome as string).trim(),
    cognome: empty(data.cognome),
    comune: empty(data.comune),
    email: empty(data.email),
    telefono: empty(data.telefono),
    tipo: data.tipo,
    fonte: empty(data.fonte),
    note: empty(data.note),
    consenso_stato: data.consenso_stato,
    consenso_base_legale: data.consenso_base_legale,
  };
}

export async function createContatto(
  domain: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = contattoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dati non validi",
    };
  }

  const siteId = await resolveCampagnaSiteId(domain);
  if (!siteId) return { success: false, error: "Sito non valido" };

  const supabase = await createClient();

  const payload = {
    ...normalizeInput(parsed.data),
    site_id: siteId,
    consenso_data: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("campagna_contatti")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    log.error("Error creating contatto:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/sites/${domain}/crm/contatti`);
  return { success: true, id: data.id };
}

export async function updateContatto(
  domain: string,
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = contattoSchema.safeParse(input);
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
    .from("campagna_contatti")
    .update({
      ...normalizeInput(parsed.data),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("site_id", siteId);

  if (error) {
    log.error("Error updating contatto:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/sites/${domain}/crm/contatti`);
  revalidatePath(`/sites/${domain}/crm/contatti/${id}`);
  return { success: true, id };
}

export async function softDeleteContatto(
  domain: string,
  id: string,
): Promise<ActionResult> {
  const siteId = await resolveCampagnaSiteId(domain);
  if (!siteId) return { success: false, error: "Sito non valido" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("campagna_contatti")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("site_id", siteId);

  if (error) {
    log.error("Error deleting contatto:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/sites/${domain}/crm/contatti`);
  return { success: true, id };
}

export async function createInterazione(
  domain: string,
  contattoId: string,
  input: { tipo: string; note?: string | null; data?: string | null },
): Promise<ActionResult> {
  const siteId = await resolveCampagnaSiteId(domain);
  if (!siteId) return { success: false, error: "Sito non valido" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("campagna_interazioni")
    .insert({
      site_id: siteId,
      contatto_id: contattoId,
      tipo: input.tipo,
      note: input.note?.trim() || null,
      data: input.data || new Date().toISOString(),
      registrato_da: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    log.error("Error creating interazione:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/sites/${domain}/crm/contatti/${contattoId}`);
  revalidatePath(`/sites/${domain}/crm/interazioni`);
  return { success: true, id: data.id };
}
