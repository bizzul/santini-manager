import "server-only";
import { createClient } from "@/utils/supabase/server";
import { logger } from "@/lib/logger";
import {
  type AttivitaBoardRow,
  type AttivitaStato,
  type AmbitoStatoRow,
  type AmbitoStatoCell,
  type BoardColumn,
  type CaricoRow,
  type KanbanCountRow,
  type OverviewData,
  type OverviewFilters,
  type OverviewKpi,
  type WipLimitRow,
  STATI,
  STATO_LABEL,
} from "@/types/overview-connector";

const log = logger.scope("OverviewConnector");

const DEFAULT_SOGLIA = 14;

function matchesFilter(row: AttivitaBoardRow, filters: OverviewFilters): boolean {
  if (filters.ambito && row.ambito_nome !== filters.ambito) return false;
  if (filters.stato && row.stato !== filters.stato) return false;
  if (filters.azienda && !row.aziende.includes(filters.azienda)) return false;
  if (filters.persona && !row.persone.includes(filters.persona)) return false;
  return true;
}

function computeKpi(
  spazioRows: AttivitaBoardRow[],
  wipByStato: Map<AttivitaStato, WipLimitRow>,
): OverviewKpi {
  const attive = spazioRows.filter(
    (r) => r.stato === "todo" || r.stato === "doing",
  ).length;

  const stagnanti = spazioRows.filter((r) => {
    if (r.stato === "finish") return false;
    const soglia = wipByStato.get(r.stato)?.soglia_stagnazione_giorni ?? DEFAULT_SOGLIA;
    return r.giorni_fermo > soglia;
  }).length;

  const doingCount = spazioRows.filter((r) => r.stato === "doing").length;
  const doingLimite = wipByStato.get("doing")?.limite ?? 0;
  const saturazioneWipDoingPct =
    doingLimite > 0 ? Math.round((doingCount / doingLimite) * 100) : 0;

  const giorniFermoMax = spazioRows
    .filter((r) => r.stato !== "finish")
    .reduce((max, r) => Math.max(max, r.giorni_fermo), 0);

  return {
    attive,
    stagnanti,
    saturazioneWipDoingPct,
    giorniFermoMax,
    doingCount,
    doingLimite,
  };
}

function computeMatrix(spazioRows: AttivitaBoardRow[]): {
  matrix: AmbitoStatoRow[];
  matrixTotals: AmbitoStatoCell;
} {
  const byAmbito = new Map<string, AmbitoStatoRow>();

  for (const row of spazioRows) {
    let entry = byAmbito.get(row.ambito_nome);
    if (!entry) {
      entry = {
        ambito_nome: row.ambito_nome,
        ambito_colore: row.ambito_colore,
        todo: 0,
        doing: 0,
        finish: 0,
      };
      byAmbito.set(row.ambito_nome, entry);
    }
    entry[row.stato] += 1;
  }

  const matrix = Array.from(byAmbito.values()).sort((a, b) =>
    a.ambito_nome.localeCompare(b.ambito_nome),
  );

  const matrixTotals = matrix.reduce<AmbitoStatoCell>(
    (acc, r) => ({
      todo: acc.todo + r.todo,
      doing: acc.doing + r.doing,
      finish: acc.finish + r.finish,
    }),
    { todo: 0, doing: 0, finish: 0 },
  );

  return { matrix, matrixTotals };
}

function buildColumns(
  boardRows: AttivitaBoardRow[],
  wipByStato: Map<AttivitaStato, WipLimitRow>,
): BoardColumn[] {
  return STATI.map((stato) => {
    const cards = boardRows
      .filter((r) => r.stato === stato)
      .sort((a, b) => b.giorni_fermo - a.giorni_fermo);
    const limite = wipByStato.get(stato)?.limite ?? 0;
    const soglia = wipByStato.get(stato)?.soglia_stagnazione_giorni ?? DEFAULT_SOGLIA;
    const count = cards.length;
    return {
      stato,
      label: STATO_LABEL[stato],
      cards,
      count,
      limite,
      soglia,
      saturazionePct: limite > 0 ? Math.round((count / limite) * 100) : 0,
    };
  });
}

/**
 * Carica l'intero payload della Overview Connector per un sito.
 * I conteggi di board/KPI/matrice sono derivati dalle righe della view
 * (giorni_fermo gia' calcolato in SQL). I pannelli di carico e i contenitori
 * fisici usano le rispettive view, mai join ricostruiti qui.
 */
export async function getOverviewData(
  siteId: string,
  domain: string,
  filters: OverviewFilters,
): Promise<OverviewData> {
  const supabase = await createClient();

  const [boardRes, aziendeRes, personeRes, countsRes, wipRes] = await Promise.all([
    supabase
      .from("v_attivita_board")
      .select("*")
      .eq("site_id", siteId)
      .order("giorni_fermo", { ascending: false }),
    supabase.from("v_carico_aziende").select("*").eq("site_id", siteId),
    supabase.from("v_carico_persone").select("*").eq("site_id", siteId),
    supabase.from("v_kanban_counts").select("*").eq("site_id", siteId),
    supabase.from("wip_limits").select("*").eq("site_id", siteId),
  ]);

  if (boardRes.error) log.error("board fetch error", boardRes.error);
  if (aziendeRes.error) log.error("carico aziende error", aziendeRes.error);
  if (personeRes.error) log.error("carico persone error", personeRes.error);
  if (countsRes.error) log.error("kanban counts error", countsRes.error);
  if (wipRes.error) log.error("wip limits error", wipRes.error);

  const allRows = (boardRes.data ?? []) as AttivitaBoardRow[];
  const wipLimits = (wipRes.data ?? []) as WipLimitRow[];
  const wipByStato = new Map<AttivitaStato, WipLimitRow>(
    wipLimits.map((w) => [w.stato, w]),
  );

  // Il toggle spazio filtra l'intera schermata (KPI, matrice, board).
  const spazioRows =
    filters.spazio === "tutto"
      ? allRows
      : allRows.filter((r) => r.spazio === filters.spazio);

  // Le celle della matrice e le righe dei pannelli filtrano solo la board.
  const boardRows = spazioRows.filter((r) => matchesFilter(r, filters));

  const kpi = computeKpi(spazioRows, wipByStato);
  const { matrix, matrixTotals } = computeMatrix(spazioRows);
  const columns = buildColumns(boardRows, wipByStato);

  const caricoAziende = ((aziendeRes.data ?? []) as CaricoRow[])
    .filter((r) => r.attive > 0)
    .sort((a, b) => b.attive - a.attive || a.nome.localeCompare(b.nome));
  const caricoPersone = ((personeRes.data ?? []) as CaricoRow[])
    .filter((r) => r.attive > 0)
    .sort((a, b) => b.attive - a.attive || a.nome.localeCompare(b.nome));

  const kanbanCounts = ((countsRes.data ?? []) as KanbanCountRow[]).slice();

  return {
    siteId,
    domain,
    filters,
    columns,
    kpi,
    matrix,
    matrixTotals,
    caricoAziende,
    caricoPersone,
    kanbanCounts,
    wipLimits,
  };
}
