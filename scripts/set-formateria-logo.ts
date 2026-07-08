/**
 * Imposta il logo dello spazio "formateria" a partire dall'immagine condivisa
 * "forMateria". Nella sidebar il logo è vincolato a `max-h-10 w-auto object-contain`
 * (altezza max 40px), quindi per farlo stare nello spazio designato lo rendiamo
 * più stretto: rifiliamo i bordi bianchi, lo centriamo su una card bianca con
 * angoli arrotondati e un rapporto larghezza/altezza contenuto.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/set-formateria-logo.ts
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { join } from "path";

const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
const SERVICE_KEY =
    process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUBDOMAIN = "formateria";
const SOURCE_LOGO = join(
    process.cwd(),
    "../.cursor/projects/Users-matteopaolocci-santini-manager/assets/Acquisizione_schermata_08.07.2026_alle_09.35.06-d39f6be5-acd9-4f29-b2ea-8da16d8bed3e.png",
);

/** Rapporto larghezza/altezza finale della card (più basso = logo più stretto). */
const TARGET_RATIO = 3.1;
/** Padding orizzontale come frazione della larghezza del testo. */
const PAD_X_FRAC = 0.06;

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
    if (error || !site) throw new Error(`Sito "${SUBDOMAIN}" non trovato: ${error?.message}`);

    // 1) Rifila i bordi bianchi attorno al testo.
    const trimmed = await sharp(SOURCE_LOGO)
        .trim({ threshold: 10 })
        .toBuffer();
    const tMeta = await sharp(trimmed).metadata();
    const tw = tMeta.width!;
    const th = tMeta.height!;

    // 2) Calcola la card bianca finale.
    const padX = Math.round(tw * PAD_X_FRAC);
    const canvasW = tw + padX * 2;
    const canvasH = Math.max(th + Math.round(th * 0.35), Math.round(canvasW / TARGET_RATIO));
    const radius = Math.round(canvasH * 0.18);

    const roundedBg = Buffer.from(
        `<svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">` +
            `<rect x="0" y="0" width="${canvasW}" height="${canvasH}" rx="${radius}" ry="${radius}" fill="#ffffff"/>` +
            `</svg>`,
    );

    const left = Math.round((canvasW - tw) / 2);
    const top = Math.round((canvasH - th) / 2);

    const buffer = await sharp(roundedBg)
        .composite([{ input: trimmed, left, top }])
        .png()
        .toBuffer();

    console.log(
        `Sorgente rifilata ${tw}x${th} (ratio ${(tw / th).toFixed(2)}) → card ${canvasW}x${canvasH} (ratio ${(canvasW / canvasH).toFixed(2)})`,
    );

    const fileName = `${site.id}/logo-formateria-${Date.now()}.png`;
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

    const { error: updateError } = await supabase
        .from("sites")
        .update({ logo: publicUrl })
        .eq("id", site.id);
    if (updateError) throw new Error(`Logo update: ${updateError.message}`);

    console.log(`✓ Logo formateria aggiornato: ${publicUrl}`);
}

main().catch((err) => {
    console.error("\n❌ Aggiornamento logo fallito:", err);
    process.exit(1);
});
