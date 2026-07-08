import { createClient } from "@/utils/supabase/server";
import { daysUntil } from "@/components/momentum/types";
import type {
  EvOfferta,
  EvEvento,
  EvEventoFornitore,
  EvEventoTask,
  EvFattura,
  EvLocation,
  EvFornitore,
  EvCliente,
} from "@/components/momentum/types";
import type { EventoCardData } from "@/components/momentum/cards";

const ACTIVE = "deleted_at" as const;

export async function fetchOfferte(siteId: string): Promise<EvOfferta[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ev_offerte")
    .select("*, cliente:ev_clienti(*)")
    .eq("site_id", siteId)
    .is(ACTIVE, null)
    .order("created_at", { ascending: true });
  return (data as EvOfferta[]) || [];
}

interface EventoRaw extends EvEvento {
  location?: EvLocation | null;
}

/** Load events with the per-event aggregates used by the Plan kanban cards. */
export async function fetchEventiPlan(
  siteId: string
): Promise<Array<EventoCardData & { stato_plan: EvEvento["stato_plan"] }>> {
  const supabase = await createClient();

  const [{ data: eventi }, { data: tasks }, { data: forn }] = await Promise.all(
    [
      supabase
        .from("ev_eventi")
        .select("*, location:ev_location(*)")
        .eq("site_id", siteId)
        .is(ACTIVE, null)
        .order("data_evento", { ascending: true }),
      supabase
        .from("ev_eventi_task")
        .select("id, evento_id, stato")
        .eq("site_id", siteId)
        .is(ACTIVE, null),
      supabase
        .from("ev_eventi_fornitori")
        .select("id, evento_id, stato_ingaggio, fornitore:ev_fornitori(categoria)")
        .eq("site_id", siteId)
        .is(ACTIVE, null),
    ]
  );

  const taskByEvent = new Map<string, { total: number; done: number }>();
  for (const t of tasks || []) {
    const cur = taskByEvent.get(t.evento_id) || { total: 0, done: 0 };
    cur.total += 1;
    if (t.stato === "fatto") cur.done += 1;
    taskByEvent.set(t.evento_id, cur);
  }

  const artistiConfByEvent = new Map<string, number>();
  for (const f of (forn as any[]) || []) {
    const cat = f.fornitore?.categoria;
    if (cat !== "artisti") continue;
    const confirmed =
      f.stato_ingaggio === "confermato" || f.stato_ingaggio === "pagato";
    if (!confirmed) continue;
    artistiConfByEvent.set(
      f.evento_id,
      (artistiConfByEvent.get(f.evento_id) || 0) + 1
    );
  }

  return ((eventi as EventoRaw[]) || []).map((e) => {
    const tc = taskByEvent.get(e.id) || { total: 0, done: 0 };
    const dLeft = daysUntil(e.data_evento);
    const artistaAlert =
      dLeft != null &&
      dLeft >= 0 &&
      dLeft <= 14 &&
      (artistiConfByEvent.get(e.id) || 0) === 0;
    return {
      id: e.id,
      titolo: e.titolo,
      data_evento: e.data_evento,
      tipo_evento: e.tipo_evento,
      locationNome: e.location?.nome ?? null,
      taskTotal: tc.total,
      taskDone: tc.done,
      artistaAlert,
      stato_plan: e.stato_plan,
    };
  });
}

