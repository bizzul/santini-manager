/**
 * Code Generator per Task
 *
 * Genera codici univoci per task basati su template configurabili.
 * Supporta variabili come {{anno_corto}}, {{anno_lungo}}, {{stato}}, {{sequenza}}, etc.
 */

import { createClient } from "@/utils/supabase/server";
import { logger } from "@/lib/logger";

// Tipi per i template
export interface CodeTemplate {
  template: string;
  sequenceType: string;
  paddingDigits?: number; // Default 3 per {{sequenza}}, 4 per {{sequenza_4}}
}

// Variabili disponibili nei template
export interface TemplateVariables {
  anno_corto: string; // es: "25"
  anno_lungo: string; // es: "2025"
  stato: string; // es: "OFF", "LAV", "FATT", ""
  sequenza: string; // es: "001"
  sequenza_4: string; // es: "0001"
  mese: string; // es: "12"
  giorno: string; // es: "10"
}

// Mapping stato -> suffisso
export const STATE_SUFFIXES: Record<string, string> = {
  OFFERTA: "OFF",
  LAVORO: "",
  FATTURA: "FATT",
};

// Template di default
export const DEFAULT_TEMPLATES: Record<string, CodeTemplate> = {
  OFFERTA: {
    template: "{{anno_corto}}-{{stato}}-{{sequenza}}",
    sequenceType: "OFFERTA",
    paddingDigits: 3,
  },
  LAVORO: {
    template: "{{anno_corto}}-{{sequenza}}",
    sequenceType: "LAVORO",
    paddingDigits: 3,
  },
  FATTURA: {
    template: "{{anno_corto}}-{{stato}}-{{sequenza}}",
    sequenceType: "FATTURA",
    paddingDigits: 3,
  },
};

/**
 * Ottiene il template configurato per un site, o usa il default
 */
export async function getCodeTemplate(
  siteId: string,
  taskType: string,
): Promise<CodeTemplate> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("site_settings")
    .select("setting_value")
    .eq("site_id", siteId)
    .eq("setting_key", `code_template_${taskType.toLowerCase()}`)
    .single();

  if (error || !data) {
    // Usa template di default
    return DEFAULT_TEMPLATES[taskType] || DEFAULT_TEMPLATES.LAVORO;
  }

  return data.setting_value as CodeTemplate;
}

/**
 * Salva un template per un site
 */
