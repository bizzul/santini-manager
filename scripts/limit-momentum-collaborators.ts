/**
 * Nello spazio Momentum lascia SOLO Yannick Turkylmaz come collaboratore.
 * Rimuove le altre membership da user_sites e user_organizations (org del sito).
 * Non elimina utenti Auth/User.
 *
 * Dry-run di default:
 *   npx tsx --env-file=.env.local scripts/limit-momentum-collaborators.ts
 * Applica:
 *   APPLY=1 npx tsx --env-file=.env.local scripts/limit-momentum-collaborators.ts
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
const SERVICE_KEY =
  process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUBDOMAIN = process.env.SUBDOMAIN || "momentum";
const KEEP_GIVEN = (process.env.KEEP_GIVEN || "Yannick").trim().toLowerCase();
const KEEP_FAMILY = (process.env.KEEP_FAMILY || "Turkylmaz").trim().toLowerCase();
const APPLY = process.env.APPLY === "1";

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

function isKeeper(given: string | null, family: string | null): boolean {
  const g = normalize(given);
  const f = normalize(family);
  const keepG = normalize(KEEP_GIVEN);
  const keepF = normalize(KEEP_FAMILY);
  // Accetta varianti tipiche: Turkylmaz / Turkyilmaz / Türkyılmaz
  const familyOk =
    f === keepF ||
    f.includes("turky") ||
    f.replace(/i/g, "y").includes(keepF.replace(/i/g, "y"));
  return g === keepG && familyOk;
}

async function main() {
  const { data: site, error: siteErr } = await supabase
    .from("sites")
    .select("id, name, subdomain, organization_id")
    .eq("subdomain", SUBDOMAIN)
    .maybeSingle();

  if (siteErr || !site) {
    throw new Error(`Sito "${SUBDOMAIN}" non trovato: ${siteErr?.message}`);
  }

  const siteId = site.id as string;
  const orgId = site.organization_id as string;

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", orgId)
    .maybeSingle();

  console.log(
    `\n=== ${APPLY ? "APPLY" : "DRY-RUN"} — spazio "${SUBDOMAIN}"` +
      ` / sito "${site.name}" (${siteId})` +
      ` / org "${org?.name ?? "?"}" (${orgId}) ===\n`
  );

  const [{ data: siteMembers, error: smErr }, { data: orgMembers, error: omErr }] =
    await Promise.all([
      supabase.from("user_sites").select("id, user_id").eq("site_id", siteId),
      supabase
        .from("user_organizations")
        .select("id, user_id")
        .eq("organization_id", orgId),
    ]);

  if (smErr) throw new Error(`user_sites: ${smErr.message}`);
  if (omErr) throw new Error(`user_organizations: ${omErr.message}`);

  const authIds = Array.from(
    new Set([
      ...(siteMembers ?? []).map((m) => m.user_id as string),
      ...(orgMembers ?? []).map((m) => m.user_id as string),
    ])
  );

  if (authIds.length === 0) {
    console.log("Nessun collaboratore sullo spazio Momentum.");
    return;
  }

  const { data: profiles, error: pErr } = await supabase
    .from("User")
    .select(
      "authId, email, given_name, family_name, role, enabled, activation_status"
    )
    .in("authId", authIds);

  if (pErr) throw new Error(`User: ${pErr.message}`);

  const keepers = (profiles ?? []).filter((p) =>
    isKeeper(p.given_name, p.family_name)
  );

  if (keepers.length === 0) {
    console.error(
      `Nessun utente trovato con nome ~ "${KEEP_GIVEN} ${KEEP_FAMILY}".`
    );
    console.log("\nCollaboratori attuali:");
    for (const p of profiles ?? []) {
      console.log(
        `  - ${p.given_name ?? ""} ${p.family_name ?? ""} <${p.email}>` +
          ` role=${p.role} enabled=${p.enabled} status=${p.activation_status}`
      );
    }
    process.exit(1);
  }

  if (keepers.length > 1) {
    console.error("Trovati più candidati da mantenere — risolvi a mano:");
    for (const k of keepers) {
      console.log(`  - ${k.given_name} ${k.family_name} <${k.email}> ${k.authId}`);
    }
    process.exit(1);
  }

  const keepAuthId = keepers[0].authId as string;
  console.log(
    `KEEP: ${keepers[0].given_name} ${keepers[0].family_name}` +
      ` <${keepers[0].email}> (${keepAuthId})\n`
  );

  const siteToRemove = (siteMembers ?? []).filter(
    (m) => m.user_id !== keepAuthId
  );
  const orgToRemove = (orgMembers ?? []).filter(
    (m) => m.user_id !== keepAuthId
  );

  const profileByAuth = new Map(
    (profiles ?? []).map((p) => [p.authId as string, p])
  );

  console.log(`user_sites da rimuovere: ${siteToRemove.length}`);
  for (const m of siteToRemove) {
    const p = profileByAuth.get(m.user_id as string);
    console.log(
      `  - ${p?.given_name ?? "?"} ${p?.family_name ?? "?"} <${p?.email ?? m.user_id}>`
    );
  }

  console.log(`\nuser_organizations da rimuovere: ${orgToRemove.length}`);
  for (const m of orgToRemove) {
    const p = profileByAuth.get(m.user_id as string);
    console.log(
      `  - ${p?.given_name ?? "?"} ${p?.family_name ?? "?"} <${p?.email ?? m.user_id}>`
    );
  }

  const hasSiteKeep = (siteMembers ?? []).some((m) => m.user_id === keepAuthId);
  const hasOrgKeep = (orgMembers ?? []).some((m) => m.user_id === keepAuthId);

  if (!hasSiteKeep) {
    console.log("\nYannick non è in user_sites → verrà aggiunto.");
  }
  if (!hasOrgKeep) {
    console.log("Yannick non è in user_organizations → verrà aggiunto.");
  }

  if (!APPLY) {
    console.log(
      "\nDry-run completato. Riesegui con APPLY=1 per applicare le modifiche."
    );
    return;
  }

  if (siteToRemove.length > 0) {
    const ids = siteToRemove.map((m) => m.id);
    const { error } = await supabase.from("user_sites").delete().in("id", ids);
    if (error) throw new Error(`Delete user_sites: ${error.message}`);
  }

  if (orgToRemove.length > 0) {
    const ids = orgToRemove.map((m) => m.id);
    const { error } = await supabase
      .from("user_organizations")
      .delete()
      .in("id", ids);
    if (error) throw new Error(`Delete user_organizations: ${error.message}`);
  }

  if (!hasSiteKeep) {
    const { error } = await supabase
      .from("user_sites")
      .insert({ site_id: siteId, user_id: keepAuthId });
    if (error) throw new Error(`Insert user_sites: ${error.message}`);
  }

  if (!hasOrgKeep) {
    const { error } = await supabase
      .from("user_organizations")
      .insert({ organization_id: orgId, user_id: keepAuthId });
    if (error) throw new Error(`Insert user_organizations: ${error.message}`);
  }

  // Verifica finale
  const [{ data: finalSites }, { data: finalOrgs }] = await Promise.all([
    supabase.from("user_sites").select("user_id").eq("site_id", siteId),
    supabase
      .from("user_organizations")
      .select("user_id")
      .eq("organization_id", orgId),
  ]);

  console.log("\n✅ Applicato.");
  console.log(
    `user_sites rimasti: ${(finalSites ?? []).length}` +
      ` → ${JSON.stringify((finalSites ?? []).map((m) => m.user_id))}`
  );
  console.log(
    `user_organizations rimasti: ${(finalOrgs ?? []).length}` +
      ` → ${JSON.stringify((finalOrgs ?? []).map((m) => m.user_id))}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
