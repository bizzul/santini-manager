import type { SupabaseClient } from "@supabase/supabase-js";
import {
  findMaxExistingSequenceForSite,
  generateTaskCode,
  setSequenceCurrentValue,
} from "@/lib/code-generator";
import { createProjectFolders } from "@/lib/project-folders";
import type { DocumentoArricchito } from "@/validation/documenti/extracted-document";

export class OfferKanbanNotConfiguredError extends Error {
  constructor() {
    super(
      "Nessuna kanban offerte configurata per questo sito. Configura una kanban con il flag «Kanban Offerte» attivo.",
    );
    this.name = "OfferKanbanNotConfiguredError";
  }
}

export interface CreatedOfferTaskResult {
  taskId: number;
  uniqueCode: string;
}

export function shouldCreateOfferTaskForDocument(
  documento: DocumentoArricchito,
  taskId?: number | null,
): boolean {
  return (
    documento.tipoDocumento === "OFFERTA" &&
    !taskId &&
    documento.destinatario.clienteId != null
  );
}

/** Nome breve per la card kanban, derivato dall'oggetto del documento. */
export function offerNameFromDocument(documento: DocumentoArricchito): string {
  const oggetto = documento.oggetto.trim();
  const prefixMatch = oggetto.match(
    /^Offerta\s+N[°º.:\s]*[\w-]+\s*[-–—]\s*(.+)$/i,
  );
  if (prefixMatch?.[1]) {
    return prefixMatch[1].trim();
  }
  return oggetto || "Nuova offerta";
}

function buildOfferOtherNotes(documento: DocumentoArricchito): string {
  const parts: string[] = [];
  if (documento.condizioniPagamento?.length) {
    parts.push(
      `Condizioni pagamento: ${documento.condizioniPagamento.join("; ")}`,
    );
  }
  if (documento.termineFornitura?.trim()) {
    parts.push(`Termine fornitura: ${documento.termineFornitura.trim()}`);
  }
  if (documento.note?.trim()) {
    parts.push(documento.note.trim());
  }
  return parts.join("\n");
}

function sumOfferPieces(documento: DocumentoArricchito): number | null {
  if (!documento.righe?.length) return null;
  const total = documento.righe.reduce(
    (sum, riga) => sum + (Number.isFinite(riga.quantita) ? riga.quantita : 0),
    0,
  );
  return total > 0 ? Math.round(total) : null;
}

async function resolveOfferKanban(
  supabase: SupabaseClient,
  siteId: string,
): Promise<{ id: number }> {
  const { data: kanban, error } = await supabase
    .from("Kanban")
    .select("id")
    .eq("site_id", siteId)
    .eq("is_offer_kanban", true)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !kanban) {
    throw new OfferKanbanNotConfiguredError();
  }

  return kanban;
}

async function resolveFirstKanbanColumn(
  supabase: SupabaseClient,
  kanbanId: number,
): Promise<{ id: number }> {
  const { data: column, error } = await supabase
    .from("KanbanColumn")
    .select("id")
    .eq("kanbanId", kanbanId)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !column) {
    throw new Error(
      "Kanban offerte senza colonne: impossibile creare la nuova offerta.",
    );
  }

  return column;
}

/**
 * Crea un task OFFERTA in kanban quando il documento non è collegato a un'offerta esistente.
 */
export async function createOfferTaskFromDocument(
  supabase: SupabaseClient,
  siteId: string,
  documento: DocumentoArricchito,
): Promise<CreatedOfferTaskResult> {
  const kanban = await resolveOfferKanban(supabase, siteId);
  const column = await resolveFirstKanbanColumn(supabase, kanban.id);
  const clientId = documento.destinatario.clienteId!;
  const sellPrice =
    documento.totali?.totaleCHF ?? documento.totali?.totNetto ?? 0;

  const maxRetries = 6;
  let retryCount = 0;
  let createdTask: { id: number; unique_code: string } | null = null;
  let lastError: Error | null = null;

  while (retryCount < maxRetries && !createdTask) {
    const uniqueCode = await generateTaskCode(siteId, "OFFERTA");

    const insertData: Record<string, unknown> = {
      title: "",
      name: offerNameFromDocument(documento),
      clientId,
      deliveryDate: null,
      termine_produzione: null,
      unique_code: uniqueCode,
      sellProductId: null,
      kanbanId: kanban.id,
      kanbanColumnId: column.id,
      sellPrice,
      numero_pezzi: sumOfferPieces(documento),
      other: buildOfferOtherNotes(documento) || null,
      positions: Array(8).fill(""),
      is_draft: false,
      task_type: "OFFERTA",
      site_id: siteId,
    };

    const { data, error } = await supabase
      .from("Task")
      .insert(insertData)
      .select("id, unique_code")
      .single();

    if (
      error &&
      (error.code === "42703" ||
        error.message?.includes("offer_send_date") ||
        error.message?.includes("offer_products"))
    ) {
      const { data: retryData, error: retryError } = await supabase
        .from("Task")
        .insert(insertData)
        .select("id, unique_code")
        .single();

      if (retryError) {
        lastError = new Error(retryError.message);
        break;
      }
      createdTask = retryData;
      break;
    }

    if (
      error?.code === "23505" &&
      error.message?.toLowerCase().includes("task_site_unique_code_key")
    ) {
      try {
        const realMax = await findMaxExistingSequenceForSite(
          supabase,
          siteId,
          "OFFERTA",
          new Date().getFullYear(),
        );
        if (realMax > 0) {
          await setSequenceCurrentValue(
            supabase,
            siteId,
            "OFFERTA",
            new Date().getFullYear(),
            realMax,
          );
        }
      } catch (resyncError) {
        console.error(
          "[Documenti] Resync sequenza offerta fallito:",
          resyncError,
        );
      }

      retryCount++;
      if (retryCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 150 * retryCount));
        continue;
      }
      lastError = new Error(error.message);
      break;
    }

    if (error) {
      lastError = new Error(error.message);
      break;
    }

    createdTask = data;
  }

  if (!createdTask) {
    throw lastError ?? new Error("Creazione offerta in kanban fallita");
  }

  try {
    await createProjectFolders(
      createdTask.id,
      createdTask.unique_code,
      siteId,
    );
  } catch (folderError) {
    console.warn(
      "[Documenti] Cartelle progetto non create per offerta:",
      folderError,
    );
  }

  return {
    taskId: createdTask.id,
    uniqueCode: createdTask.unique_code,
  };
}
