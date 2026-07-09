/**
 * Seed dello spazio "Matteo Paolocci" per il modulo Personal Manager
 * (Wheel of Life).
 *
 * - Crea (se assente) organizzazione + spazio con subdomain "matteo-paolocci"
 *   (la keyword "paolocci" lo colloca nella colonna "Personal" della pagina
 *   "I tuoi spazi").
 * - Abilita il modulo `personal-manager` in site_modules.
 * - Concede accesso allo spazio a tutti gli utenti esistenti (user_sites).
 * - Per gli utenti superadmin (e per chi ha "matteo"/"paolocci" nell'email):
 *   abilita l'app Beta in pm_access con tutte le 8 aree e permessi completi,
 *   e popola punteggi storici, item, automazioni e sorgenti dati di esempio.
 *
 * Idempotente: salta record già presenti (match per titolo/nome nello spazio).
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-personal-manager.ts
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
const SERVICE_KEY =
  process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing Supabase env vars. Run with --env-file=.env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const SUBDOMAIN = "matteo-paolocci";
const ORG_NAME = "Matteo Paolocci Personal";
const SITE_NAME = "Matteo Paolocci";

const AREA_SLUGS = [
  "career",
  "finance",
  "family",
  "health",
  "fun",
  "friends",
  "growth",
  "spiritual",
] as const;
type AreaSlug = (typeof AREA_SLUGS)[number];

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(days: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return iso(d);
}
function daysAgoTs(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

async function ensureOrgAndSite(): Promise<{
  siteId: string;
  organizationId: string;
}> {
  const { data: existing } = await supabase
    .from("sites")
    .select("id, organization_id")
    .eq("subdomain", SUBDOMAIN)
    .maybeSingle();
  if (existing) {
    return { siteId: existing.id, organizationId: existing.organization_id };
  }

  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .insert({ name: ORG_NAME })
    .select("id")
    .single();
  if (orgErr || !org) throw new Error(`organizations: ${orgErr?.message}`);

  const { data: site, error: siteErr } = await supabase
    .from("sites")
    .insert({
      name: SITE_NAME,
      description:
        "Spazio Manager Personale (Wheel of Life) — dati organizzati per aree di vita",
      subdomain: SUBDOMAIN,
      organization_id: org.id,
    })
    .select("id")
    .single();
  if (siteErr || !site) throw new Error(`sites: ${siteErr?.message}`);

  return { siteId: site.id, organizationId: org.id };
}

async function ensureLifeAreasSeeded(siteId: string) {
  // Il trigger su sites dovrebbe averle create; fallback esplicito.
  const { data } = await supabase
    .from("pm_life_areas")
    .select("id")
    .eq("site_id", siteId)
    .limit(1);
  if (!data || data.length === 0) {
    const { error } = await supabase.rpc("pm_seed_life_areas", {
      target_site_id: siteId,
    });
    if (error) throw new Error(`pm_seed_life_areas: ${error.message}`);
  }
}

async function enableModuleAndAccess(siteId: string, organizationId: string) {
  const { data: mod } = await supabase
    .from("site_modules")
    .select("id")
    .eq("site_id", siteId)
    .eq("module_name", "personal-manager")
    .maybeSingle();
  if (!mod) {
    await supabase.from("site_modules").insert({
      site_id: siteId,
      module_name: "personal-manager",
      is_enabled: true,
    });
  } else {
    await supabase
      .from("site_modules")
      .update({ is_enabled: true })
      .eq("id", mod.id);
  }

  // Accesso allo spazio per tutti gli utenti esistenti (pattern seed-momentum).
  const { data: users } = await supabase.from("User").select("authId");
  for (const u of users || []) {
    const authId = (u as { authId: string | null }).authId;
    if (!authId) continue;
    const { data: hasSite } = await supabase
      .from("user_sites")
      .select("id")
      .eq("site_id", siteId)
      .eq("user_id", authId)
      .maybeSingle();
    if (!hasSite) {
      await supabase
        .from("user_sites")
        .insert({ site_id: siteId, user_id: authId });
    }
    const { data: hasOrg } = await supabase
      .from("user_organizations")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", authId)
      .maybeSingle();
    if (!hasOrg) {
      await supabase
        .from("user_organizations")
        .insert({ organization_id: organizationId, user_id: authId });
    }
  }
}

/** Utenti destinatari del gate Beta: superadmin + email matteo/paolocci. */
async function getBetaUserIds(): Promise<string[]> {
  const { data: users } = await supabase
    .from("User")
    .select("authId, email, role");
  const ids = new Set<string>();
  for (const u of users || []) {
    const authId = (u as { authId: string | null }).authId;
    if (!authId) continue;
    const email = ((u as { email: string | null }).email || "").toLowerCase();
    const role = (u as { role: string | null }).role;
    if (
      role === "superadmin" ||
      email.includes("matteo") ||
      email.includes("paolocci")
    ) {
      ids.add(authId);
    }
  }
  return Array.from(ids);
}

