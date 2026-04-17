/**
 * One-shot seed script: enable `command_deck_enabled = true` in
 * `site_settings` for a given list of site subdomains.
 *
 * Usage (from repo root):
 *   npx tsx -r dotenv/config scripts/seed-command-deck-enabled.ts \
 *     dotenv_config_path=.env.local -- <subdomain-or-pattern> [...]
 *
 * Examples:
 *   # Seed both santini-copia and santini
 *   npx tsx -r dotenv/config scripts/seed-command-deck-enabled.ts \
 *     dotenv_config_path=.env.local santini-copia santini
 *
 *   # Seed any subdomain containing "copia"
 *   npx tsx -r dotenv/config scripts/seed-command-deck-enabled.ts \
 *     dotenv_config_path=.env.local '%copia%'
 *
 * Safety:
 *  - Uses `ON CONFLICT DO NOTHING` via Supabase upsert so never overrides
 *    an existing explicit toggle (admin-UI or SQL).
 *  - Pulls credentials from env (.env.local), never prints them.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// The repo standardizes on `STORAGE_SUPABASE_SERVICE_ROLE_KEY` (see
// `utils/supabase/server.ts`). We accept the non-prefixed name too for
// portability with staging / CI environments.
const SERVICE_KEY =
  process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing env vars: NEXT_PUBLIC_SUPABASE_URL and/or " +
      "STORAGE_SUPABASE_SERVICE_ROLE_KEY. Load them via `-r dotenv/config " +
      "dotenv_config_path=.env.local`.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const patterns = process.argv.slice(2).filter((a) => !a.includes("="));
  if (patterns.length === 0) {
    console.error(
      "No subdomain patterns provided. Pass one or more subdomains " +
        "(exact or ILIKE with %).",
    );
    process.exit(1);
  }

  console.log("[seed] resolving sites for patterns:", patterns);

  // Collect matching site ids (union across all patterns).
  const siteIds = new Map<string, string>(); // id -> subdomain
  for (const pattern of patterns) {
    const query = pattern.includes("%")
      ? supabase.from("sites").select("id, subdomain").ilike("subdomain", pattern)
      : supabase.from("sites").select("id, subdomain").eq("subdomain", pattern);

    const { data, error } = await query;
    if (error) {
      console.error(`[seed] query failed for "${pattern}":`, error.message);
      process.exit(1);
    }
    for (const row of data ?? []) {
      siteIds.set(row.id, row.subdomain);
    }
  }

  if (siteIds.size === 0) {
    console.warn("[seed] no sites matched the provided patterns. Nothing to do.");
    return;
  }

  console.log(`[seed] matched ${siteIds.size} site(s):`);
  for (const [id, subdomain] of siteIds) {
    console.log(`  - ${subdomain} (${id})`);
  }

  // Check existing entries (pure reporting; the upsert will handle skips).
  const { data: existing } = await supabase
    .from("site_settings")
    .select("site_id, setting_value")
    .in("site_id", Array.from(siteIds.keys()))
    .eq("setting_key", "command_deck_enabled");

  const existingMap = new Map(
    (existing ?? []).map((row) => [row.site_id, row.setting_value]),
  );

  console.log("[seed] existing command_deck_enabled rows:");
  for (const [id, subdomain] of siteIds) {
    const current = existingMap.get(id);
    console.log(
      `  - ${subdomain}: ${
        current === undefined ? "(missing)" : JSON.stringify(current)
      }`,
    );
  }

  // Build the upsert payload. We only write for sites that don't already
  // have an explicit entry — this mirrors ON CONFLICT DO NOTHING semantics
  // from the SQL migration.
  const rows = Array.from(siteIds.keys())
    .filter((id) => !existingMap.has(id))
    .map((site_id) => ({
      site_id,
      setting_key: "command_deck_enabled",
      setting_value: true,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) {
    console.log(
      "[seed] every matched site already has an explicit command_deck_enabled row — leaving them untouched.",
    );
    return;
  }

  console.log(`[seed] upserting ${rows.length} new row(s)...`);
  const { error: insertError } = await supabase
    .from("site_settings")
    .upsert(rows, { onConflict: "site_id,setting_key" });

  if (insertError) {
    console.error("[seed] upsert failed:", insertError.message);
    process.exit(1);
  }

  console.log("[seed] done. Verify with:");
  console.log(
    "  curl -s http://localhost:3000/api/sites/santini-copia | grep commandDeckEnabled",
  );
}

main().catch((err) => {
  console.error("[seed] unexpected error:", err);
  process.exit(1);
});
