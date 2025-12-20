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
 * Trova il numero di sequenza massimo esistente nei Task per un dato sito/anno/tipo
 */
async function findMaxExistingSequence(
  supabase: any,
  siteId: string,
  sequenceType: string,
  year: number,
): Promise<number> {
  const yearPrefix = String(year).slice(-2); // es: "25" per 2025
  
  // Query tutti i task del sito con codici che iniziano con l'anno
  const { data: tasks, error } = await supabase
    .from("Task")
    .select("unique_code")
    .eq("site_id", siteId)
    .like("unique_code", `${yearPrefix}-%`)
    .order("unique_code", { ascending: false })
    .limit(500);

  if (error || !tasks || tasks.length === 0) {
    return 0;
  }

  // Estrai il numero massimo dai codici esistenti, filtrando per tipo
  let maxNumber = 0;
  for (const task of tasks) {
    const code = task.unique_code;
    if (!code) continue;

    const parts = code.split("-");
    
    // Determina il tipo del codice
    // "25-001" = LAVORO (2 parti, seconda è numero)
    // "25-OFF-001" = OFFERTA (3 parti, seconda è "OFF")
    // "25-FATT-001" = FATTURA (3 parti, seconda è "FATT")
    
    let codeType: string;
    let numPart: string;
    
    if (parts.length === 2) {
      // Formato: "25-001" - potrebbe essere LAVORO
      codeType = "LAVORO";
      numPart = parts[1];
    } else if (parts.length === 3) {
      // Formato: "25-XXX-001"
      const middle = parts[1].toUpperCase();
      if (middle === "OFF") {
        codeType = "OFFERTA";
      } else if (middle === "FATT") {
        codeType = "FATTURA";
      } else {
        // Formato sconosciuto, skip
        continue;
      }
      numPart = parts[2];
    } else {
      // Formato non riconosciuto
      continue;
    }
    
    // Solo se il tipo corrisponde
    if (codeType !== sequenceType) {
      continue;
    }
    
    const num = parseInt(numPart, 10);
    if (!isNaN(num) && num > maxNumber) {
      maxNumber = num;
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

  // Prima controlla il numero massimo esistente nei Task
  const maxExisting = await findMaxExistingSequence(supabase, siteId, sequenceType, currentYear);

  // Prova a usare la funzione SQL per garantire atomicità
  const { data, error } = await supabase.rpc("get_next_sequence_value", {
    p_site_id: siteId,
    p_sequence_type: sequenceType,
    p_year: currentYear,
  });

  if (error) {
    logger.warn("RPC function not available, falling back to manual sequence:", error);
    
    // Fallback: usa un approccio manuale se la funzione RPC non esiste
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
      return maxExisting + 1;
    }

    // Usa il massimo tra la sequenza salvata e quella esistente nei task
    const sequenceValue = existingSeq?.current_value || 0;
    const nextValue = Math.max(sequenceValue, maxExisting) + 1;

    // Aggiorna o inserisci il valore
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

    if (upsertError) {
      logger.warn("Failed to update sequence:", upsertError);
    }

    return nextValue;
  }

  // RPC ha funzionato, ma verifica che sia maggiore del massimo esistente
  const rpcValue = data as number;
  if (rpcValue <= maxExisting) {
    // La sequenza RPC è indietro rispetto ai task esistenti
    // Aggiorna la sequenza al valore corretto
    logger.warn(`RPC sequence (${rpcValue}) is behind existing tasks (${maxExisting}), syncing...`);
    
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
