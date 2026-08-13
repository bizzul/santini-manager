/**
 * Seed + teardown ZZTEST per readiness fatturazione.
 *
 * Crea una card Fatture OUT con unique_code ZZTEST-FATT-RDY, stato in_attesa,
 * una riga supplemento, conferma a pronto, poi elimina tutto.
 *
 * Uso:
 *   npx tsx scripts/zztest-fatturazione-readiness.ts --site-id <uuid>
 *   npx tsx scripts/zztest-fatturazione-readiness.ts --site-id <uuid> --teardown-only
 *
 * Non tocca card reali: opera solo su unique_code LIKE 'ZZTEST-FATT-RDY%'.
 */
import { createClient } from "@supabase/supabase-js";

const CODE = "ZZTEST-FATT-RDY";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function main() {
  const siteId = arg("--site-id");
  if (!siteId) {
    throw new Error("Passa --site-id <uuid> dello spazio di test");
  }

  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const teardown = async () => {
    const { data: tasks } = await supabase
      .from("Task")
      .select("id")
      .eq("site_id", siteId)
      .like("unique_code", `${CODE}%`);
    const ids = (tasks || []).map((row) => row.id);
    if (ids.length === 0) {
      console.log("Nessun dato ZZTEST-FATT-RDY da rimuovere");
      return;
    }
    await supabase.from("fatturazione_supplemento_riga").delete().in("task_id", ids);
    await supabase.from("fatturazione_readiness").delete().in("task_id", ids);
    await supabase.from("Task").delete().in("id", ids);
    console.log(`Teardown OK: ${ids.length} task ZZTEST rimossi`);
  };

  await teardown();
  if (process.argv.includes("--teardown-only")) return;

  const { data: kanban, error: kanbanError } = await supabase
    .from("Kanban")
    .select("id, is_invoicing_kanban")
    .eq("site_id", siteId)
    .eq("identifier", "fatture")
    .maybeSingle();
  if (kanbanError || !kanban) {
    throw new Error("Kanban fatture non trovata nello spazio");
  }

  const { data: column, error: columnError } = await supabase
    .from("KanbanColumn")
    .select("id")
    .eq("kanbanId", kanban.id)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (columnError || !column) {
    throw new Error("Colonna To Do fatture non trovata");
  }

  const { data: task, error: taskError } = await supabase
    .from("Task")
    .insert({
      site_id: siteId,
      kanbanId: kanban.id,
      kanbanColumnId: column.id,
      unique_code: CODE,
      name: "ZZTEST readiness fatturazione",
      title: "ZZTEST readiness fatturazione",
      task_type: "FATTURA",
      archived: false,
      status: "open",
    })
    .select("id")
    .single();
  if (taskError || !task) {
    throw new Error(`Insert task: ${taskError?.message}`);
  }

  const { error: readinessError } = await supabase
    .from("fatturazione_readiness")
    .insert({
      site_id: siteId,
      task_id: task.id,
      stato: "in_attesa",
      uguale_offerta: false,
    });
  if (readinessError) throw new Error(readinessError.message);

  const { error: rowError } = await supabase
    .from("fatturazione_supplemento_riga")
    .insert({
      site_id: siteId,
      task_id: task.id,
      descrizione: "ZZTEST accessorio extra",
      quantita: 1,
      prezzo: 120,
    });
  if (rowError) throw new Error(rowError.message);

  const { error: confirmError } = await supabase
    .from("fatturazione_readiness")
    .update({
      stato: "pronto",
      confermato_at: new Date().toISOString(),
    })
    .eq("task_id", task.id)
    .eq("site_id", siteId);
  if (confirmError) throw new Error(confirmError.message);

  const { data: check } = await supabase
    .from("fatturazione_readiness")
    .select("stato")
    .eq("task_id", task.id)
    .maybeSingle();
  if (check?.stato !== "pronto") {
    throw new Error("Conferma non persistita");
  }

  console.log(`Seed OK: task ${task.id} ${CODE} pronto. Esegui --teardown-only per pulire.`);
  await teardown();
  console.log("Ciclo seed+teardown completato, DB pulito.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
