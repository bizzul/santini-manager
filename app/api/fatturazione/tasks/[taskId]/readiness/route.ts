import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext } from "@/lib/site-context";
import { getUserContext } from "@/lib/auth-utils";
import {
  canConfirmFatturazioneReadiness,
  isFatturazioneKanban,
  isFatturazioneSchemaMissing,
} from "@/lib/fatturazione-readiness";
import {
  canWriteFatturazioneReadiness,
  ensureFatturazioneReadiness,
  isFatturazioneReadinessEnabledForSite,
} from "@/lib/fatturazione-readiness.server";

export const dynamic = "force-dynamic";

const confirmSchema = z.object({
  action: z.enum(["confirm", "reopen", "set_uguale_offerta"]),
  ugualeOfferta: z.boolean().optional(),
});

const TASK_SELECT_WITH_FLAG = `
      id,
      site_id,
      kanbanId,
      kanbanColumnId,
      kanban:kanbanId(id, identifier, is_invoicing_kanban),
      column:kanbanColumnId(id, identifier, title, position)
    `;

const TASK_SELECT_WITHOUT_FLAG = `
      id,
      site_id,
      kanbanId,
      kanbanColumnId,
      kanban:kanbanId(id, identifier),
      column:kanbanColumnId(id, identifier, title, position)
    `;

type FatturazioneTaskRow = {
  id: number;
  site_id: string;
  kanbanId: number | null;
  kanbanColumnId: number | null;
  kanban:
    | { id: number; identifier: string | null; is_invoicing_kanban?: boolean | null }
    | { id: number; identifier: string | null; is_invoicing_kanban?: boolean | null }[]
    | null;
  column:
    | { id: number; identifier: string | null; title: string | null; position: number | null }
    | { id: number; identifier: string | null; title: string | null; position: number | null }[]
    | null;
};

async function loadTaskForSite(
  supabase: Awaited<ReturnType<typeof createClient>>,
  taskId: number,
  siteId: string,
): Promise<FatturazioneTaskRow | null> {
  const query = (select: string) =>
    supabase
      .from("Task")
      .select(select)
      .eq("id", taskId)
      .eq("site_id", siteId)
      .maybeSingle();

  const first = await query(TASK_SELECT_WITH_FLAG);
  if (!first.error) return (first.data as FatturazioneTaskRow | null) ?? null;
  if (!isFatturazioneSchemaMissing(first.error)) throw first.error;

  const fallback = await query(TASK_SELECT_WITHOUT_FLAG);
  if (fallback.error) throw fallback.error;
  return (fallback.data as FatturazioneTaskRow | null) ?? null;
}

