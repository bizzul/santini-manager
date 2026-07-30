import { createClient } from "@/utils/supabase/server";
import type { TmSensorType, TmStatoSalute } from "@/lib/treemap/constants";

export interface TreemapAlberoMapRow {
  albero_id: string;
  codice: string;
  specie_comune: string;
  specie_botanica: string | null;
  latitude: number;
  longitude: number;
  comune: string;
  indirizzo: string | null;
  stato_albero: string;
  stato_salute: TmStatoSalute;
  n_sensori: number;
  n_sensori_offline: number;
  ultima_lettura_at: string | null;
  tipi_sensore: TmSensorType[];
  cliente_nome: string | null;
  task_titolo: string | null;
  client_id: number | null;
  task_id: number | null;
}

export interface TreemapLetturaRow {
  misurato_at: string;
  valore: number;
}

export interface TreemapPageData {
  alberi: TreemapAlberoMapRow[];
  clienti: Array<{ id: number; name: string }>;
  comuni: string[];
}

export interface TreemapSensoreStatoRow {
  sensore_id: string;
  tipo: TmSensorType;
  etichetta: string | null;
  modello: string | null;
  unita_misura: string;
  valore_attuale: number | null;
  misurato_at: string | null;
  stato: TmStatoSalute;
  batteria_pct: number | null;
  intervallo_minuti: number;
  ultimo_contatto_at: string | null;
  verde_min: number | null;
  verde_max: number | null;
  giallo_min: number | null;
  giallo_max: number | null;
  delta_24h: number | null;
  installato_at: string | null;
}

export interface TreemapAlberoDetail extends TreemapAlberoMapRow {
  altezza_m: number | null;
  diametro_tronco_cm: number | null;
  anno_piantumazione: number | null;
}

export interface TreemapAlberoStatoResponse {
  albero: TreemapAlberoDetail;
  sensori: TreemapSensoreStatoRow[];
}

export async function fetchTreemapPageData(
  siteId: string,
): Promise<TreemapPageData> {
  const supabase = await createClient();

    const { data: alberiRaw, error: alberiError } = await supabase
      .from("vw_tm_alberi_mappa")
      .select("*")
      .eq("site_id", siteId)
      .order("codice");

    if (alberiError) {
      throw new Error(`Treemap alberi: ${alberiError.message}`);
    }

    const alberi: TreemapAlberoMapRow[] = (alberiRaw ?? []).map((row) => ({
      albero_id: row.albero_id as string,
      codice: row.codice as string,
      specie_comune: row.specie_comune as string,
      specie_botanica: (row.specie_botanica as string | null) ?? null,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      comune: row.comune as string,
      indirizzo: (row.indirizzo as string | null) ?? null,
      stato_albero: row.stato_albero as string,
      stato_salute: row.stato_salute as TmStatoSalute,
      n_sensori: Number(row.n_sensori),
      n_sensori_offline: Number(row.n_sensori_offline),
      ultima_lettura_at: (row.ultima_lettura_at as string | null) ?? null,
      tipi_sensore: (row.tipi_sensore as TmSensorType[]) ?? [],
      cliente_nome: (row.cliente_nome as string | null) ?? null,
      task_titolo: (row.task_titolo as string | null) ?? null,
      client_id: row.client_id != null ? Number(row.client_id) : null,
      task_id: row.task_id != null ? Number(row.task_id) : null,
    }));

    const clienti = Array.from(
      new Map(
        alberi
          .filter((a) => a.client_id != null && a.cliente_nome)
          .map((a) => [
            a.client_id!,
            { id: a.client_id!, name: a.cliente_nome! },
          ]),
      ).values(),
    );

    const comuni = Array.from(new Set(alberi.map((a) => a.comune))).sort();

    return { alberi, clienti, comuni };
}

