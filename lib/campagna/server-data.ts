import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { logger } from "@/lib/logger";
import {
  type CampagnaContatto,
  type CampagnaContenuto,
  type CampagnaEvento,
  type CampagnaInterazione,
  type ConsensoStato,
  type ContattoTipo,
  type ContenutoStato,
  type EventoStato,
  type EventoTipo,
} from "@/lib/campagna/config";

const log = logger.scope("CampagnaServerData");

export interface CampagnaEventoPreview {
  id: string;
  titolo: string;
  tipo: EventoTipo;
  data_inizio: string;
  data_fine: string | null;
  luogo: string | null;
  comune: string | null;
  stato: EventoStato;
}

export interface ComuneAggregate {
  comune: string;
  count: number;
}

export interface CampagnaDashboardData {
  totaleContatti: number;
  contattiPerTipo: Record<ContattoTipo, number>;
  contenutiPerStato: Record<ContenutoStato, number>;
  totaleContenuti: number;
  prossimiEventi: CampagnaEventoPreview[];
  contattiPerComune: ComuneAggregate[];
}

const EMPTY_TIPO: Record<ContattoTipo, number> = {
  elettore: 0,
  volontario: 0,
  donatore: 0,
  simpatizzante: 0,
};

const EMPTY_STATO: Record<ContenutoStato, number> = {
  bozza: 0,
  revisione: 0,
  approvato: 0,
  pubblicato: 0,
};

/**
 * Aggregated, privacy-preserving snapshot for the campaign Overview.
 *
 * Every query is scoped to the current `site_id` and uses the RLS-aware user
 * client. The Overview only ever exposes counts (never nominal lists), because
 * political opinions are specially protected data under the Swiss FADP/LPD.
 */