function disabledReadinessResponse() {
  return NextResponse.json({
    enabled: false,
    readiness: null,
    supplementi: [],
    catalog: [],
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId: taskIdRaw } = await params;
    const taskId = Number.parseInt(taskIdRaw, 10);
    if (!Number.isFinite(taskId)) {
      return NextResponse.json({ error: "Task non valida" }, { status: 400 });
    }

    const userContext = await getUserContext();
    if (!userContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { siteId } = await getSiteContext(req);
    if (!siteId) {
      return NextResponse.json({ error: "Site ID required" }, { status: 400 });
    }

    if (!(await isFatturazioneReadinessEnabledForSite(siteId))) {
      return NextResponse.json({ enabled: false, readiness: null, supplementi: [], catalog: [] });
    }

    const supabase = await createClient();
    const task = await loadTaskForSite(supabase, taskId, siteId);
    if (!task) {
      return NextResponse.json({ error: "Task non trovata" }, { status: 404 });
    }

    const kanban = Array.isArray(task.kanban) ? task.kanban[0] : task.kanban;
    const column = Array.isArray(task.column) ? task.column[0] : task.column;
    if (!isFatturazioneKanban(kanban as any, column as any)) {
      return NextResponse.json({ enabled: false, readiness: null, supplementi: [], catalog: [] });
    }

    try {
      await ensureFatturazioneReadiness({ supabase, siteId, taskId });
    } catch (error) {
      if (isFatturazioneSchemaMissing(error)) {
        return disabledReadinessResponse();
      }
      throw error;
    }

    const [readinessResult, supplementiResult, catalogResult] = await Promise.all([
      supabase
        .from("fatturazione_readiness")
        .select(
          "id, site_id, task_id, stato, uguale_offerta, confermato_at, confermato_by",
        )
        .eq("site_id", siteId)
        .eq("task_id", taskId)
        .maybeSingle(),
      supabase
        .from("fatturazione_supplemento_riga")
        .select("id, site_id, task_id, descrizione, quantita, prezzo, created_by, created_at")
        .eq("site_id", siteId)
        .eq("task_id", taskId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true }),
      supabase
        .from("supplementi")
        .select("id, codice, nome, valore, tipo_calcolo")
        .eq("site_id", siteId)
        .eq("attivo", true)
        .order("nome", { ascending: true }),
    ]);

    if (
      isFatturazioneSchemaMissing(readinessResult.error) ||
      isFatturazioneSchemaMissing(supplementiResult.error)
    ) {
      return disabledReadinessResponse();
    }

    if (readinessResult.error) throw readinessResult.error;
    if (supplementiResult.error) throw supplementiResult.error;

    return NextResponse.json({
      enabled: true,
      canWrite: canWriteFatturazioneReadiness(userContext.role),
      readiness: readinessResult.data,
      supplementi: supplementiResult.data || [],
      catalog: catalogResult.error ? [] : catalogResult.data || [],
    });
  } catch (error) {
    if (isFatturazioneSchemaMissing(error)) {
      return disabledReadinessResponse();
    }
    console.error("[fatturazione-readiness] GET", error);
    return NextResponse.json(
      { error: "Impossibile caricare lo stato fatturazione" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId: taskIdRaw } = await params;
    const taskId = Number.parseInt(taskIdRaw, 10);
    if (!Number.isFinite(taskId)) {
      return NextResponse.json({ error: "Task non valida" }, { status: 400 });
    }

    const userContext = await getUserContext();
    if (!userContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canWriteFatturazioneReadiness(userContext.role)) {
      return NextResponse.json(
        { error: "Solo il direttore o un admin dello spazio puo confermare" },
        { status: 403 },
      );
    }

    const { siteId } = await getSiteContext(req);
    if (!siteId) {
      return NextResponse.json({ error: "Site ID required" }, { status: 400 });
    }
    if (!(await isFatturazioneReadinessEnabledForSite(siteId))) {
      return NextResponse.json({ error: "Funzione disattivata" }, { status: 404 });
    }

    const parsed = confirmSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = await createClient();
    const task = await loadTaskForSite(supabase, taskId, siteId);
    if (!task) {
      return NextResponse.json({ error: "Task non trovata" }, { status: 404 });
    }

    await ensureFatturazioneReadiness({ supabase, siteId, taskId });

    const { data: readiness } = await supabase
      .from("fatturazione_readiness")
      .select("id, uguale_offerta, stato")
      .eq("site_id", siteId)
      .eq("task_id", taskId)
      .maybeSingle();

    if (!readiness) {
      return NextResponse.json({ error: "Stato non trovato" }, { status: 404 });
    }

    const actorId = userContext.user?.id || userContext.userId || null;

    if (parsed.data.action === "set_uguale_offerta") {
      const ugualeOfferta = Boolean(parsed.data.ugualeOfferta);
      const { data, error } = await supabase
        .from("fatturazione_readiness")
        .update({
          uguale_offerta: ugualeOfferta,
          stato: "in_attesa",
          confermato_at: null,
          confermato_by: null,
        })
        .eq("id", readiness.id)
        .eq("site_id", siteId)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ readiness: data });
    }

    if (parsed.data.action === "reopen") {
      const { data, error } = await supabase
        .from("fatturazione_readiness")
        .update({
          stato: "in_attesa",
          confermato_at: null,
          confermato_by: null,
        })
        .eq("id", readiness.id)
        .eq("site_id", siteId)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ readiness: data });
    }

    const { count } = await supabase
      .from("fatturazione_supplemento_riga")
      .select("id", { count: "exact", head: true })
      .eq("site_id", siteId)
      .eq("task_id", taskId)
      .is("deleted_at", null);

    if (
      !canConfirmFatturazioneReadiness({
        ugualeOfferta: Boolean(readiness.uguale_offerta),
        supplementiCount: count || 0,
      })
    ) {
      return NextResponse.json(
        {
          error:
            "Conferma la checkbox 'Uguale all'offerta' oppure aggiungi almeno un supplemento",
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("fatturazione_readiness")
      .update({
        stato: "pronto",
        confermato_at: new Date().toISOString(),
        confermato_by: actorId,
      })
      .eq("id", readiness.id)
      .eq("site_id", siteId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ readiness: data });
  } catch (error) {
    if (isFatturazioneSchemaMissing(error)) {
      return NextResponse.json({ error: "Funzione non disponibile" }, { status: 404 });
    }
    console.error("[fatturazione-readiness] PATCH", error);
    return NextResponse.json(
      { error: "Impossibile aggiornare lo stato fatturazione" },
      { status: 500 },
    );
  }
}
