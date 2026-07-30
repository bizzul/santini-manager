/**
 * Riduce il logo Benicchio aggiungendo padding trasparente verticale: nella sidebar
 * il logo è vincolato a `max-h-10 w-auto object-contain`, quindi aumentando
 * l'altezza del canvas il marchio renderizzato occupa meno spazio orizzontale.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/resize-benicchio-logo.ts
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
const SERVICE_KEY =
    process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUBDOMAIN = "benicchio";

/** Rapporto larghezza/altezza target (più basso = logo più stretto a parità di max-h). */
const TARGET_RATIO = 3.2;

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

    if (!site.logo) {
        throw new Error(`Sito "${SUBDOMAIN}" non ha logo configurato`);
    }

    const response = await fetch(site.logo);
    if (!response.ok) {
        throw new Error(`Download logo fallito: ${response.status}`);
    }

    const sourceBuffer = Buffer.from(await response.arrayBuffer());

    const trimmed = await sharp(sourceBuffer)
        .trim({ threshold: 12 })
        .toBuffer();
    const meta = await sharp(trimmed).metadata();
    const width = meta.width!;
    const height = meta.height!;

    const targetHeight = Math.round(width / TARGET_RATIO);
    const padTotal = Math.max(0, targetHeight - height);
    const padTop = Math.floor(padTotal / 2);
    const padBottom = padTotal - padTop;

    const buffer = await sharp(trimmed)
        .extend({
            top: padTop,
            bottom: padBottom,
            left: 0,
            right: 0,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();

    console.log(
        `Originale ${width}x${height} (ratio ${(width / height).toFixed(2)}) → ${width}x${height + padTotal} (ratio ${TARGET_RATIO})`,
    );

    const fileName = `${site.id}/logo-fit-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
        .from("site-logos")
        .upload(fileName, buffer, {
            contentType: "image/png",
            cacheControl: "3600",
            upsert: true,
        });

    if (uploadError) {
        throw new Error(`Logo upload: ${uploadError.message}`);
    }

    const {
        data: { publicUrl },
    } = supabase.storage.from("site-logos").getPublicUrl(fileName);

    const { error: updateError } = await supabase
        .from("sites")
        .update({ logo: publicUrl })
        .eq("id", site.id);

    if (updateError) {
        throw new Error(`Logo update: ${updateError.message}`);
    }

    console.log(`✓ Logo Benicchio aggiornato: ${publicUrl}`);
}

main().catch((err) => {
    console.error("\n❌ Ridimensionamento fallito:", err);
    process.exit(1);
});
