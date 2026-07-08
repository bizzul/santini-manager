/**
 * Imposta il logo dello spazio "momentum" caricando public/momentum-logo.png
 * nel bucket storage `site-logos` e valorizzando `sites.logo`.
 *
 * Il logo e un wordmark quadrato: nella sidebar e vincolato a
 * `max-h-10 w-auto object-contain` (altezza max 40px), quindi va bene as-is.
 *
 * Idempotente: usa upsert sullo storage e aggiorna sempre sites.logo.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/set-momentum-logo.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
const SERVICE_KEY =
    process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUBDOMAIN = "momentum";
const SOURCE_LOGO = join(process.cwd(), "public", "momentum-logo.png");

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing Supabase env vars. Run with --env-file=.env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
    const { data: site, error } = await supabase
        .from("sites")
        .select("id, logo")
        .eq("subdomain", SUBDOMAIN)
        .single();
    if (error || !site) {
        throw new Error(`Sito "${SUBDOMAIN}" non trovato: ${error?.message}`);
    }

    const buffer = readFileSync(SOURCE_LOGO);

    const fileName = `${site.id}/logo-momentum.png`;
    const { error: uploadError } = await supabase.storage
        .from("site-logos")
        .upload(fileName, buffer, {
            contentType: "image/png",
            cacheControl: "3600",
            upsert: true,
        });
    if (uploadError) throw new Error(`Logo upload: ${uploadError.message}`);

    const {
        data: { publicUrl },
    } = supabase.storage.from("site-logos").getPublicUrl(fileName);

    // Cache-buster per forzare il refresh anche se il path resta uguale.
    const logoUrl = `${publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
        .from("sites")
        .update({ logo: logoUrl })
        .eq("id", site.id);
    if (updateError) throw new Error(`Logo update: ${updateError.message}`);

    console.log(`✓ Logo momentum aggiornato: ${logoUrl}`);
}

main().catch((err) => {
    console.error("\n❌ Aggiornamento logo fallito:", err);
    process.exit(1);
});
