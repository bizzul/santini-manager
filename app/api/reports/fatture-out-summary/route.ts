import { NextRequest, NextResponse } from "next/server";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteContext, hasSiteId } from "@/lib/site-context";
import { createServiceClient } from "@/utils/supabase/server";
import {
  isFatturazioneInviataColumn,
  isFatturazioneKanban,
  isFatturazioneSchemaMissing,
  isFatturazioneToDoColumn,
} from "@/lib/fatturazione-readiness";
import { parseTypedComments } from "@/lib/task-typed-comments";
import { formatDocumentDateStamp } from "@/lib/document-filename";
import { resolvePdfLogoBuffer } from "@/lib/pdf-report-branding";
import {
  buildFattureOutSummaryPdf,
  type FattureOutSummaryRow,
  type FattureOutSummarySection,
} from "@/lib/fatture-out-summary-pdf";

export const dynamic = "force-dynamic";

const MAX_TASKS = 150;

type ClientRow = {
  businessName?: string | null;
  individualFirstName?: string | null;
  individualLastName?: string | null;
} | null;

function asSingle<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function clientName(client: ClientRow): string {
  return (
    client?.businessName?.trim() ||
    `${client?.individualFirstName ?? ""} ${client?.individualLastName ?? ""}`.trim() ||
    "-"
  );
}

function parseTaskIds(payload: unknown): number[] {
  const raw = (payload as { taskIds?: unknown })?.taskIds;
  if (!Array.isArray(raw)) return [];
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const value of raw) {
    const id = Number(value);
    if (!Number.isFinite(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= MAX_TASKS) break;
  }
  return ids;
}

function parseLane(payload: unknown): "todo" | "inviata" {
  return (payload as { lane?: unknown })?.lane === "inviata" ? "inviata" : "todo";
}

function parseGroups(
  payload: unknown,
): Array<{ title: string; taskIds: number[] }> {
  const raw = (payload as { groups?: unknown })?.groups;
  if (Array.isArray(raw) && raw.length > 0) {
    const seen = new Set<number>();
    return raw.map((group) => {
      const title =
        typeof group?.title === "string" && group.title.trim()
          ? group.title.trim()
          : "Fatture";
      const ids: number[] = [];
      for (const value of Array.isArray(group?.taskIds) ? group.taskIds : []) {
        const id = Number(value);
        if (!Number.isFinite(id) || id <= 0 || seen.has(id)) continue;
        seen.add(id);
        ids.push(id);
        if (seen.size >= MAX_TASKS) break;
      }
      return { title, taskIds: ids };
    });
  }

  const taskIds = parseTaskIds(payload);
  return taskIds.length > 0 ? [{ title: "Fatture", taskIds }] : [];
}