export async function fetchAccountingEventi(siteId: string) {
  const supabase = await createClient();
  const [{ data: eventi }, { data: fatture }] = await Promise.all([
    supabase
      .from("ev_eventi")
      .select("id, titolo, data_evento, stato_accounting")
      .eq("site_id", siteId)
      .is(ACTIVE, null)
      .not("stato_accounting", "is", null),
    supabase
      .from("ev_fatture")
      .select("evento_id, direzione, importo")
      .eq("site_id", siteId)
      .is(ACTIVE, null),
  ]);

  const sumByEvent = new Map<string, { in: number; out: number }>();
  for (const f of fatture || []) {
    if (!f.evento_id) continue;
    const cur = sumByEvent.get(f.evento_id) || { in: 0, out: 0 };
    if (f.direzione === "in") cur.in += Number(f.importo) || 0;
    else cur.out += Number(f.importo) || 0;
    sumByEvent.set(f.evento_id, cur);
  }

  return (eventi || []).map((e: any) => {
    const s = sumByEvent.get(e.id) || { in: 0, out: 0 };
    return {
      id: e.id,
      titolo: e.titolo,
      data_evento: e.data_evento,
      totaleIn: s.in,
      totaleOut: s.out,
      stato_accounting: e.stato_accounting,
    };
  });
}

export interface EventoDetail {
  evento: EvEvento;
  fornitori: EvEventoFornitore[];
  tasks: EvEventoTask[];
  fatture: EvFattura[];
  catalogoFornitori: EvFornitore[];
}

export async function fetchEventoDetail(
  siteId: string,
  eventoId: string
): Promise<EventoDetail | null> {
  const supabase = await createClient();
  const { data: evento } = await supabase
    .from("ev_eventi")
    .select("*, cliente:ev_clienti(*), location:ev_location(*)")
    .eq("site_id", siteId)
    .eq("id", eventoId)
    .maybeSingle();
  if (!evento) return null;

  const [{ data: fornitori }, { data: tasks }, { data: fatture }, { data: catalogo }] =
    await Promise.all([
      supabase
        .from("ev_eventi_fornitori")
        .select("*, fornitore:ev_fornitori(*)")
        .eq("site_id", siteId)
        .eq("evento_id", eventoId)
        .is(ACTIVE, null),
      supabase
        .from("ev_eventi_task")
        .select("*")
        .eq("site_id", siteId)
        .eq("evento_id", eventoId)
        .is(ACTIVE, null),
      supabase
        .from("ev_fatture")
        .select("*")
        .eq("site_id", siteId)
        .eq("evento_id", eventoId)
        .is(ACTIVE, null),
      supabase
        .from("ev_fornitori")
        .select("*")
        .eq("site_id", siteId)
        .is(ACTIVE, null)
        .order("nome"),
    ]);

  return {
    evento: evento as EvEvento,
    fornitori: (fornitori as EvEventoFornitore[]) || [],
    tasks: (tasks as EvEventoTask[]) || [],
    fatture: (fatture as EvFattura[]) || [],
    catalogoFornitori: (catalogo as EvFornitore[]) || [],
  };
}

export interface MapData {
  locations: EvLocation[];
  eventi: Array<
    Pick<
      EvEvento,
      "id" | "titolo" | "data_evento" | "stato_plan" | "lat" | "lng"
    > & { locLat: number | null; locLng: number | null }
  >;
  offerte: Array<
    Pick<EvOfferta, "id" | "titolo" | "data_evento_prevista" | "stato" | "lat" | "lng">
  >;
}

export async function fetchMapData(siteId: string): Promise<MapData> {
  const supabase = await createClient();
  const [{ data: locations }, { data: eventi }, { data: offerte }] =
    await Promise.all([
      supabase
        .from("ev_location")
        .select("*")
        .eq("site_id", siteId)
        .is(ACTIVE, null),
      supabase
        .from("ev_eventi")
        .select("id, titolo, data_evento, stato_plan, lat, lng, location:ev_location(lat, lng)")
        .eq("site_id", siteId)
        .is(ACTIVE, null),
      supabase
        .from("ev_offerte")
        .select("id, titolo, data_evento_prevista, stato, lat, lng")
        .eq("site_id", siteId)
        .is(ACTIVE, null),
    ]);

  return {
    locations: (locations as EvLocation[]) || [],
    eventi: ((eventi as any[]) || []).map((e) => ({
      id: e.id,
      titolo: e.titolo,
      data_evento: e.data_evento,
      stato_plan: e.stato_plan,
      lat: e.lat,
      lng: e.lng,
      locLat: e.location?.lat ?? null,
      locLng: e.location?.lng ?? null,
    })),
    offerte: (offerte as any[]) || [],
  };
}