function mapAlberoDetailRow(
  row: Record<string, unknown>,
): TreemapAlberoDetail {
  return {
    albero_id: row.albero_id as string,
    codice: row.codice as string,
    specie_comune: row.specie_comune as string,
    specie_botanica: (row.specie_botanica as string | null) ?? null,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    comune: row.comune as string,
    indirizzo: (row.indirizzo as string | null) ?? null,
    stato_albero: (row.stato_albero ?? row.stato) as string,
    stato_salute: row.stato_salute as TmStatoSalute,
    n_sensori: Number(row.n_sensori ?? 0),
    n_sensori_offline: Number(row.n_sensori_offline ?? 0),
    ultima_lettura_at: (row.ultima_lettura_at as string | null) ?? null,
    tipi_sensore: (row.tipi_sensore as TmSensorType[]) ?? [],
    cliente_nome: (row.cliente_nome as string | null) ?? null,
    task_titolo: (row.task_titolo as string | null) ?? null,
    client_id: row.client_id != null ? Number(row.client_id) : null,
    task_id: row.task_id != null ? Number(row.task_id) : null,
    altezza_m: row.altezza_m != null ? Number(row.altezza_m) : null,
    diametro_tronco_cm:
      row.diametro_tronco_cm != null ? Number(row.diametro_tronco_cm) : null,
    anno_piantumazione:
      row.anno_piantumazione != null ? Number(row.anno_piantumazione) : null,
  };
}

export async function fetchTreemapAlberoStato(
  siteId: string,
  alberoId: string,
): Promise<TreemapAlberoStatoResponse> {
  const supabase = await createClient();

  const [{ data: alberoRaw, error: alberoError }, { data: sensoriRaw, error: sensoriError }] =
    await Promise.all([
      supabase
        .from("vw_tm_alberi_mappa")
        .select("*")
        .eq("site_id", siteId)
        .eq("albero_id", alberoId)
        .maybeSingle(),
      supabase.rpc("tm_sensori_stato_attuale", { p_albero_id: alberoId }),
    ]);

  if (alberoError) throw new Error(alberoError.message);
  if (!alberoRaw) throw new Error("Albero non trovato");
  if (sensoriError) throw new Error(sensoriError.message);

  const { data: extraRaw } = await supabase
    .from("tm_alberi")
    .select("altezza_m, diametro_tronco_cm, anno_piantumazione, stato")
    .eq("id", alberoId)
    .eq("site_id", siteId)
    .maybeSingle();

  const merged = {
    ...alberoRaw,
    altezza_m: extraRaw?.altezza_m ?? null,
    diametro_tronco_cm: extraRaw?.diametro_tronco_cm ?? null,
    anno_piantumazione: extraRaw?.anno_piantumazione ?? null,
    stato: extraRaw?.stato ?? alberoRaw.stato_albero,
  };

  const sensori: TreemapSensoreStatoRow[] = (
    (sensoriRaw ?? []) as Record<string, unknown>[]
  ).map((row) => ({
    sensore_id: row.sensore_id as string,
    tipo: row.tipo as TmSensorType,
    etichetta: (row.etichetta as string | null) ?? null,
    modello: (row.modello as string | null) ?? null,
    unita_misura: row.unita_misura as string,
    valore_attuale: row.valore_attuale != null ? Number(row.valore_attuale) : null,
    misurato_at: (row.misurato_at as string | null) ?? null,
    stato: row.stato as TmStatoSalute,
    batteria_pct: row.batteria_pct != null ? Number(row.batteria_pct) : null,
    intervallo_minuti: Number(row.intervallo_minuti),
    ultimo_contatto_at: (row.ultimo_contatto_at as string | null) ?? null,
    verde_min: row.verde_min != null ? Number(row.verde_min) : null,
    verde_max: row.verde_max != null ? Number(row.verde_max) : null,
    giallo_min: row.giallo_min != null ? Number(row.giallo_min) : null,
    giallo_max: row.giallo_max != null ? Number(row.giallo_max) : null,
    delta_24h: row.delta_24h != null ? Number(row.delta_24h) : null,
    installato_at: (row.installato_at as string | null) ?? null,
  }));

  return {
    albero: mapAlberoDetailRow(merged as Record<string, unknown>),
    sensori,
  };
}

export async function fetchTreemapSensorReadings(
  siteId: string,
  sensoreId: string,
): Promise<TreemapLetturaRow[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("tm_letture")
    .select("misurato_at, valore")
    .eq("site_id", siteId)
    .eq("sensore_id", sensoreId)
    .gte("misurato_at", since)
    .order("misurato_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    misurato_at: r.misurato_at as string,
    valore: Number(r.valore),
  }));
}

