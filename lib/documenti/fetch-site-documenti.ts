import type { SupabaseClient } from "@supabase/supabase-js";

const RIGHE_SELECT_BASE = `
    descrizione, misure, unita, quantita, prezzo_unitario, sconto,
    is_trasporto, articolo_id, art, totale_riga`;

export const DOCUMENTI_LIST_SELECT = `
  id, tipo_documento, numero, oggetto, status, totale_chf, created_at,
  destinatario, corpo_testo, pdf_url, condizioni_pagamento, termine_fornitura,
  note, cliente_id, task_id, allegati,
  righe_documento (${RIGHE_SELECT_BASE}, immagine_url)
`;

const DOCUMENTI_LIST_SELECT_LEGACY = `
  id, tipo_documento, numero, oggetto, status, totale_chf, created_at,
  destinatario, corpo_testo, pdf_url, condizioni_pagamento, termine_fornitura,
  note, cliente_id, task_id, allegati,
  righe_documento (${RIGHE_SELECT_BASE})
`;

function isMissingImmagineUrlColumn(message: string): boolean {
  return message.includes("immagine_url");
}

export async function fetchSiteDocumenti(
  supabase: SupabaseClient,
  siteId: string,
  limit = 100,
) {
  const { data, error } = await supabase
    .from("documenti")
    .select(DOCUMENTI_LIST_SELECT)
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error && isMissingImmagineUrlColumn(error.message)) {
    const legacy = await supabase
      .from("documenti")
      .select(DOCUMENTI_LIST_SELECT_LEGACY)
      .eq("site_id", siteId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (legacy.error) {
      throw new Error(legacy.error.message);
    }
    return (legacy.data ?? []).map((doc) => ({
      ...doc,
      righe_documento: (doc.righe_documento ?? []).map((riga) => ({
        ...riga,
        immagine_url: null,
      })),
    }));
  }

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