async function enableBetaAccess(siteId: string, userId: string) {
  const permissions = Object.fromEntries(
    AREA_SLUGS.map((slug) => [slug, { read: true, edit: true, create: true }]),
  );
  const { error } = await supabase.from("pm_access").upsert(
    {
      site_id: siteId,
      user_id: userId,
      beta_app_enabled: true,
      areas_visible: AREA_SLUGS,
      permissions,
    },
    { onConflict: "site_id,user_id" },
  );
  if (error) throw new Error(`pm_access: ${error.message}`);
}

async function seedScores(siteId: string, userId: string) {
  const { data: existing } = await supabase
    .from("pm_area_scores")
    .select("id")
    .eq("site_id", siteId)
    .eq("user_id", userId)
    .limit(1);
  if (existing && existing.length > 0) return false;

  // Tre rilevazioni per area (60/30 giorni fa + oggi) per avere il trend.
  const latest: Record<AreaSlug, number> = {
    career: 8,
    finance: 6,
    family: 7,
    health: 5,
    fun: 8,
    friends: 6,
    growth: 7,
    spiritual: 4,
  };
  const rows: Record<string, unknown>[] = [];
  for (const slug of AREA_SLUGS) {
    const current = latest[slug];
    const older = Math.max(0, current - 2);
    const mid = Math.max(0, current - 1);
    rows.push(
      {
        site_id: siteId,
        user_id: userId,
        area_slug: slug,
        score: older,
        recorded_at: daysAgoTs(60),
      },
      {
        site_id: siteId,
        user_id: userId,
        area_slug: slug,
        score: mid,
        recorded_at: daysAgoTs(30),
      },
      {
        site_id: siteId,
        user_id: userId,
        area_slug: slug,
        score: current,
        recorded_at: daysAgoTs(1),
      },
    );
  }
  const { error } = await supabase.from("pm_area_scores").insert(rows);
  if (error) throw new Error(`pm_area_scores: ${error.message}`);
  return true;
}

interface ItemDef {
  area: AreaSlug;
  title: string;
  notes?: string;
  priority: number;
  status: "open" | "in_progress" | "done" | "postponed";
  due?: string;
}

async function seedItems(siteId: string, userId: string) {
  const ITEMS: ItemDef[] = [
    // Career
    {
      area: "career",
      title: "Chiudere il rilascio FDM v2",
      notes: "Milestone principale del trimestre",
      priority: 5,
      status: "in_progress",
      due: addDays(7),
    },
    {
      area: "career",
      title: "Preparare proposta nuovo cliente",
      priority: 4,
      status: "open",
      due: addDays(14),
    },
    // Finance
    {
      area: "finance",
      title: "Rivedere spese ricorrenti mensili",
      priority: 3,
      status: "open",
      due: addDays(10),
    },
    {
      area: "finance",
      title: "Impostare obiettivo risparmio Q3",
      priority: 4,
      status: "open",
      due: addDays(21),
    },
    // Family
    {
      area: "family",
      title: "Organizzare pranzo di famiglia",
      priority: 3,
      status: "open",
      due: addDays(12),
    },
    {
      area: "family",
      title: "Regalo compleanno mamma",
      priority: 4,
      status: "in_progress",
      due: addDays(5),
    },
    // Health
    {
      area: "health",
      title: "Prenotare visita di controllo",
      priority: 4,
      status: "open",
      due: addDays(9),
    },
    {
      area: "health",
      title: "3 allenamenti a settimana",
      notes: "Abitudine da consolidare",
      priority: 3,
      status: "in_progress",
    },
    // Fun
    {
      area: "fun",
      title: "Pianificare uscita in parapendio",
      notes: "Controllare meteo weekend",
      priority: 4,
      status: "open",
      due: addDays(6),
    },
    {
      area: "fun",
      title: "Weekend in montagna",
      priority: 2,
      status: "open",
      due: addDays(30),
    },
    // Friends
    {
      area: "friends",
      title: "Risentire Luca",
      notes: "Cadenza mensile",
      priority: 3,
      status: "open",
      due: addDays(3),
    },
    {
      area: "friends",
      title: "Organizzare cena con il gruppo",
      priority: 2,
      status: "open",
      due: addDays(18),
    },
    // Growth
    {
      area: "growth",
      title: "Finire corso di system design",
      priority: 4,
      status: "in_progress",
      due: addDays(25),
    },
    {
      area: "growth",
      title: "Leggere 20 pagine al giorno",
      priority: 3,
      status: "in_progress",
    },
    // Spiritual
    {
      area: "spiritual",
      title: "10 minuti di mindfulness al mattino",
      priority: 3,
      status: "open",
    },
    {
      area: "spiritual",
      title: "Journaling serale",
      notes: "Riflessione sulla giornata",
      priority: 2,
      status: "open",
    },
    // Un item completato per popolare lo storico snapshot
    {
      area: "career",
      title: "Setup spazio Manager Personale",
      priority: 5,
      status: "done",
    },
  ];

  let created = 0;
  for (const item of ITEMS) {
    const { data: existing } = await supabase
      .from("pm_items")
      .select("id")
      .eq("site_id", siteId)
      .eq("user_id", userId)
      .eq("title", item.title)
      .maybeSingle();
    if (existing) continue;

    // Inserisce come "open" e poi aggiorna allo stato finale, così i trigger
    // di snapshot registrano una piccola storia per ogni item non-open.
    const { data: inserted, error } = await supabase
      .from("pm_items")
      .insert({
        site_id: siteId,
        user_id: userId,
        area_slug: item.area,
        title: item.title,
        notes: item.notes ?? null,
        priority: item.priority,
        status: "open",
        due_date: item.due ?? null,
      })
      .select("id")
      .single();
    if (error || !inserted) {
      throw new Error(`pm_items "${item.title}": ${error?.message}`);
    }
    if (item.status !== "open") {
      const { error: updErr } = await supabase
        .from("pm_items")
        .update({ status: item.status })
        .eq("id", inserted.id);
      if (updErr) throw new Error(`pm_items update: ${updErr.message}`);
    }
    created++;
  }
  return created;
}