export interface CreateTreemapAlberoInput {
  codice: string;
  specie_comune: string;
  specie_botanica?: string | null;
  latitude: number;
  longitude: number;
  comune: string;
  indirizzo?: string | null;
  npa?: string | null;
}

export async function suggestTreemapAlberoCodice(
  siteId: string,
): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tm_alberi")
    .select("codice")
    .eq("site_id", siteId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const codes = (data ?? []).map((r) => String(r.codice));
  const prefix = codes.some((c) => c.startsWith("BEN-ALB-"))
    ? "BEN-ALB-"
    : "TM-ALB-";

  let maxNum = 0;
  for (const code of codes) {
    const match = code.match(/(\d+)\s*$/);
    if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
  }

  return `${prefix}${String(maxNum + 1).padStart(3, "0")}`;
}

export async function createTreemapAlbero(
  siteId: string,
  input: CreateTreemapAlberoInput,
): Promise<TreemapAlberoMapRow> {
  const supabase = await createClient();

  const lat = Number(input.latitude);
  const lng = Number(input.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Coordinate non valide");
  }
  if (lat < 45.8 || lat > 46.65 || lng < 8.35 || lng > 9.2) {
    throw new Error("Le coordinate devono essere nel Canton Ticino");
  }

  const codice = input.codice.trim();
  const specie = input.specie_comune.trim();
  const comune = input.comune.trim();
  if (!codice || !specie || !comune) {
    throw new Error("Codice, specie e comune sono obbligatori");
  }

  const { data: inserted, error } = await supabase
    .from("tm_alberi")
    .insert({
      site_id: siteId,
      codice,
      specie_comune: specie,
      specie_botanica: input.specie_botanica?.trim() || null,
      latitude: lat,
      longitude: lng,
      comune,
      indirizzo: input.indirizzo?.trim() || null,
      npa: input.npa?.trim() || null,
      stato: "ATTIVO",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Esiste già un albero con questo codice");
    }
    throw new Error(error.message);
  }

  const { data: viewRow, error: viewError } = await supabase
    .from("vw_tm_alberi_mappa")
    .select("*")
    .eq("albero_id", inserted.id)
    .single();

  if (viewError || !viewRow) {
    return {
      albero_id: inserted.id as string,
      codice,
      specie_comune: specie,
      specie_botanica: input.specie_botanica?.trim() || null,
      latitude: lat,
      longitude: lng,
      comune,
      indirizzo: input.indirizzo?.trim() || null,
      stato_albero: "ATTIVO",
      stato_salute: "SCONOSCIUTO",
      n_sensori: 0,
      n_sensori_offline: 0,
      ultima_lettura_at: null,
      tipi_sensore: [],
      cliente_nome: null,
      task_titolo: null,
      client_id: null,
      task_id: null,
    };
  }

  return {
    albero_id: viewRow.albero_id as string,
    codice: viewRow.codice as string,
    specie_comune: viewRow.specie_comune as string,
    specie_botanica: (viewRow.specie_botanica as string | null) ?? null,
    latitude: Number(viewRow.latitude),
    longitude: Number(viewRow.longitude),
    comune: viewRow.comune as string,
    indirizzo: (viewRow.indirizzo as string | null) ?? null,
    stato_albero: viewRow.stato_albero as string,
    stato_salute: viewRow.stato_salute as TmStatoSalute,
    n_sensori: Number(viewRow.n_sensori),
    n_sensori_offline: Number(viewRow.n_sensori_offline),
    ultima_lettura_at: (viewRow.ultima_lettura_at as string | null) ?? null,
    tipi_sensore: (viewRow.tipi_sensore as TmSensorType[]) ?? [],
    cliente_nome: (viewRow.cliente_nome as string | null) ?? null,
    task_titolo: (viewRow.task_titolo as string | null) ?? null,
    client_id: viewRow.client_id != null ? Number(viewRow.client_id) : null,
    task_id: viewRow.task_id != null ? Number(viewRow.task_id) : null,
  };
}
