/**
 * Crea 8 categorie Kanban principali (tassonomia Wheel of Life) per lo spazio
 * "Matteo Paolocci" e, per ciascuna categoria, un kanban di secondo livello con
 * le colonne di default — esattamente come negli altri spazi (categoria =
 * gruppo in sidebar, board dentro la categoria).
 *
 *   Career · Finance · Family · Health · Fun & Recreation · Friends ·
 *   Personal Development · Spiritual
 *
 * Ogni board ha il flusso standard: Da fare (creazione) · In corso ·
 * In revisione · Completato (won).
 *
 * Idempotente: salta categorie/board/colonne gia presenti (match per identifier).
 * Gli identifier di Kanban e KanbanColumn hanno un vincolo UNIQUE globale, quindi
 * vengono suffissati con un frammento del site id (come fa l'app FDM).
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-matteo-kanban.ts
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
const SERVICE_KEY =
  process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUBDOMAIN = "matteo-paolocci";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing Supabase env vars. Run with --env-file=.env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

interface AreaDef {
  slug: string;
  name: string;
  color: string;
  icon: string;
  order: number;
}

// Tassonomia Wheel of Life (colori e ordine coerenti con l'immagine / LIFE_AREAS).
const AREAS: AreaDef[] = [
  { slug: "career", name: "Career", color: "#F5921B", icon: "Briefcase", order: 0 },
  { slug: "finance", name: "Finance", color: "#F2C218", icon: "Wallet", order: 1 },
  { slug: "family", name: "Family", color: "#57B947", icon: "Home", order: 2 },
  { slug: "health", name: "Health", color: "#2FBFA4", icon: "HeartPulse", order: 3 },
  { slug: "fun", name: "Fun & Recreation", color: "#39B7E4", icon: "PartyPopper", order: 4 },
  { slug: "friends", name: "Friends", color: "#6E77D8", icon: "Users", order: 5 },
  { slug: "growth", name: "Personal Development", color: "#B061D4", icon: "GraduationCap", order: 6 },
  { slug: "spiritual", name: "Spiritual", color: "#F0736A", icon: "Sparkles", order: 7 },
];

interface ColDef {
  title: string;
  key: string;
  position: number;
  column_type: string;
  is_creation_column: boolean;
  icon: string;
}

// Flusso standard di ogni board di secondo livello.
const STANDARD_COLUMNS: ColDef[] = [
  { title: "Da fare", key: "todo", position: 1, column_type: "normal", is_creation_column: true, icon: "ListTodo" },
  { title: "In corso", key: "doing", position: 2, column_type: "normal", is_creation_column: false, icon: "Loader" },
  { title: "In revisione", key: "review", position: 3, column_type: "normal", is_creation_column: false, icon: "Eye" },
  { title: "Completato", key: "done", position: 4, column_type: "won", is_creation_column: false, icon: "CircleCheckBig" },
];

let SITE_FRAG = "";
const uid = (id: string) => `${id}-${SITE_FRAG}`;

async function ensureCategory(siteId: string, area: AreaDef): Promise<number> {
  const { data: existing } = await supabase
    .from("KanbanCategory")
    .select("id")
    .eq("site_id", siteId)
    .eq("identifier", area.slug)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("KanbanCategory")
    .insert({
      site_id: siteId,
      name: area.name,
      identifier: area.slug,
      description: `Bacheche dell'area ${area.name}`,
      icon: area.icon,
      color: area.color,
      display_order: area.order,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`KanbanCategory "${area.name}": ${error?.message}`);
  }
  return data.id;
}

async function ensureBoard(
  siteId: string,
  area: AreaDef,
  categoryId: number,
): Promise<number> {
  const boardIdentifier = uid(`${area.slug}-board`);
  const { data: existing } = await supabase
    .from("Kanban")
    .select("id")
    .eq("site_id", siteId)
    .eq("identifier", boardIdentifier)
    .maybeSingle();

  let kanbanId: number;
  if (existing) {
    kanbanId = existing.id;
  } else {
    const { data, error } = await supabase
      .from("Kanban")
      .insert({
        title: area.name,
        identifier: boardIdentifier,
        site_id: siteId,
        category_id: categoryId,
        color: area.color,
        icon: area.icon,
        is_offer_kanban: false,
        is_work_kanban: false,
        is_production_kanban: false,
        show_category_colors: false,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`Kanban "${area.name}": ${error?.message}`);
    kanbanId = data.id;
  }

  for (const col of STANDARD_COLUMNS) {
    const colIdentifier = uid(`${area.slug}-${col.key}`);
    const { data: existingCol } = await supabase
      .from("KanbanColumn")
      .select("id")
      .eq("kanbanId", kanbanId)
      .eq("identifier", colIdentifier)
      .maybeSingle();
    if (existingCol) continue;
    const { error: colErr } = await supabase.from("KanbanColumn").insert({
      title: col.title,
      identifier: colIdentifier,
      position: col.position,
      kanbanId,
      column_type: col.column_type,
      is_creation_column: col.is_creation_column,
      icon: col.icon,
    });
    if (colErr) throw new Error(`Colonna ${colIdentifier}: ${colErr.message}`);
  }

  return kanbanId;
}

async function main() {
  console.log("🗂️  Kanban Wheel of Life — spazio Matteo Paolocci\n");

  const { data: site, error } = await supabase
    .from("sites")
    .select("id")
    .eq("subdomain", SUBDOMAIN)
    .single();
  if (error || !site) throw new Error(`Sito "${SUBDOMAIN}" non trovato`);
  const siteId = site.id as string;
  SITE_FRAG = siteId.slice(0, 12);

  // Assicura che il modulo kanban sia abilitato per lo spazio.
  const { data: mod } = await supabase
    .from("site_modules")
    .select("id, is_enabled")
    .eq("site_id", siteId)
    .eq("module_name", "kanban")
    .maybeSingle();
  if (!mod) {
    await supabase
      .from("site_modules")
      .insert({ site_id: siteId, module_name: "kanban", is_enabled: true });
  } else if (!mod.is_enabled) {
    await supabase.from("site_modules").update({ is_enabled: true }).eq("id", mod.id);
  }

  for (const area of AREAS) {
    const categoryId = await ensureCategory(siteId, area);
    const kanbanId = await ensureBoard(siteId, area, categoryId);
    console.log(
      `✓ ${area.name.padEnd(22)} categoria ${categoryId} · board ${kanbanId} (4 colonne)`,
    );
  }

  console.log("\n✅ 8 categorie + 8 board di secondo livello create.");
  console.log(`   Spazio: ${SUBDOMAIN} (site_id ${siteId})`);
}

main().catch((e) => {
  console.error("\n❌", e);
  process.exit(1);
});
