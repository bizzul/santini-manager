import type { SupabaseClient } from "@supabase/supabase-js";

const RIGHE_SELECT_BASE = `
    descrizione, misure, unita, quantita, prezzo_unitario, sconto,
    is_trasporto, articolo_id, art, totale_riga`;

const OPTIONAL_RIGA_COLUMNS = ["immagine_url", "descrizione_estesa"] as const;

const DOC_SELECT_HEAD = `
  id, tipo_documento, numero, oggetto, status, totale_chf, created_at,
  destinatario, corpo_testo, pdf_url, condizioni_pagamento, termine_fornitura,
  note, cliente_id, task_id, allegati,`;

function buildSelect(optionalColumns: readonly string[]): string {
  const righeColumns = [RIGHE_SELECT_BASE, ...optionalColumns].join(", ");
  return `${DOC_SELECT_HEAD}
  righe_documento (${righeColumns})
`;
}

export const DOCUMENTI_LIST_SELECT = buildSelect(OPTIONAL_RIGA_COLUMNS);

function missingOptionalColumn(message: string): string | null {
  return OPTIONAL_RIGA_COLUMNS.find((col) => message.includes(col)) ?? null;
}

export async function fetchSiteDocumenti(
  supabase: SupabaseClient,
  siteId: string,
  limit = 100,
) {
  let activeColumns: string[] = [...OPTIONAL_RIGA_COLUMNS];

  for (let i = 0; i <= OPTIONAL_RIGA_COLUMNS.length; i += 1) {
    const { data, error } = await supabase
      .from("documenti")
      .select(buildSelect(activeColumns))
      .eq("site_id", siteId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error) {
      const rows = (data ?? []) as unknown as Record<string, unknown>[];
      return rows.map((doc) => ({
        ...doc,
        righe_documento: ((doc.righe_documento ?? []) as Record<
          string,
          unknown
        >[]).map((riga) => {
          const normalized = { ...riga };
          for (const col of OPTIONAL_RIGA_COLUMNS) {
            if (!(col in normalized)) normalized[col] = null;
          }
          return normalized;
        }),
      }));
    }

    const missing = missingOptionalColumn(error.message);
    if (!missing) {
      throw new Error(error.message);
    }
    activeColumns = activeColumns.filter((col) => col !== missing);
  }

  return [];
}