export interface CalendarEvento {
  id: string;
  titolo: string;
  data_evento: string | null;
  tipo_evento: EvEvento["tipo_evento"];
  stato_plan: EvEvento["stato_plan"];
}

/** Eventi dell'anno per la vista calendario (12 mesi). */
export async function fetchCalendarEvents(
  siteId: string,
  year: number
): Promise<CalendarEvento[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ev_eventi")
    .select("id, titolo, data_evento, tipo_evento, stato_plan")
    .eq("site_id", siteId)
    .is(ACTIVE, null)
    .gte("data_evento", `${year}-01-01`)
    .lte("data_evento", `${year}-12-31`)
    .order("data_evento", { ascending: true });
  return (data as CalendarEvento[]) || [];
}

export interface DashboardData {
  prossimiEventi: EventoCardData[];
  redditivita: {
    perCategoria: Array<{ categoria: string; ricavo: number; costi: number }>;
    perEvento: Array<{ titolo: string; margine: number }>;
  };
}

export async function fetchDashboardData(
  siteId: string
): Promise<DashboardData> {
  const supabase = await createClient();
  const planEvents = await fetchEventiPlan(siteId);

  // Prossimi eventi: futuri, ordinati per data, primi 6.
  const prossimiEventi = planEvents
    .filter((e) => {
      const d = daysUntil(e.data_evento);
      return d != null && d >= 0;
    })
    .sort((a, b) => {
      const da = daysUntil(a.data_evento) ?? Infinity;
      const db = daysUntil(b.data_evento) ?? Infinity;
      return da - db;
    })
    .slice(0, 6);

  // Redditivita: ricavo (fatture out) - costi (fatture in) per evento e categoria.
  const [{ data: eventi }, { data: fatture }] = await Promise.all([
    supabase
      .from("ev_eventi")
      .select("id, titolo, categoria_prodotto, ricavo_previsto, budget_previsto")
      .eq("site_id", siteId)
      .is(ACTIVE, null),
    supabase
      .from("ev_fatture")
      .select("evento_id, direzione, importo")
      .eq("site_id", siteId)
      .is(ACTIVE, null),
  ]);

  const sumByEvent = new Map<string, { in: number; out: number }>();
  for (const f of fatture || []) {
    if (!f.evento_id) continue;
    const cur = sumByEvent.get(f.evento_id) || { in: 0, out: 0 };
    if (f.direzione === "in") cur.in += Number(f.importo) || 0;
    else cur.out += Number(f.importo) || 0;
    sumByEvent.set(f.evento_id, cur);
  }

  const perCategoriaMap = new Map<string, { ricavo: number; costi: number }>();
  const perEvento: Array<{ titolo: string; margine: number }> = [];

  for (const e of (eventi as any[]) || []) {
    const s = sumByEvent.get(e.id) || { in: 0, out: 0 };
    // Usa dati reali (fatture) con fallback ai previsti dell'evento.
    const ricavo = s.out > 0 ? s.out : Number(e.ricavo_previsto) || 0;
    const costi = s.in > 0 ? s.in : Number(e.budget_previsto) || 0;
    const cat = e.categoria_prodotto as string;
    const bucket = perCategoriaMap.get(cat) || { ricavo: 0, costi: 0 };
    bucket.ricavo += ricavo;
    bucket.costi += costi;
    perCategoriaMap.set(cat, bucket);
    perEvento.push({ titolo: e.titolo, margine: ricavo - costi });
  }

  return {
    prossimiEventi,
    redditivita: {
      perCategoria: Array.from(perCategoriaMap.entries()).map(
        ([categoria, v]) => ({ categoria, ...v })
      ),
      perEvento: perEvento.sort((a, b) => b.margine - a.margine),
    },
  };
}

export type { EvCliente };
