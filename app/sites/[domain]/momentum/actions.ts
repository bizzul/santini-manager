"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { requireServerSiteContext } from "@/lib/server-data";
import type {
  OffertaStato,
  StatoPlan,
  StatoAccounting,
  StatoIngaggio,
  TaskStato,
  FatturaDirezione,
} from "@/components/momentum/types";

function basePath(domain: string) {
  return `/sites/${domain}/momentum`;
}

export async function moveOfferta(
  domain: string,
  offertaId: string,
  toStato: OffertaStato
) {
  const supabase = await createClient();
  const { siteId } = await requireServerSiteContext(domain);
  const { error } = await supabase
    .from("ev_offerte")
    .update({ stato: toStato })
    .eq("id", offertaId)
    .eq("site_id", siteId);
  if (error) throw new Error(error.message);
  // Offerta vinta -> evento is handled by DB trigger.
  revalidatePath(`${basePath(domain)}/vendita`);
  revalidatePath(`${basePath(domain)}/plan`);
  return { ok: true };
}

export async function moveEventoPlan(
  domain: string,
  eventoId: string,
  toStatoPlan: StatoPlan
) {
  const supabase = await createClient();
  const { siteId } = await requireServerSiteContext(domain);

  const update: Record<string, unknown> = { stato_plan: toStatoPlan };
  if (toStatoPlan === "finish") {
    // Event enters Accounting when it reaches Finish.
    const { data: existing } = await supabase
      .from("ev_eventi")
      .select("stato_accounting")
      .eq("id", eventoId)
      .eq("site_id", siteId)
      .maybeSingle();
    if (!existing?.stato_accounting) {
      update.stato_accounting = "invoice_in";
    }
  }

  const { error } = await supabase
    .from("ev_eventi")
    .update(update)
    .eq("id", eventoId)
    .eq("site_id", siteId);
  if (error) throw new Error(error.message);
  revalidatePath(`${basePath(domain)}/plan`);
  revalidatePath(`${basePath(domain)}/accounting`);
  return { ok: true };
}

export async function moveEventoAccounting(
  domain: string,
  eventoId: string,
  toStatoAccounting: StatoAccounting
) {
  const supabase = await createClient();
  const { siteId } = await requireServerSiteContext(domain);
  const { error } = await supabase
    .from("ev_eventi")
    .update({ stato_accounting: toStatoAccounting })
    .eq("id", eventoId)
    .eq("site_id", siteId);
  if (error) throw new Error(error.message);
  revalidatePath(`${basePath(domain)}/accounting`);
  return { ok: true };
}

export async function moveTask(
  domain: string,
  taskId: string,
  toStato: TaskStato
) {
  const supabase = await createClient();
  const { siteId } = await requireServerSiteContext(domain);
  const { error } = await supabase
    .from("ev_eventi_task")
    .update({ stato: toStato })
    .eq("id", taskId)
    .eq("site_id", siteId);
  if (error) throw new Error(error.message);
  revalidatePath(`${basePath(domain)}/eventi`, "layout");
  return { ok: true };
}

export async function addTask(
  domain: string,
  eventoId: string,
  titolo: string
) {
  const supabase = await createClient();
  const { siteId } = await requireServerSiteContext(domain);
  const { error } = await supabase.from("ev_eventi_task").insert({
    site_id: siteId,
    evento_id: eventoId,
    titolo,
    stato: "da_fare",
  });
  if (error) throw new Error(error.message);
  revalidatePath(`${basePath(domain)}/eventi/${eventoId}`);
  return { ok: true };
}

export async function addFornitore(
  domain: string,
  eventoId: string,
  fornitoreId: string,
  ruolo: string | null,
  statoIngaggio: StatoIngaggio,
  costo: number | null
) {
  const supabase = await createClient();
  const { siteId } = await requireServerSiteContext(domain);
  const { error } = await supabase.from("ev_eventi_fornitori").insert({
    site_id: siteId,
    evento_id: eventoId,
    fornitore_id: fornitoreId,
    ruolo,
    stato_ingaggio: statoIngaggio,
    costo,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`${basePath(domain)}/eventi/${eventoId}`);
  return { ok: true };
}

export async function updateFornitoreIngaggio(
  domain: string,
  eventoId: string,
  linkId: string,
  statoIngaggio: StatoIngaggio
) {
  const supabase = await createClient();
  const { siteId } = await requireServerSiteContext(domain);
  const { error } = await supabase
    .from("ev_eventi_fornitori")
    .update({ stato_ingaggio: statoIngaggio })
    .eq("id", linkId)
    .eq("site_id", siteId);
  if (error) throw new Error(error.message);
  revalidatePath(`${basePath(domain)}/eventi/${eventoId}`);
  return { ok: true };
}

export async function addFattura(
  domain: string,
  eventoId: string,
  direzione: FatturaDirezione,
  descrizione: string | null,
  importo: number
) {
  const supabase = await createClient();
  const { siteId } = await requireServerSiteContext(domain);
  const { error } = await supabase.from("ev_fatture").insert({
    site_id: siteId,
    evento_id: eventoId,
    direzione,
    descrizione,
    importo,
    stato: "aperta",
  });
  if (error) throw new Error(error.message);
  revalidatePath(`${basePath(domain)}/eventi/${eventoId}`);
  revalidatePath(`${basePath(domain)}/accounting`);
  return { ok: true };
}
