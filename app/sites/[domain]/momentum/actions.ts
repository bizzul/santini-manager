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

async function geocodeViaNominatim(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const params = new URLSearchParams({
    q: address,
    format: "jsonv2",
    limit: "1",
    addressdetails: "0",
  });
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          "User-Agent": "santini-manager/1.0 (momentum-fornitori-geocoder)",
        },
      }
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as Array<{
      lat?: string;
      lon?: string;
    }>;
    const first = payload?.[0];
    const lat = first?.lat ? Number(first.lat) : Number.NaN;
    const lng = first?.lon ? Number(first.lon) : Number.NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

export async function updateFornitoreLocation(
  domain: string,
  fornitoreId: string,
  input: {
    indirizzo: string | null;
    citta: string | null;
    lat: number | null;
    lng: number | null;
  }
): Promise<{ ok: true; lat: number | null; lng: number | null; geocoded: boolean }> {
  const supabase = await createClient();
  const { siteId } = await requireServerSiteContext(domain);

  let { lat, lng } = input;
  const indirizzo = input.indirizzo?.trim() || null;
  const citta = input.citta?.trim() || null;
  let geocoded = false;

  // Auto-geocode when coordinates are missing but we have an address.
  if ((lat == null || lng == null) && (indirizzo || citta)) {
    const address = [indirizzo, citta, "Svizzera"].filter(Boolean).join(", ");
    const point = await geocodeViaNominatim(address);
    if (point) {
      lat = point.lat;
      lng = point.lng;
      geocoded = true;
    }
  }

  const { error } = await supabase
    .from("ev_fornitori")
    .update({ indirizzo, citta, lat, lng })
    .eq("id", fornitoreId)
    .eq("site_id", siteId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(domain)}/fornitori`);
  revalidatePath(`${basePath(domain)}/mappa`);
  return { ok: true, lat, lng, geocoded };
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
