"use server";

import { revalidatePath } from "next/cache";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";
import { createClient } from "@/utils/supabase/server";
import { logger } from "@/lib/logger";
import type { AttivitaStato } from "@/types/overview-connector";

const log = logger.scope("OverviewConnector:action");

export interface MoveAttivitaResult {
  ok: boolean;
  error?: string;
}

/**
 * Sposta una attivita in un nuovo stato Kanban.
 *
 * Aggiorna SOLO `stato`: il trigger DB (trg_attivita_stato_change) pensa a
 * `data_stato` e allo storico transizioni. Il limite WIP NON e' hardcodato ne'
 * bloccante qui: il client mostra un dialog di conferma leggendo `wip_limits`,
 * ma il vincolo deve costare un attrito, non essere impossibile.
 */
export async function moveAttivita(
  attivitaId: string,
  nuovoStato: AttivitaStato,
  domain: string,
): Promise<MoveAttivitaResult> {
  const userContext = await getUserContext();
  if (!userContext) {
    return { ok: false, error: "Non autenticato" };
  }

  const validStates: AttivitaStato[] = ["todo", "doing", "finish"];
  if (!validStates.includes(nuovoStato)) {
    return { ok: false, error: "Stato non valido" };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("attivita")
      .update({ stato: nuovoStato })
      .eq("id", attivitaId);

    if (error) {
      log.error("moveAttivita update error", error);
      return { ok: false, error: error.message };
    }

    // La home dello spazio Matris e' la dashboard: rivalida la sua route.
    const siteResult = await getSiteData(domain);
    if (siteResult?.data) {
      revalidatePath(`/sites/${domain}`);
    }
    revalidatePath("/", "layout");

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    log.error("moveAttivita exception", err);
    return { ok: false, error: message };
  }
}