export async function saveCodeTemplate(
  siteId: string,
  taskType: string,
  template: CodeTemplate,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("site_settings")
    .upsert({
      site_id: siteId,
      setting_key: `code_template_${taskType.toLowerCase()}`,
      setting_value: template,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "site_id,setting_key",
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Helper per determinare il tipo di un codice task e estrarre la sequenza
 * Supporta formati flessibili con suffissi in qualsiasi posizione
 */
function parseTaskCode(
  code: string,
  yearPrefix: string,
): { type: string; sequence: number } | null {
  if (!code) return null;

  const codeUpper = code.toUpperCase();

  // Determina il tipo basandosi sulla presenza di suffissi
  let codeType: string;
  if (codeUpper.includes("OFF")) {
    codeType = "OFFERTA";
  } else if (codeUpper.includes("FATT")) {
    codeType = "FATTURA";
  } else {
    codeType = "LAVORO";
  }

  // Estrai tutti i numeri dal codice
  const numbers = code.match(/\d+/g);
  if (!numbers || numbers.length === 0) return null;

  // Trova la sequenza: è il numero che NON è l'anno
  // L'anno può essere in formato corto (26) o lungo (2026)
  const yearShort = yearPrefix;
  const yearLong = `20${yearPrefix}`;

  let sequence = 0;
  for (const num of numbers) {
    // Salta se è l'anno
    if (num === yearShort || num === yearLong) continue;

    // Considera questo come potenziale sequenza
    const parsed = parseInt(num, 10);
    if (!isNaN(parsed) && parsed > sequence) {
      sequence = parsed;
    }
  }

  if (sequence === 0) return null;

  return { type: codeType, sequence };
}

/**
 * Trova il numero di sequenza massimo esistente nei Task per un dato sito/anno/tipo
 * Supporta qualsiasi formato di template configurato dal cliente
 */
async function findMaxExistingSequence(
  supabase: any,
  siteId: string,
  sequenceType: string,
  year: number,
): Promise<number> {
  const yearPrefix = String(year).slice(-2); // es: "26" per 2026
  const yearLong = String(year); // es: "2026"

  // Query tutti i task del sito che contengono l'anno (sia formato corto che lungo)
  // Usa OR per supportare entrambi i formati
  const { data: tasks, error } = await supabase
    .from("Task")
    .select("unique_code, task_type")
    .eq("site_id", siteId)
    .or(`unique_code.like.%${yearPrefix}%,unique_code.like.%${yearLong}%`)
    .order("unique_code", { ascending: false })
    .limit(1000);

  if (error || !tasks || tasks.length === 0) {
    return 0;
  }

  // Estrai il numero massimo dai codici esistenti, filtrando per tipo
  let maxNumber = 0;
  for (const task of tasks) {
    const code = task.unique_code;
    if (!code) continue;

    // Prima prova a usare task_type se disponibile
    let taskType = task.task_type?.toUpperCase();

    // Parsing del codice
    const parsed = parseTaskCode(code, yearPrefix);
    if (!parsed) continue;

    // Se task_type non è disponibile, usa il tipo determinato dal parsing
    if (!taskType) {
      taskType = parsed.type;
    }

    // Solo se il tipo corrisponde
    if (taskType !== sequenceType) {
      continue;
    }

    if (parsed.sequence > maxNumber) {
      maxNumber = parsed.sequence;
    }
  }

  return maxNumber;
}

/**
 * Ottiene il prossimo valore della sequenza (atomico)
 * Controlla anche i codici esistenti nella tabella Task per evitare duplicati
 */
export async function getNextSequenceValue(
  siteId: string,
  sequenceType: string,
  year?: number,
): Promise<number> {
  const supabase = await createClient();
  const currentYear = year || new Date().getFullYear();

  // Prova a usare la funzione SQL per garantire atomicità
  const { data, error } = await supabase.rpc("get_next_sequence_value", {
    p_site_id: siteId,
    p_sequence_type: sequenceType,
    p_year: currentYear,
  });

  if (error) {
    logger.warn(
      "RPC function not available, falling back to manual sequence:",
      error,
    );

    // Fallback: usa un approccio manuale se la funzione RPC non esiste
    // Prima controlla il numero massimo esistente nei Task per evitare duplicati
    const maxExisting = await findMaxExistingSequence(
      supabase,
      siteId,
      sequenceType,
      currentYear,
    );

    const { data: existingSeq, error: seqError } = await supabase
      .from("code_sequences")
      .select("current_value")
      .eq("site_id", siteId)
      .eq("sequence_type", sequenceType)
      .eq("year", currentYear)
      .single();

    if (seqError && seqError.code !== "PGRST116") {
      // PGRST116 = no rows found, that's ok
      // Usa il massimo esistente + 1
      logger.warn("code_sequences table not available, using max existing + 1");
      const nextValue = maxExisting + 1;

      // Prova comunque ad aggiornare la sequenza per il futuro
      await supabase
        .from("code_sequences")
        .upsert({
          site_id: siteId,
          sequence_type: sequenceType,
          year: currentYear,
          current_value: nextValue,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "site_id,sequence_type,year",
        });

      return nextValue;
    }

    // Usa il massimo tra la sequenza salvata e quella esistente nei task
    const sequenceValue = existingSeq?.current_value || 0;
    const nextValue = Math.max(sequenceValue, maxExisting) + 1;

    // Aggiorna o inserisci il valore con retry in caso di conflitto
    let retries = 3;
    let lastError = null;
    while (retries > 0) {
      const { error: upsertError } = await supabase
        .from("code_sequences")
        .upsert({
          site_id: siteId,
          sequence_type: sequenceType,
          year: currentYear,
          current_value: nextValue,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "site_id,sequence_type,year",
        });

      if (!upsertError) {
        break;
      }

      lastError = upsertError;
      retries--;

      // Se c'è un conflitto, rileggi il valore corrente e ricalcola
      if (retries > 0) {
        const { data: updatedSeq } = await supabase
          .from("code_sequences")
          .select("current_value")
          .eq("site_id", siteId)
          .eq("sequence_type", sequenceType)
          .eq("year", currentYear)
          .single();

        const updatedMaxExisting = await findMaxExistingSequence(
          supabase,
          siteId,
          sequenceType,
          currentYear,
        );
        const updatedSequenceValue = updatedSeq?.current_value || 0;
        const updatedNextValue =
          Math.max(updatedSequenceValue, updatedMaxExisting) + 1;

        // Usa il valore aggiornato per il prossimo tentativo
        return updatedNextValue;
      }
    }

    if (lastError) {
      logger.warn("Failed to update sequence after retries:", lastError);
    }

    return nextValue;
  }

  // RPC ha funzionato, ma verifica che sia maggiore del massimo esistente
  // per evitare duplicati in caso di task creati manualmente o importati
  const maxExisting = await findMaxExistingSequence(
    supabase,
    siteId,
    sequenceType,
    currentYear,
  );
  const rpcValue = data as number;

  if (rpcValue <= maxExisting) {
    // La sequenza RPC è indietro rispetto ai task esistenti
    // Aggiorna la sequenza al valore corretto
    logger.warn(
      `RPC sequence (${rpcValue}) is behind existing tasks (${maxExisting}), syncing...`,
    );

    const correctValue = maxExisting + 1;

    // Aggiorna la tabella code_sequences per sincronizzare
    await supabase
      .from("code_sequences")
      .upsert({
        site_id: siteId,
        sequence_type: sequenceType,
        year: currentYear,
        current_value: correctValue,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "site_id,sequence_type,year",
      });

    return correctValue;
  }

  return rpcValue;
}

/**
 * Genera le variabili del template per la data corrente
 */
export function generateTemplateVariables(
  taskType: string,
  sequenceValue: number,
  paddingDigits: number = 3,
  date?: Date,
): TemplateVariables {
  const now = date || new Date();
  const year = now.getFullYear();

  return {
    anno_corto: String(year).slice(-2),
    anno_lungo: String(year),
    stato: STATE_SUFFIXES[taskType] || "",
    sequenza: String(sequenceValue).padStart(paddingDigits, "0"),
    sequenza_4: String(sequenceValue).padStart(4, "0"),
    mese: String(now.getMonth() + 1).padStart(2, "0"),
    giorno: String(now.getDate()).padStart(2, "0"),
  };
}

/**
 * Applica le variabili al template
 */
export function applyTemplate(
  template: string,
  variables: TemplateVariables,
): string {
  let result = template;

  // Sostituisci tutte le variabili
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    result = result.replace(regex, value);
  }

  // Rimuovi separatori doppi (es: "25--001" diventa "25-001")
  result = result.replace(/--+/g, "-");

  // Rimuovi separatori all'inizio o alla fine
  result = result.replace(/^-+|-+$/g, "");

  return result;
}

/**
 * Genera un codice univoco per un nuovo task
 */
export async function generateTaskCode(
  siteId: string,
  taskType: string,
): Promise<string> {
  // Ottieni il template
  const template = await getCodeTemplate(siteId, taskType);

  // Ottieni il prossimo valore della sequenza
  const sequenceValue = await getNextSequenceValue(
    siteId,
    template.sequenceType,
  );

  // Genera le variabili
  const variables = generateTemplateVariables(
    taskType,
    sequenceValue,
    template.paddingDigits,
  );

  // Applica il template
  return applyTemplate(template.template, variables);
}

/**
 * Ottiene le impostazioni di auto-archiviazione per un site
 */
export async function getAutoArchiveSettings(
  siteId: string,
): Promise<{ enabled: boolean; days: number }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("site_settings")
    .select("setting_value")
    .eq("site_id", siteId)
    .eq("setting_key", "auto_archive")
    .single();

  if (error || !data) {
    // Default: abilitato, 7 giorni
    return { enabled: true, days: 7 };
  }

  return data.setting_value as { enabled: boolean; days: number };
}

/**
 * Salva le impostazioni di auto-archiviazione per un site
 */
export async function saveAutoArchiveSettings(
  siteId: string,
  settings: { enabled: boolean; days: number },
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("site_settings")
    .upsert({
      site_id: siteId,
      setting_key: "auto_archive",
      setting_value: settings,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "site_id,setting_key",
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Calcola la data di auto-archiviazione
 */
export function calculateAutoArchiveDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Lista delle variabili disponibili per l'UI
 */
export const AVAILABLE_VARIABLES = [
  { key: "anno_corto", description: "Ultime 2 cifre dell'anno", example: "25" },
  { key: "anno_lungo", description: "Anno completo", example: "2025" },
  {
    key: "stato",
    description: "Suffisso stato (OFF/LAV/FATT)",
    example: "OFF",
  },
  {
    key: "sequenza",
    description: "Numero incrementale (3 cifre)",
    example: "001",
  },
  {
    key: "sequenza_4",
    description: "Numero incrementale (4 cifre)",
    example: "0001",
  },
  { key: "mese", description: "Mese corrente", example: "12" },
  { key: "giorno", description: "Giorno corrente", example: "10" },
];

// =====================================================
// Internal Category Code Generation
// =====================================================

/**
 * Trova il numero di sequenza massimo esistente nei Task per una categoria interna
 */
async function findMaxInternalSequence(
  supabase: any,
  siteId: string,
  categoryId: number,
  baseCode: number,
): Promise<number> {
  // Query all tasks from kanbans in this category with internal codes
  const { data: tasks, error } = await supabase
    .from("Task")
    .select("unique_code, kanban_id")
    .eq("site_id", siteId)
    .like("unique_code", `${baseCode}-%`)
    .order("unique_code", { ascending: false })
    .limit(500);

  if (error || !tasks || tasks.length === 0) {
    return 0;
  }

  // Extract the maximum sequence number from existing codes
  let maxNumber = 0;
  for (const task of tasks) {
    const code = task.unique_code;
    if (!code) continue;

    // Format: "1000-1", "1000-2", etc.
    const parts = code.split("-");
    if (parts.length !== 2) continue;

    const basePart = parseInt(parts[0], 10);
    if (basePart !== baseCode) continue;

    const seqPart = parseInt(parts[1], 10);
    if (!isNaN(seqPart) && seqPart > maxNumber) {
      maxNumber = seqPart;
    }
  }

  return maxNumber;
}

/**
 * Ottiene il prossimo valore della sequenza per una categoria interna
 */
export async function getNextInternalSequenceValue(
  siteId: string,
  categoryId: number,
  baseCode: number,
): Promise<number> {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  // Check the maximum existing sequence in Task table
  const maxExisting = await findMaxInternalSequence(
    supabase,
    siteId,
    categoryId,
    baseCode,
  );

  // Try to get the sequence from code_sequences (with category_id)
  const { data: existingSeq, error: seqError } = await supabase
    .from("code_sequences")
    .select("current_value")
    .eq("site_id", siteId)
    .eq("sequence_type", "INTERNO")
    .eq("year", currentYear)
    .eq("category_id", categoryId)
    .single();

  if (seqError && seqError.code !== "PGRST116") {
    // PGRST116 = no rows found, that's ok
    logger.warn("Error fetching internal sequence:", seqError);
  }

  // Use the maximum between saved sequence and existing tasks
  const sequenceValue = existingSeq?.current_value || 0;
  const nextValue = Math.max(sequenceValue, maxExisting) + 1;

  // Update or insert the sequence value
  const { error: upsertError } = await supabase
    .from("code_sequences")
    .upsert({
      site_id: siteId,
      sequence_type: "INTERNO",
      year: currentYear,
      category_id: categoryId,
      current_value: nextValue,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "site_id,sequence_type,year,category_id",
    });

  if (upsertError) {
    logger.warn("Failed to update internal sequence:", upsertError);
  }

  return nextValue;
}

/**
 * Genera un codice univoco per un task in una categoria interna
 * Formato: {base_code}-{sequenza} (es. 1000-1, 1000-2)
 */
export async function generateInternalTaskCode(
  siteId: string,
  categoryId: number,
  baseCode: number,
): Promise<string> {
  const sequenceValue = await getNextInternalSequenceValue(
    siteId,
    categoryId,
    baseCode,
  );
  return `${baseCode}-${sequenceValue}`;
}

/**
 * Verifica se una kanban appartiene a una categoria interna
 * e restituisce le informazioni necessarie per la generazione del codice
 */
export async function getInternalCategoryInfo(
  kanbanId: string,
): Promise<
  { isInternal: boolean; categoryId?: number; baseCode?: number } | null
> {
  const supabase = await createClient();

  // Get the kanban with its category
  const { data: kanban, error: kanbanError } = await supabase
    .from("Kanban")
    .select(`
      id,
      category_id,
      category:KanbanCategory!category_id(
        id,
        is_internal,
        internal_base_code
      )
    `)
    .eq("id", kanbanId)
    .single();

  if (kanbanError || !kanban) {
    logger.warn("Error fetching kanban for internal check:", kanbanError);
    return null;
  }

  // Normalize category (Supabase may return array for joins)
  const rawCategory = kanban.category as any;
  const category = Array.isArray(rawCategory) ? rawCategory[0] : rawCategory;
  
  // Check if the category is internal
  if (!category || !category.is_internal) {
    return { isInternal: false };
  }

  return {
    isInternal: true,
    categoryId: category.id,
    baseCode: category.internal_base_code,
  };
}

/**
 * Preview di un codice interno (senza consumare la sequenza)
 */
export async function previewInternalCode(
  siteId: string,
  categoryId: number,
  baseCode: number,
): Promise<string> {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  // Check the maximum existing sequence
  const maxExisting = await findMaxInternalSequence(
    supabase,
    siteId,
    categoryId,
    baseCode,
  );

  // Get current sequence value
  const { data: existingSeq } = await supabase
    .from("code_sequences")
    .select("current_value")
    .eq("site_id", siteId)
    .eq("sequence_type", "INTERNO")
    .eq("year", currentYear)
    .eq("category_id", categoryId)
    .single();

  const sequenceValue = existingSeq?.current_value || 0;
  const nextValue = Math.max(sequenceValue, maxExisting) + 1;

  return `${baseCode}-${nextValue}`;
}