async function seedAutomations(siteId: string) {
  const AUTOMATIONS = [
    {
      name: "Sync progetti da FDM",
      area_slug: "career" as AreaSlug,
      stato: "attivo",
      data_prevista: addDays(-40),
      data_attivazione: addDays(-15),
      source_ref: "FDM / progetti",
    },
    {
      name: "Import aggregati contabili",
      area_slug: "finance" as AreaSlug,
      stato: "in_integrazione",
      data_prevista: addDays(10),
      source_ref: "Contabilita' (read-only)",
    },
    {
      name: "Metriche wearable",
      area_slug: "health" as AreaSlug,
      stato: "previsto",
      data_prevista: addDays(30),
      source_ref: "Wearable API",
    },
    {
      name: "Ricorrenze da calendario",
      area_slug: "family" as AreaSlug,
      stato: "previsto",
      data_prevista: addDays(45),
      source_ref: "Calendario",
    },
    {
      name: "Promemoria contatti",
      area_slug: "friends" as AreaSlug,
      stato: "in_integrazione",
      data_prevista: addDays(20),
      source_ref: "Rubrica",
    },
  ];

  for (const a of AUTOMATIONS) {
    const { data: existing } = await supabase
      .from("pm_automations")
      .select("id")
      .eq("site_id", siteId)
      .eq("name", a.name)
      .maybeSingle();
    if (existing) continue;
    const { error } = await supabase
      .from("pm_automations")
      .insert({ ...a, site_id: siteId });
    if (error) throw new Error(`pm_automations "${a.name}": ${error.message}`);
  }
}

async function seedDataSources(siteId: string) {
  const SOURCES = [
    {
      name: "DB Manager Personale",
      type: "internal",
      area_slug: null,
      sync_enabled: true,
    },
    {
      name: "FDM Progetti",
      type: "internal",
      area_slug: "career" as AreaSlug,
      sync_enabled: true,
    },
    {
      name: "Contabilita' personale",
      type: "accounting",
      area_slug: "finance" as AreaSlug,
      sync_enabled: false,
    },
    {
      name: "Wearable",
      type: "wearable",
      area_slug: "health" as AreaSlug,
      sync_enabled: false,
    },
    {
      name: "Calendario famiglia",
      type: "calendar",
      area_slug: "family" as AreaSlug,
      sync_enabled: true,
    },
  ];

  for (const s of SOURCES) {
    const { data: existing } = await supabase
      .from("pm_data_sources")
      .select("id")
      .eq("site_id", siteId)
      .eq("name", s.name)
      .maybeSingle();
    if (existing) continue;
    const { error } = await supabase
      .from("pm_data_sources")
      .insert({ ...s, site_id: siteId });
    if (error) throw new Error(`pm_data_sources "${s.name}": ${error.message}`);
  }
}

async function main() {
  console.log("🎡 Seed Personal Manager — spazio Matteo Paolocci\n");

  const { siteId, organizationId } = await ensureOrgAndSite();
  console.log(`✓ Spazio "${SITE_NAME}" (${SUBDOMAIN}): ${siteId}`);

  await ensureLifeAreasSeeded(siteId);
  console.log("✓ 8 aree Wheel of Life presenti");

  await enableModuleAndAccess(siteId, organizationId);
  console.log("✓ Modulo personal-manager abilitato + accessi spazio");

  const betaUsers = await getBetaUserIds();
  if (betaUsers.length === 0) {
    console.warn("⚠ Nessun utente superadmin/matteo trovato: beta non abilitata");
  }
  for (const userId of betaUsers) {
    await enableBetaAccess(siteId, userId);
    const scoresCreated = await seedScores(siteId, userId);
    const itemsCreated = await seedItems(siteId, userId);
    console.log(
      `✓ Utente ${userId}: beta ON, scores ${scoresCreated ? "creati" : "già presenti"}, ${itemsCreated} item creati`,
    );
  }

  await seedAutomations(siteId);
  console.log("✓ Automazioni");
  await seedDataSources(siteId);
  console.log("✓ Sorgenti dati");

  console.log("\n✅ Seed completato.");
  console.log(`   Spazio: ${SUBDOMAIN} (site_id ${siteId})`);
  console.log(`   App:    /sites/${SUBDOMAIN}/personal-manager`);
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
