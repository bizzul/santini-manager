import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext } from "@/lib/site-context";
import { getUserContext } from "@/lib/auth-utils";
import {
  canWriteFatturazioneReadiness,
  isFatturazioneReadinessEnabledForSite,
} from "@/lib/fatturazione-readiness.server";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  descrizione: z.string().trim().min(1).max(500).optional(),
  quantita: z.coerce.number().positive().optional(),
  prezzo: z.coerce.number().finite().optional(),
});

async function loadWritableRow(req: NextRequest, id: string) {
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
  const { data: row } = await supabase
    .from("fatturazione_supplemento_riga")
    .select("id, site_id, task_id")
    .eq("id", id)
    .eq("site_id", siteId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!row) {
    return { error: NextResponse.json({ error: "Riga non trovata" }, { status: 404 }) };
  }

  return { supabase, siteId, row };
}

async function markInAttesa(
  supabase: Awaited<ReturnType<typeof createClient>>,
  siteId: string,
  taskId: number,
) {
  await supabase
    .from("fatturazione_readiness")
    .update({
      stato: "in_attesa",
      confermato_at: null,
      confermato_by: null,
    })
    .eq("site_id", siteId)
    .eq("task_id", taskId);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const gate = await loadWritableRow(req, id);
    if ("error" in gate && gate.error) return gate.error;

    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    if (parsed.data.descrizione !== undefined) patch.descrizione = parsed.data.descrizione;
    if (parsed.data.quantita !== undefined) patch.quantita = parsed.data.quantita;
    if (parsed.data.prezzo !== undefined) patch.prezzo = parsed.data.prezzo;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nessun campo da aggiornare" }, { status: 400 });
    }

    const { supabase, siteId, row } = gate;
    const { data, error } = await supabase
      .from("fatturazione_supplemento_riga")
      .update(patch)
      .eq("id", row.id)
      .eq("site_id", siteId)
      .select()
      .single();
    if (error) throw error;

    await markInAttesa(supabase, siteId, row.task_id);
    return NextResponse.json({ supplemento: data });
  } catch (error) {
    console.error("[fatturazione-supplementi] PATCH", error);
    return NextResponse.json(
      { error: "Impossibile aggiornare il supplemento" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const gate = await loadWritableRow(req, id);
    if ("error" in gate && gate.error) return gate.error;

    const { supabase, siteId, row } = gate;
    const { error } = await supabase
      .from("fatturazione_supplemento_riga")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("site_id", siteId);
    if (error) throw error;

    await markInAttesa(supabase, siteId, row.task_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[fatturazione-supplementi] DELETE", error);
    return NextResponse.json(
      { error: "Impossibile eliminare il supplemento" },
      { status: 500 },
    );
  }
}
