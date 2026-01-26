import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  applyTemplate,
  generateTemplateVariables,
  getCodeTemplate,
  previewInternalCode,
} from "@/lib/code-generator";

/**
 * API per generare un codice task (senza consumare la sequenza)
 * Utile per la preview nel form prima del salvataggio
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kanbanId = searchParams.get("kanbanId");
    const domain = searchParams.get("domain");

    if (!kanbanId && !domain) {
      return NextResponse.json(
        { error: "kanbanId or domain is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Ottieni il siteId dal domain o dalla kanban
    let siteId: string | null = null;
    let isOfferKanban = false;
    let taskType = "LAVORO";
    let isInternalCategory = false;
    let internalCategoryId: number | null = null;
    let internalBaseCode: number | null = null;

    if (kanbanId) {
      // Ottieni info sulla kanban con la categoria
      const { data: kanban, error: kanbanError } = await supabase
        .from("Kanban")
        .select(`
          site_id, 
          is_offer_kanban,
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
        return NextResponse.json(
          { error: "Kanban not found" },
          { status: 404 },
        );
      }

      siteId = kanban.site_id;
      isOfferKanban = kanban.is_offer_kanban || false;

      // Normalize category (Supabase may return array for joins)
      const rawCategory = kanban.category as any;
      const category = Array.isArray(rawCategory) ? rawCategory[0] : rawCategory;
      
      // Check if kanban belongs to an internal category
      if (category && category.is_internal && category.internal_base_code) {
        isInternalCategory = true;
        internalCategoryId = category.id;
        internalBaseCode = category.internal_base_code;
        taskType = "INTERNO";
      } else {
        taskType = isOfferKanban ? "OFFERTA" : "LAVORO";
      }
    } else if (domain) {
      // Ottieni siteId dal domain
      const { data: site, error: siteError } = await supabase
        .from("Site")
        .select("id")
        .eq("domain", domain)
        .single();

      if (siteError || !site) {
        return NextResponse.json({ error: "Site not found" }, { status: 404 });
      }

      siteId = site.id;
    }

    if (!siteId) {
      return NextResponse.json(
        { error: "Could not determine site" },
        { status: 400 },
      );
    }

    // Handle internal category codes
    if (isInternalCategory && internalCategoryId && internalBaseCode) {
      const code = await previewInternalCode(
        siteId,
        internalCategoryId,
        internalBaseCode,
      );
      return NextResponse.json({
        code,
        taskType: "INTERNO",
        isOfferKanban: false,
        isInternalCategory: true,
        isPreview: true,
      });
    }

    // Standard code generation (OFFERTA, LAVORO, FATTURA)
    // Ottieni il template
    const template = await getCodeTemplate(siteId, taskType);

    // Per la preview, trova il massimo esistente nei task + il valore in code_sequences
    // e usa il maggiore dei due per garantire unicità
    const currentYear = new Date().getFullYear();
    const yearPrefix = String(currentYear).slice(-2);
    const yearLong = String(currentYear);

    // Helper per parsing flessibile dei codici
    const parseTaskCode = (code: string): { type: string; sequence: number } | null => {
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
      let sequence = 0;
      for (const num of numbers) {
        if (num === yearPrefix || num === yearLong) continue;
        const parsed = parseInt(num, 10);
        if (!isNaN(parsed) && parsed > sequence) {
          sequence = parsed;
        }
      }
      
      if (sequence === 0) return null;
      return { type: codeType, sequence };
    };

    // Cerca il massimo esistente nei Task (supporta qualsiasi formato)
    const { data: tasks } = await supabase
      .from("Task")
      .select("unique_code, task_type")
      .eq("site_id", siteId)
      .or(`unique_code.like.%${yearPrefix}%,unique_code.like.%${yearLong}%`)
      .order("unique_code", { ascending: false })
      .limit(1000);

    let maxFromTasks = 0;
    if (tasks && tasks.length > 0) {
      for (const task of tasks) {
        const code = task.unique_code;
        if (!code) continue;

        // Usa task_type se disponibile, altrimenti parsing
        let taskType = task.task_type?.toUpperCase();
        const parsed = parseTaskCode(code);
        if (!parsed) continue;
        
        if (!taskType) {
          taskType = parsed.type;
        }

        if (taskType !== template.sequenceType) continue;

        if (parsed.sequence > maxFromTasks) {
          maxFromTasks = parsed.sequence;
        }
      }
    }

    // Leggi anche da code_sequences
    const { data: lastSequence } = await supabase
      .from("code_sequences")
      .select("current_value")
      .eq("site_id", siteId)
      .eq("sequence_type", template.sequenceType)
      .eq("year", currentYear)
      .single();

    const sequenceValue = lastSequence?.current_value || 0;
    const nextValue = Math.max(sequenceValue, maxFromTasks) + 1;

    // Genera le variabili
    const variables = generateTemplateVariables(
      taskType,
      nextValue,
      template.paddingDigits,
    );

    // Applica il template
    const code = applyTemplate(template.template, variables);

    return NextResponse.json({
      code,
      taskType,
      isOfferKanban,
      isInternalCategory: false,
      isPreview: true,
    });
  } catch (error) {
    console.error("Error generating code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST: Genera e consuma effettivamente la sequenza
 * Da usare al momento del salvataggio
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { kanbanId, domain, taskType: overrideTaskType } = body;

    if (!kanbanId && !domain) {
      return NextResponse.json(
        { error: "kanbanId or domain is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    let siteId: string | null = null;
    let isOfferKanban = false;
    let taskType = overrideTaskType || "LAVORO";
    let isInternalCategory = false;
    let internalCategoryId: number | null = null;
    let internalBaseCode: number | null = null;

    if (kanbanId) {
      // Get kanban info with category
      const { data: kanban, error: kanbanError } = await supabase
        .from("Kanban")
        .select(`
          site_id, 
          is_offer_kanban,
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
        return NextResponse.json(
          { error: "Kanban not found" },
          { status: 404 },
        );
      }

      siteId = kanban.site_id;
      isOfferKanban = kanban.is_offer_kanban || false;

      // Normalize category (Supabase may return array for joins)
      const rawCategory2 = kanban.category as any;
      const category2 = Array.isArray(rawCategory2) ? rawCategory2[0] : rawCategory2;
      
      // Check if kanban belongs to an internal category
      if (category2 && category2.is_internal && category2.internal_base_code) {
        isInternalCategory = true;
        internalCategoryId = category2.id;
        internalBaseCode = category2.internal_base_code;
        taskType = "INTERNO";
      } else if (!overrideTaskType) {
        taskType = isOfferKanban ? "OFFERTA" : "LAVORO";
      }
    } else if (domain) {
      const { data: site, error: siteError } = await supabase
        .from("Site")
        .select("id")
        .eq("domain", domain)
        .single();

      if (siteError || !site) {
        return NextResponse.json({ error: "Site not found" }, { status: 404 });
      }

      siteId = site.id;
    }

    if (!siteId) {
      return NextResponse.json(
        { error: "Could not determine site" },
        { status: 400 },
      );
    }

    // Handle internal category codes
    if (isInternalCategory && internalCategoryId && internalBaseCode) {
      // Import the function dynamically to avoid circular dependency
      const { generateInternalTaskCode } = await import("@/lib/code-generator");
      const code = await generateInternalTaskCode(
        siteId,
        internalCategoryId,
        internalBaseCode,
      );

      return NextResponse.json({
        code,
        taskType: "INTERNO",
        isOfferKanban: false,
        isInternalCategory: true,
      });
    }

    // Standard code generation (OFFERTA, LAVORO, FATTURA)
    // Ottieni il template
    const template = await getCodeTemplate(siteId, taskType);

    // Usa la funzione RPC per ottenere il prossimo valore atomicamente
    const { data: sequenceValue, error: seqError } = await supabase.rpc(
      "get_next_sequence_value",
      {
        p_site_id: siteId,
        p_sequence_type: template.sequenceType,
        p_year: new Date().getFullYear(),
      },
    );

    if (seqError) {
      console.error("Error getting sequence:", seqError);
      return NextResponse.json(
        { error: "Failed to generate sequence" },
        { status: 500 },
      );
    }

    // Genera le variabili
    const variables = generateTemplateVariables(
      taskType,
      sequenceValue,
      template.paddingDigits,
    );

    // Applica il template
    const code = applyTemplate(template.template, variables);

    return NextResponse.json({
      code,
      taskType,
      isOfferKanban,
      isInternalCategory: false,
      sequenceValue,
    });
  } catch (error) {
    console.error("Error generating code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
