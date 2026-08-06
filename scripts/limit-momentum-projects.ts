/**
 * Nello spazio Momentum elimina tutti i Task/progetti tranne "26-002 Halloween".
 * Non tocca utenti Auth. Cancella prima le dipendenze FK (come removeItem).
 *
 * Dry-run:
 *   npx tsx --env-file=.env.local scripts/limit-momentum-projects.ts
 * Applica:
 *   APPLY=1 npx tsx --env-file=.env.local scripts/limit-momentum-projects.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
const SERVICE_KEY =
  process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUBDOMAIN = process.env.SUBDOMAIN || "momentum";
const KEEP_CODE = (process.env.KEEP_CODE || "26-002").trim().toLowerCase();
const KEEP_NAME = (process.env.KEEP_NAME || "Halloween").trim().toLowerCase();
const APPLY = process.env.APPLY === "1";
const DELETE_BATCH = 200;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing Supabase env vars. Run with --env-file=.env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function normalize(s: string | null | undefined): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isKeeper(task: {
  unique_code?: string | null;
  name?: string | null;
  title?: string | null;
}): boolean {
  const code = normalize(task.unique_code);
  const label = normalize(task.name || task.title);
  const codeOk =
    code === KEEP_CODE ||
    code.endsWith(KEEP_CODE) ||
    code.includes(KEEP_CODE);
  const nameOk = label.includes(KEEP_NAME);
  return codeOk && nameOk;
}

async function deleteByEq(
  sb: SupabaseClient,
  table: string,
  column: string,
  value: number | string
) {
  const { error } = await sb.from(table).delete().eq(column, value);
  if (error && !/does not exist|Could not find/i.test(error.message)) {
    // Alcune tabelle possono non esistere in tutti gli ambienti.
    throw new Error(`${table}.${column}=${value}: ${error.message}`);
  }
}

async function deleteTaskHistory(sb: SupabaseClient, taskId: number) {
  for (let i = 0; i < 200; i++) {
    const { data, error } = await sb
      .from("TaskHistory")
      .select("id")
      .eq("taskId", taskId)
      .order("id", { ascending: true })
      .limit(DELETE_BATCH);
    if (error) throw new Error(`TaskHistory select: ${error.message}`);
    if (!data?.length) return;
    const { error: delErr } = await sb
      .from("TaskHistory")
      .delete()
      .in(
        "id",
        data.map((r) => r.id)
      );
    if (delErr) throw new Error(`TaskHistory delete: ${delErr.message}`);
  }
  throw new Error(`TaskHistory: troppi batch per task ${taskId}`);
}

async function deleteTaskCascade(sb: SupabaseClient, taskId: number) {
  // PackingItem → PackingControl
  const { data: packing } = await sb
    .from("PackingControl")
    .select("id")
    .eq("taskId", taskId);
  const packingIds = (packing ?? []).map((p) => p.id);
  if (packingIds.length) {
    await sb.from("PackingItem").delete().in("packingControlId", packingIds);
  }

  // Qc_item → QualityControl
  const { data: qcs } = await sb
    .from("QualityControl")
    .select("id")
    .eq("taskId", taskId);
  const qcIds = (qcs ?? []).map((q) => q.id);
  if (qcIds.length) {
    await sb.from("Qc_item").delete().in("qualityControlId", qcIds);
  }

  await deleteByEq(sb, "Timetracking", "task_id", taskId);
  await deleteTaskHistory(sb, taskId);
  await deleteByEq(sb, "TaskSupplier", "taskId", taskId);
  await deleteByEq(sb, "File", "taskId", taskId);
  await deleteByEq(sb, "Action", "taskId", taskId);
  await deleteByEq(sb, "Errortracking", "task_id", taskId);
  await deleteByEq(sb, "QualityControl", "taskId", taskId);
  await deleteByEq(sb, "PackingControl", "taskId", taskId);

  // Collegamenti offerta / fatture se presenti (best-effort)
  await sb.from("Offer").update({ taskId: null }).eq("taskId", taskId);
  // Alcuni ambienti usano task_id su Invoice
  await sb.from("Invoice").update({ task_id: null }).eq("task_id", taskId);

  const { error } = await sb.from("Task").delete().eq("id", taskId);
  if (error) throw new Error(`Task delete ${taskId}: ${error.message}`);
}

async function main() {
  const { data: site, error: siteErr } = await supabase
    .from("sites")
    .select("id, name, subdomain")
    .eq("subdomain", SUBDOMAIN)
    .maybeSingle();

  if (siteErr || !site) {
    throw new Error(`Sito "${SUBDOMAIN}" non trovato: ${siteErr?.message}`);
  }

  console.log(
    `\n=== ${APPLY ? "APPLY" : "DRY-RUN"} — progetti spazio "${SUBDOMAIN}"` +
      ` / "${site.name}" (${site.id}) ===\n`
  );

  const { data: tasks, error } = await supabase
    .from("Task")
    .select("id, unique_code, name, title, archived, status")
    .eq("site_id", site.id)
    .order("unique_code", { ascending: true });

  if (error) throw new Error(`Task select: ${error.message}`);

  if (!tasks?.length) {
    console.log("Nessun progetto nello spazio Momentum.");
    return;
  }

  console.log(`Totale Task: ${tasks.length}\n`);
  for (const t of tasks) {
    console.log(
      `  ${t.id}\t${t.unique_code ?? "-"}\t${t.name || t.title || "-"}\tarchived=${t.archived}`
    );
  }

  const keepers = tasks.filter(isKeeper);
  if (keepers.length === 0) {
    console.error(
      `\nNessun progetto trovato con codice ~ "${KEEP_CODE}" e nome ~ "${KEEP_NAME}".`
    );
    process.exit(1);
  }
  if (keepers.length > 1) {
    console.error("\nTrovati più candidati da mantenere:");
    for (const k of keepers) {
      console.log(`  - ${k.id} ${k.unique_code} ${k.name || k.title}`);
    }
    process.exit(1);
  }

  const keep = keepers[0];
  const toDelete = tasks.filter((t) => t.id !== keep.id);

  console.log(
    `\nKEEP: ${keep.id} | ${keep.unique_code} | ${keep.name || keep.title}`
  );
  console.log(`DELETE: ${toDelete.length} progetti\n`);
  for (const t of toDelete) {
    console.log(`  - ${t.id}\t${t.unique_code ?? "-"}\t${t.name || t.title}`);
  }

  if (!APPLY) {
    console.log(
      "\nDry-run completato. Riesegui con APPLY=1 per applicare le modifiche."
    );
    return;
  }

  let deleted = 0;
  for (const t of toDelete) {
    process.stdout.write(`Elimino ${t.unique_code || t.id}... `);
    await deleteTaskCascade(supabase, t.id);
    deleted++;
    console.log("ok");
  }

  const { data: remaining } = await supabase
    .from("Task")
    .select("id, unique_code, name, title")
    .eq("site_id", site.id);

  console.log(`\n✅ Eliminati ${deleted} progetti.`);
  console.log(`Rimanenti: ${(remaining ?? []).length}`);
  for (const t of remaining ?? []) {
    console.log(`  - ${t.id}\t${t.unique_code}\t${t.name || t.title}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