export async function POST(req: NextRequest) {
  const userContext = await getUserContext();
  if (!userContext?.userId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const siteContext = await getSiteContext(req);
  if (!hasSiteId(siteContext)) {
    return NextResponse.json(
      { error: "Contesto sito non disponibile" },
      { status: 400 },
    );
  }

  const payload = await req.json().catch(() => null);
  const lane = parseLane(payload);
  const groups = parseGroups(payload);
  const requestedIds = groups.flatMap((group) => group.taskIds);
  const columnLabel = lane === "inviata" ? "Inviate" : "To Do";
  if (requestedIds.length === 0) {
    return NextResponse.json(
      { error: `Nessuna fattura da stampare nella colonna ${columnLabel}` },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const selectWithComments = `
    id,
    unique_code,
    name,
    title,
    sellPrice,
    other,
    typed_comments,
    kanbanId,
    kanbanColumnId,
    client:Client!clientId(
      businessName,
      individualFirstName,
      individualLastName
    ),
    kanban:kanbanId(id, identifier, is_invoicing_kanban),
    column:kanbanColumnId(id, identifier, title, position)
  `;
  const selectMinimal = `
    id,
    unique_code,
    name,
    title,
    sellPrice,
    other,
    kanbanId,
    kanbanColumnId,
    client:Client!clientId(
      businessName,
      individualFirstName,
      individualLastName
    ),
    kanban:kanbanId(id, identifier),
    column:kanbanColumnId(id, identifier, title, position)
  `;

type TaskRow = {
  id: number;
  unique_code: string | null;
  name: string | null;
  title: string | null;
  sellPrice: number | null;
  other: string | null;
  typed_comments?: unknown;
  kanbanId: number | null;
  kanbanColumnId: number | null;
  client: ClientRow | ClientRow[] | null;
  kanban: unknown;
  column: unknown;
};

  let tasks: TaskRow[] | null = null;
  let taskError: { message: string } | null = null;
  {
    const first = await supabase
      .from("Task")
      .select(selectWithComments)
      .eq("site_id", siteContext.siteId)
      .in("id", requestedIds);
    tasks = (first.data as TaskRow[] | null) ?? null;
    taskError = first.error;
  }

  if (taskError) {
    const fallback = await supabase
      .from("Task")
      .select(selectMinimal)
      .eq("site_id", siteContext.siteId)
      .in("id", requestedIds);
    tasks = (fallback.data as TaskRow[] | null) ?? null;
    taskError = fallback.error;
  }

  if (taskError) {
    return NextResponse.json(
      { error: "Errore nel recupero delle fatture", details: taskError.message },
      { status: 500 },
    );
  }

  const eligible = (tasks ?? []).filter((task) => {
    const kanban = asSingle(task.kanban as never);
    const column = asSingle(task.column as never);
    if (!isFatturazioneKanban(kanban, column)) return false;
    return lane === "inviata"
      ? isFatturazioneInviataColumn(column)
      : isFatturazioneToDoColumn(column);
  });
  const eligibleById = new Map(eligible.map((task) => [Number(task.id), task]));
  const ordered = requestedIds
    .map((id) => eligibleById.get(id))
    .filter((task): task is NonNullable<typeof task> => Boolean(task));

  if (ordered.length === 0) {
    return NextResponse.json(
      { error: `Nessuna fattura ${columnLabel} trovata` },
      { status: 404 },
    );
  }

  const taskIds = ordered.map((task) => Number(task.id));
  const readinessByTaskId = new Map<
    number,
    { stato: string; uguale_offerta: boolean }
  >();
  const supplementsByTaskId = new Map<
    number,
    Array<{ description: string; quantity: number; price: number }>
  >();

  const { data: readinessRows, error: readinessError } = await supabase
    .from("fatturazione_readiness")
    .select("task_id, stato, uguale_offerta")
    .eq("site_id", siteContext.siteId)
    .in("task_id", taskIds);

  if (readinessError && !isFatturazioneSchemaMissing(readinessError)) {
    console.warn("[fatture-out-summary] readiness", readinessError);
  }
  for (const row of readinessRows ?? []) {
    readinessByTaskId.set(Number(row.task_id), {
      stato: row.stato === "pronto" ? "Pronto" : "In attesa",
      uguale_offerta: Boolean(row.uguale_offerta),
    });
  }

  const { data: supplementRows, error: supplementError } = await supabase
    .from("fatturazione_supplemento_riga")
    .select("task_id, descrizione, quantita, prezzo")
    .eq("site_id", siteContext.siteId)
    .in("task_id", taskIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (supplementError && !isFatturazioneSchemaMissing(supplementError)) {
    console.warn("[fatture-out-summary] supplementi", supplementError);
  }
  for (const row of supplementRows ?? []) {
    const taskId = Number(row.task_id);
    const current = supplementsByTaskId.get(taskId) ?? [];
    current.push({
      description: String(row.descrizione || "").trim() || "Supplemento",
      quantity: Number(row.quantita) || 0,
      price: Number(row.prezzo) || 0,
    });
    supplementsByTaskId.set(taskId, current);
  }

  const rowsById = new Map(
    ordered.map((task) => {
      const comments = parseTypedComments({
        typed_comments: (task as { typed_comments?: unknown }).typed_comments,
        other: task.other,
      });
      const commentParts = [comments.produzione, comments.posa]
        .map((part) => part.trim())
        .filter(Boolean);
      const readiness = readinessByTaskId.get(Number(task.id));
      const row: FattureOutSummaryRow = {
        uniqueCode: task.unique_code || `P${task.id}`,
        name: task.title || task.name || "-",
        clientName: clientName(asSingle(task.client as never)),
        objectName: task.name || task.title || "-",
        value: Number(task.sellPrice) || 0,
        supplements: supplementsByTaskId.get(Number(task.id)) ?? [],
        comments: commentParts.join("\n") || "-",
        invoicingNotes: comments.fatturazione.trim(),
        invoicingStatus: readiness?.stato || "In attesa",
        sameAsOffer: Boolean(readiness?.uguale_offerta),
      };
      return [Number(task.id), row] as const;
    }),
  );

  const sections: FattureOutSummarySection[] = groups.map((group) => ({
    title: group.title,
    rows: group.taskIds
      .map((id) => rowsById.get(id))
      .filter((row): row is FattureOutSummaryRow => Boolean(row)),
  }));

  let companyName = siteContext.siteData?.name || "FDM";
  let siteLogo = siteContext.siteData?.logo ?? null;
  if (!siteContext.siteData?.name || !siteLogo) {
    const { data: siteRow } = await supabase
      .from("sites")
      .select("name, logo")
      .eq("id", siteContext.siteId)
      .maybeSingle();
    companyName = siteRow?.name || companyName;
    siteLogo = siteRow?.logo ?? siteLogo;
  }

  const logoBuffer = await resolvePdfLogoBuffer({
    remoteUrl: siteLogo || siteContext.siteData?.image,
    subdomain:
      siteContext.siteData?.subdomain ||
      req.headers.get("x-site-domain") ||
      siteContext.domain,
    companyName,
  });

  const pdfBytes = await buildFattureOutSummaryPdf({
    companyName,
    columnLabel,
    generatedAt: new Date(),
    sections,
    logoBytes: logoBuffer ? Uint8Array.from(logoBuffer) : null,
  });

  const filename = `RiepilogoFattureOut_${columnLabel.replace(/\s+/g, "")}_${formatDocumentDateStamp(new Date())}.pdf`;
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
