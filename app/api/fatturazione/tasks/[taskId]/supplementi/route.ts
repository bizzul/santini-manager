import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext } from "@/lib/site-context";
import { getUserContext } from "@/lib/auth-utils";
import {
  isFatturazioneKanban,
  isFatturazioneSchemaMissing,
} from "@/lib/fatturazione-readiness";
import {
  canWriteFatturazioneReadiness,
  ensureFatturazioneReadiness,
  isFatturazioneReadinessEnabledForSite,
} from "@/lib/fatturazione-readiness.server";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  catalogSupplementoId: z.string().uuid().optional(),
  descrizione: z.string().trim().min(1, "Descrizione obbligatoria").max(500).optional(),
  quantita: z.coerce.number().positive("Quantita deve essere maggiore di 0"),
  prezzo: z.coerce.number().finite().optional(),
}).refine(
  (value) => Boolean(value.catalogSupplementoId || value.descrizione),
  { message: "Seleziona una tipologia di supplemento" },
);

async function assertWritableFatturaTask(
  req: NextRequest,
  taskId: number,
) {
  const userContext = await getUserContext();
  if (!userContext) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!canWriteFatturazioneReadiness(userContext.role)) {
    return {
      error: NextResponse.json(
        { error: "Solo il direttore o un admin dello spazio puo modificare i supplementi" },
        { status: 403 },
      ),
    };
  }

  const { siteId } = await getSiteContext(req);
  if (!siteId) {
    return { error: NextResponse.json({ error: "Site ID required" }, { status: 400 }) };
  }
  if (!(await isFatturazioneReadinessEnabledForSite(siteId))) {
    return { error: NextResponse.json({ error: "Funzione disattivata" }, { status: 404 }) };
  }

  const supabase = await createClient();
  const taskSelectWithFlag =
    "id, site_id, kanban:kanbanId(id, identifier, is_invoicing_kanban), column:kanbanColumnId(identifier)";
  const taskSelectWithoutFlag =
    "id, site_id, kanban:kanbanId(id, identifier), column:kanbanColumnId(identifier)";

  let { data: task, error: taskError } = await supabase
    .from("Task")
    .select(taskSelectWithFlag)
    .eq("id", taskId)
    .eq("site_id", siteId)
    .maybeSingle();

  if (taskError && isFatturazioneSchemaMissing(taskError)) {
    const fallback = await supabase
      .from("Task")
      .select(taskSelectWithoutFlag)
      .eq("id", taskId)
      .eq("site_id", siteId)
      .maybeSingle();
    task = fallback.data as typeof task;
    taskError = fallback.error;
  }

  if (taskError) {
    return {
      error: NextResponse.json(
        { error: "Impossibile caricare la task" },
        { status: 500 },
      ),
    };
  }

  if (!task) {
    return { error: NextResponse.json({ error: "Task non trovata" }, { status: 404 }) };
  }

  const taskRow = task as {
    kanban?:
      | { identifier?: string | null; is_invoicing_kanban?: boolean | null }
      | { identifier?: string | null; is_invoicing_kanban?: boolean | null }[]
      | null;
    column?:
      | { identifier?: string | null }
      | { identifier?: string | null }[]
      | null;
  };
  const kanban = Array.isArray(taskRow.kanban) ? taskRow.kanban[0] : taskRow.kanban;
  const column = Array.isArray(taskRow.column) ? taskRow.column[0] : taskRow.column;
  if (!isFatturazioneKanban(kanban as any, column as any)) {
    return {
      error: NextResponse.json(
        { error: "I supplementi di fatturazione valgono solo sulla kanban Fatture OUT" },
        { status: 400 },
      ),
    };
  }

  return { supabase, siteId, userContext };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const taskId = Number.parseInt((await params).taskId, 10);
    if (!Number.isFinite(taskId)) {
      return NextResponse.json({ error: "Task non valida" }, { status: 400 });
    }

    const gate = await assertWritableFatturaTask(req, taskId);
    if ("error" in gate && gate.error) return gate.error;

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { supabase, siteId, userContext } = gate;
    await ensureFatturazioneReadiness({ supabase, siteId, taskId });

    let descrizione = parsed.data.descrizione?.trim() || "";
    let prezzo =
      parsed.data.prezzo != null && Number.isFinite(parsed.data.prezzo)
        ? parsed.data.prezzo
        : null;
    let catalogSupplementoId = parsed.data.catalogSupplementoId || null;

    if (catalogSupplementoId) {
      const { data: catalogRow, error: catalogError } = await supabase
        .from("supplementi")
        .select("id, nome, valore")
        .eq("id", catalogSupplementoId)
        .eq("site_id", siteId)
        .eq("attivo", true)
        .maybeSingle();
      if (catalogError) throw catalogError;
      if (!catalogRow) {
        return NextResponse.json(
          { error: "Tipologia di supplemento non trovata" },
          { status: 400 },
        );
      }
      if (!descrizione) descrizione = catalogRow.nome;
      if (prezzo == null) prezzo = Number(catalogRow.valore) || 0;
    }

    if (!descrizione) {
      return NextResponse.json(
        { error: "Seleziona una tipologia di supplemento" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("fatturazione_supplemento_riga")
      .insert({
        site_id: siteId,
        task_id: taskId,
        descrizione,
        quantita: parsed.data.quantita,
        prezzo: prezzo ?? 0,
        catalog_supplemento_id: catalogSupplementoId,
        created_by: userContext.user?.id || userContext.userId || null,
      })
      .select()
      .single();

    if (error && isFatturazioneSchemaMissing(error) && catalogSupplementoId) {
      const retry = await supabase
        .from("fatturazione_supplemento_riga")
        .insert({
          site_id: siteId,
          task_id: taskId,
          descrizione,
          quantita: parsed.data.quantita,
          prezzo: prezzo ?? 0,
          created_by: userContext.user?.id || userContext.userId || null,
        })
        .select()
        .single();
      if (retry.error) throw retry.error;
      await supabase
        .from("fatturazione_readiness")
        .update({
          uguale_offerta: false,
          stato: "in_attesa",
          confermato_at: null,
          confermato_by: null,
        })
        .eq("site_id", siteId)
        .eq("task_id", taskId);
      return NextResponse.json({ supplemento: retry.data }, { status: 201 });
    }

    if (error) throw error;

    await supabase
      .from("fatturazione_readiness")
      .update({
        uguale_offerta: false,
        stato: "in_attesa",
        confermato_at: null,
        confermato_by: null,
      })
      .eq("site_id", siteId)
      .eq("task_id", taskId);

    return NextResponse.json({ supplemento: data }, { status: 201 });
  } catch (error) {
    console.error("[fatturazione-supplementi] POST", error);
    return NextResponse.json(
      { error: "Impossibile creare il supplemento" },
      { status: 500 },
    );
  }
}
