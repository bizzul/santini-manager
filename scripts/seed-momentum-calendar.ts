/**
 * Popola il calendario Momentum con 4 eventi al mese (48/anno) per l'anno
 * corrente, con nomi/tipologie ispirati al profilo Instagram (Lake Festival/
 * Sound, Rooftop, Alpe Day Dance, Sante, Apres Ski, Domenica, Live, ...).
 *
 * Riusa clienti e location gia presenti nello spazio momentum (assegnazione
 * round-robin) e imposta lat/lng dalla location per la mappa.
 *
 * Idempotente: salta eventi gia presenti (match per titolo).
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-momentum-calendar.ts
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
const SERVICE_KEY =
    process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUBDOMAIN = "momentum";
const YEAR = new Date().getFullYear();
const DAYS = [7, 14, 21, 28];

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing Supabase env vars. Run with --env-file=.env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

type Tipo = "pvt" | "public";

// 12 mesi x 4 eventi. Nomi distinti da quelli del seed demo esistente.
const PROGRAM: Array<Array<{ titolo: string; tipo: Tipo }>> = [
    // Gennaio
    [
        { titolo: "Apres Ski Opening", tipo: "public" },
        { titolo: "Snow Club Night", tipo: "public" },
        { titolo: "Fondue & DJ Set", tipo: "pvt" },
        { titolo: "Winter Warmup", tipo: "public" },
    ],
    // Febbraio
    [
        { titolo: "Carnevale Beats", tipo: "public" },
        { titolo: "Apres Ski Sessions", tipo: "public" },
        { titolo: "San Valentino Rooftop", tipo: "pvt" },
        { titolo: "Alpe Winter Rave", tipo: "public" },
    ],
    // Marzo
    [
        { titolo: "Spring Kickoff", tipo: "public" },
        { titolo: "Live Music Night (Marzo)", tipo: "public" },
        { titolo: "Private Birthday Bash", tipo: "pvt" },
        { titolo: "Sunday Sunset #1", tipo: "public" },
    ],
    // Aprile
    [
        { titolo: "Alpe Day Dance", tipo: "public" },
        { titolo: "Rooftop Opening Party", tipo: "public" },
        { titolo: "Sante Aperitivo", tipo: "public" },
        { titolo: "Corporate Spring Event", tipo: "pvt" },
    ],
    // Maggio
    [
        { titolo: "Lake Opening Festival", tipo: "public" },
        { titolo: "Domenica Lakeside", tipo: "public" },
        { titolo: "Vernissage Art & DJ", tipo: "pvt" },
        { titolo: "Sante Sunset", tipo: "public" },
    ],
    // Giugno
    [
        { titolo: "Lake Festival", tipo: "public" },
        { titolo: "Lake Sound", tipo: "public" },
        { titolo: "Rooftop Sunset Session", tipo: "pvt" },
        { titolo: "Open Air Locarno", tipo: "public" },
    ],
    // Luglio
    [
        { titolo: "Lake Festival Night 2", tipo: "public" },
        { titolo: "Beach Club Night", tipo: "public" },
        { titolo: "Matrimonio Lakeside", tipo: "pvt" },
        { titolo: "Notte Bianca Estiva", tipo: "public" },
    ],
    // Agosto
    [
        { titolo: "Sunset Sessions", tipo: "public" },
        { titolo: "Ferragosto Open Air", tipo: "public" },
        { titolo: "Rooftop Aperitivo Sunset", tipo: "pvt" },
        { titolo: "Alpe Sound", tipo: "public" },
    ],
    // Settembre
    [
        { titolo: "Vendemmia DJ Set", tipo: "public" },
        { titolo: "Harvest Party", tipo: "public" },
        { titolo: "Corporate Autumn Gala", tipo: "pvt" },
        { titolo: "Festival Warmup", tipo: "public" },
    ],
    // Ottobre
    [
        { titolo: "Indoor Club Night", tipo: "public" },
        { titolo: "Live Session Autumn", tipo: "public" },
        { titolo: "Halloween Rave", tipo: "public" },
        { titolo: "Private Anniversary", tipo: "pvt" },
    ],
    // Novembre
    [
        { titolo: "Autumn Rooftop", tipo: "public" },
        { titolo: "Live Music Night (Novembre)", tipo: "public" },
        { titolo: "Apres Work Session", tipo: "pvt" },
        { titolo: "Winter Preview", tipo: "public" },
    ],
    // Dicembre
    [
        { titolo: "Christmas Market Live", tipo: "public" },
        { titolo: "NYE Warehouse Party", tipo: "public" },
        { titolo: "Winter Gala", tipo: "pvt" },
        { titolo: "Apres Ski Return", tipo: "public" },
    ],
];

function statoPlanFor(dateStr: string): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr);
    const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
    if (diff < 0) return "finish";
    if (diff <= 30) return "confirmed";
    if (diff <= 60) return "planned";
    if (diff <= 90) return "planning";
    return "to_plan";
}

async function main() {
    console.log(`📅 Seed calendario Momentum ${YEAR} (4 eventi/mese)\n`);

    const { data: site, error } = await supabase
        .from("sites")
        .select("id")
        .eq("subdomain", SUBDOMAIN)
        .single();
    if (error || !site) throw new Error(`Sito "${SUBDOMAIN}" non trovato`);
    const siteId = site.id;

    const { data: locations } = await supabase
        .from("ev_location")
        .select("id, lat, lng")
        .eq("site_id", siteId)
        .is("deleted_at", null);
    const { data: clienti } = await supabase
        .from("ev_clienti")
        .select("id")
        .eq("site_id", siteId)
        .is("deleted_at", null);

    if (!locations?.length || !clienti?.length) {
        throw new Error("Mancano location o clienti: esegui prima seed-momentum.ts");
    }

    let created = 0;
    let skipped = 0;
    let rr = 0;

    for (let month = 0; month < 12; month++) {
        const events = PROGRAM[month];
        for (let i = 0; i < events.length; i++) {
            const ev = events[i];
            const loc = locations[rr % locations.length];
            const cli = clienti[rr % clienti.length];
            rr++;

            const day = DAYS[i % DAYS.length];
            const dateStr = `${YEAR}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

            const { data: existing } = await supabase
                .from("ev_eventi")
                .select("id")
                .eq("site_id", siteId)
                .eq("titolo", ev.titolo)
                .maybeSingle();
            if (existing) {
                skipped++;
                continue;
            }

            const budget = 3000 + ((rr * 700) % 12000);
            const ricavo = Math.round(budget * (1.3 + ((rr % 5) * 0.1)));

            const { error: insErr } = await supabase.from("ev_eventi").insert({
                site_id: siteId,
                cliente_id: cli.id,
                location_id: loc.id,
                titolo: ev.titolo,
                tipo_evento: ev.tipo,
                categoria_prodotto: ev.tipo === "pvt" ? "pvt_event" : "public_event",
                stato_plan: statoPlanFor(dateStr),
                data_evento: dateStr,
                lat: loc.lat,
                lng: loc.lng,
                budget_previsto: budget,
                ricavo_previsto: ricavo,
            });
            if (insErr) throw new Error(`Evento "${ev.titolo}": ${insErr.message}`);
            created++;
        }
    }

    console.log(`✓ Creati ${created} eventi, saltati ${skipped} (gia presenti)`);
    console.log("\n✅ Calendario Momentum popolato.");
}

main().catch((e) => {
    console.error("\n❌", e);
    process.exit(1);
});