export const fetchCampagnaDashboardData = cache(
  async (siteId: string): Promise<CampagnaDashboardData> => {
    const supabase = await createClient();
    const todayIso = new Date().toISOString();

    const [contattiRes, contenutiRes, eventiRes] = await Promise.all([
      supabase
        .from("campagna_contatti")
        .select("tipo, comune")
        .eq("site_id", siteId)
        .is("deleted_at", null),
      supabase
        .from("campagna_contenuti")
        .select("stato")
        .eq("site_id", siteId)
        .is("deleted_at", null),
      supabase
        .from("campagna_eventi")
        .select("id, titolo, tipo, data_inizio, data_fine, luogo, comune, stato")
        .eq("site_id", siteId)
        .is("deleted_at", null)
        .gte("data_inizio", todayIso)
        .order("data_inizio", { ascending: true })
        .limit(12),
    ]);

    if (contattiRes.error) {
      log.warn("Error fetching campagna_contatti:", contattiRes.error);
    }
    if (contenutiRes.error) {
      log.warn("Error fetching campagna_contenuti:", contenutiRes.error);
    }
    if (eventiRes.error) {
      log.warn("Error fetching campagna_eventi:", eventiRes.error);
    }

    const contattiPerTipo = { ...EMPTY_TIPO };
    const comuneCounts = new Map<string, number>();
    for (const row of contattiRes.data ?? []) {
      const tipo = row.tipo as ContattoTipo | null;
      if (tipo && tipo in contattiPerTipo) contattiPerTipo[tipo] += 1;
      const comune = (row.comune as string | null)?.trim();
      if (comune) comuneCounts.set(comune, (comuneCounts.get(comune) ?? 0) + 1);
    }

    const contenutiPerStato = { ...EMPTY_STATO };
    for (const row of contenutiRes.data ?? []) {
      const stato = row.stato as ContenutoStato | null;
      if (stato && stato in contenutiPerStato) contenutiPerStato[stato] += 1;
    }

    const contattiPerComune: ComuneAggregate[] = Array.from(
      comuneCounts.entries(),
    )
      .map(([comune, count]) => ({ comune, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totaleContatti: contattiRes.data?.length ?? 0,
      contattiPerTipo,
      contenutiPerStato,
      totaleContenuti: contenutiRes.data?.length ?? 0,
      prossimiEventi: (eventiRes.data ?? []) as CampagnaEventoPreview[],
      contattiPerComune,
    };
  },
);

export interface ContattoWithLastInteraction extends CampagnaContatto {
  ultima_interazione: string | null;
}

/**
 * Contacts for the CRM table, enriched with the last interaction date.
 * Scoped to `site_id`, excludes soft-deleted rows.
 */
export const fetchContatti = cache(
  async (siteId: string): Promise<ContattoWithLastInteraction[]> => {
    const supabase = await createClient();

    const [contattiRes, interazioniRes] = await Promise.all([
      supabase
        .from("campagna_contatti")
        .select("*")
        .eq("site_id", siteId)
        .is("deleted_at", null)
        .order("cognome", { ascending: true })
        .order("nome", { ascending: true }),
      supabase
        .from("campagna_interazioni")
        .select("contatto_id, data")
        .eq("site_id", siteId),
    ]);

    if (contattiRes.error) {
      log.error("Error fetching contatti:", contattiRes.error);
      return [];
    }

    const lastByContatto = new Map<string, string>();
    for (const row of interazioniRes.data ?? []) {
      const id = row.contatto_id as string;
      const data = row.data as string;
      const current = lastByContatto.get(id);
      if (!current || data > current) lastByContatto.set(id, data);
    }

    return (contattiRes.data as CampagnaContatto[]).map((c) => ({
      ...c,
      ultima_interazione: lastByContatto.get(c.id) ?? null,
    }));
  },
);

export const fetchContatto = cache(
  async (
    siteId: string,
    id: string,
  ): Promise<CampagnaContatto | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("campagna_contatti")
      .select("*")
      .eq("site_id", siteId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      log.error("Error fetching contatto:", error);
      return null;
    }
    return (data as CampagnaContatto) ?? null;
  },
);

export const fetchInterazioniByContatto = cache(
  async (
    siteId: string,
    contattoId: string,
  ): Promise<CampagnaInterazione[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("campagna_interazioni")
      .select("*")
      .eq("site_id", siteId)
      .eq("contatto_id", contattoId)
      .order("data", { ascending: false });

    if (error) {
      log.error("Error fetching interazioni by contatto:", error);
      return [];
    }
    return (data as CampagnaInterazione[]) ?? [];
  },
);

export interface InterazioneWithContatto extends CampagnaInterazione {
  contatto_nome: string | null;
}

export const fetchInterazioni = cache(
  async (siteId: string): Promise<InterazioneWithContatto[]> => {
    const supabase = await createClient();

    const [interazioniRes, contattiRes] = await Promise.all([
      supabase
        .from("campagna_interazioni")
        .select("*")
        .eq("site_id", siteId)
        .order("data", { ascending: false })
        .limit(500),
      supabase
        .from("campagna_contatti")
        .select("id, nome, cognome")
        .eq("site_id", siteId),
    ]);

    if (interazioniRes.error) {
      log.error("Error fetching interazioni:", interazioniRes.error);
      return [];
    }

    const nameById = new Map<string, string>();
    for (const c of contattiRes.data ?? []) {
      const full = [c.nome, c.cognome].filter(Boolean).join(" ").trim();
      nameById.set(c.id as string, full);
    }

    return (interazioniRes.data as CampagnaInterazione[]).map((i) => ({
      ...i,
      contatto_nome: nameById.get(i.contatto_id) ?? null,
    }));
  },
);

export const fetchContenuti = cache(
  async (siteId: string): Promise<CampagnaContenuto[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("campagna_contenuti")
      .select("*")
      .eq("site_id", siteId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      log.error("Error fetching contenuti:", error);
      return [];
    }
    return (data as CampagnaContenuto[]) ?? [];
  },
);

export const fetchContenuto = cache(
  async (siteId: string, id: string): Promise<CampagnaContenuto | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("campagna_contenuti")
      .select("*")
      .eq("site_id", siteId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      log.error("Error fetching contenuto:", error);
      return null;
    }
    return (data as CampagnaContenuto) ?? null;
  },
);

export const fetchEventi = cache(
  async (siteId: string): Promise<CampagnaEvento[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("campagna_eventi")
      .select("*")
      .eq("site_id", siteId)
      .is("deleted_at", null)
      .order("data_inizio", { ascending: true });

    if (error) {
      log.error("Error fetching eventi:", error);
      return [];
    }
    return (data as CampagnaEvento[]) ?? [];
  },
);
