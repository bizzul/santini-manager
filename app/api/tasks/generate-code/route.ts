import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  applyTemplate,
  generateTemplateVariables,
  getCodeTemplate,
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

    if (kanbanId) {
      // Ottieni info sulla kanban
      const { data: kanban, error: kanbanError } = await supabase
        .from("Kanban")
        .select("site_id, is_offer_kanban")
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
      taskType = isOfferKanban ? "OFFERTA" : "LAVORO";
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

    // Ottieni il template
    const template = await getCodeTemplate(siteId, taskType);

    // Per la preview, trova il massimo esistente nei task + il valore in code_sequences
    // e usa il maggiore dei due per garantire unicità
    const currentYear = new Date().getFullYear();
    const yearPrefix = String(currentYear).slice(-2);
    
    // Cerca il massimo esistente nei Task
    const { data: tasks } = await supabase
      .from("Task")
      .select("unique_code")
      .eq("site_id", siteId)
      .like("unique_code", `${yearPrefix}-%`)
      .order("unique_code", { ascending: false })
      .limit(500);

    let maxFromTasks = 0;
    if (tasks && tasks.length > 0) {
      for (const task of tasks) {
        const code = task.unique_code;
        if (!code) continue;
        
        const parts = code.split("-");
        let codeType: string;
        let numPart: string;
        
        if (parts.length === 2) {
          codeType = "LAVORO";
          numPart = parts[1];
        } else if (parts.length === 3) {
          const middle = parts[1].toUpperCase();
          if (middle === "OFF") codeType = "OFFERTA";
          else if (middle === "FATT") codeType = "FATTURA";
          else continue;
          numPart = parts[2];
        } else {
          continue;
        }
        
        if (codeType !== template.sequenceType) continue;
        
        const num = parseInt(numPart, 10);
        if (!isNaN(num) && num > maxFromTasks) {
          maxFromTasks = num;
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

    if (kanbanId) {
      const { data: kanban, error: kanbanError } = await supabase
        .from("Kanban")
        .select("site_id, is_offer_kanban")
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
      if (!overrideTaskType) {
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
