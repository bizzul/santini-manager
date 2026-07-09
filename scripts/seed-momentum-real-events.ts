/**
 * Aggiunge 5 eventi reali al modulo Momentum (si sommano ai 10 demo -> 15).
 * Inoltre crea il fornitore riutilizzabile "Volo Brandizzato" e lo collega
 * agli eventi con volo_brandizzato = true.
 *
 * Prerequisito: migration 20260709003000_momentum_event_addons.sql applicata
 * (campi senza_data, volo_brandizzato, immagine_url su ev_eventi).
 *
 * Idempotente: match per nome/titolo.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-momentum-real-events.ts
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
const SERVICE_KEY =
    process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUBDOMAIN = "momentum";

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing Supabase env vars. Run with --env-file=.env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function addDays(days: number): string {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

async function getOrCreate(
    table: string,
    nameCol: string,
    nameVal: string,
    siteId: string,
    insertObj: Record<string, unknown>
): Promise<string> {
    const { data: existing } = await supabase
        .from(table)
        .select("id")
        .eq("site_id", siteId)
        .eq(nameCol, nameVal)
        .maybeSingle();
    if (existing) return existing.id;
    const { data, error } = await supabase
        .from(table)
        .insert({ ...insertObj, site_id: siteId })
        .select("id")
        .single();
    if (error || !data) throw new Error(`${table} "${nameVal}": ${error?.message}`);
    return data.id;
}

interface EventoDef {
    titolo: string;
    tipo: "pvt" | "public";
    stato_plan: string;
    data_evento: string | null;
    senza_data?: boolean;
    volo_brandizzato?: boolean;
    ora_inizio?: string;
    ora_fine?: string;
    lat: number;
    lng: number;
    locationNome: string;
    clienteNome: string;
    budget: number;
    ricavo: number;
    note: string;
    immagine: string;
    fornitori: Array<{ nome: string; ruolo: string; stato: string }>;
    tasks: Array<{ titolo: string; stato: string }>;
}

async function main() {
    console.log("🎫 Seed 5 eventi reali Momentum\n");

    const { data: site, error } = await supabase
        .from("sites")
        .select("id")
        .eq("subdomain", SUBDOMAIN)
        .single();
    if (error || !site) throw new Error(`Sito "${SUBDOMAIN}" non trovato`);
    const siteId = site.id;

    // --- Fornitore riutilizzabile: Volo Brandizzato ---
    const voloFornId = await getOrCreate(
        "ev_fornitori",
        "nome",
        "Volo Brandizzato (Parapendio + Drone)",
        siteId,
        {
            nome: "Volo Brandizzato (Parapendio + Drone)",
            categoria: "marketing",
            note: "Add-on ricorrente: volo parapendio con banner sponsor stampabile in ~10 min + riprese drone (Jimi). Produce video aerei per social.",
            costo_indicativo: 400,
        }
    );
    console.log("✓ Fornitore Volo Brandizzato");

    // --- Location nuove (get-or-create) ---
    const locCatamarano = await getOrCreate("ev_location", "nome", "Catamarano (Coste Croate)", siteId, { nome: "Catamarano (Coste Croate)", citta: "Spalato (HR)", lat: 43.508, lng: 16.44, note_logistiche: "Party itinerante su catamarano, fine stagione." });
    const locLac = await getOrCreate("ev_location", "nome", "LAC Lugano", siteId, { nome: "LAC Lugano", citta: "Lugano", lat: 46.003, lng: 8.955, note_logistiche: "Corte interna, no piscina. In trattativa." });
    const locCari = await getOrCreate("ev_location", "nome", "Cari (alta quota)", siteId, { nome: "Cari (alta quota)", citta: "Faido", capienza: 150, lat: 46.462, lng: 8.9, note_logistiche: "Rifugio d'alta quota, dipende dalla neve." });
    const locBiz = await getOrCreate("ev_location", "nome", "Galleria Business Center", siteId, { nome: "Galleria Business Center", citta: "Giubiasco", capienza: 1500, lat: 46.18, lng: 9.01, note_logistiche: "Spazio privato, orari fino alle 05:00." });
    // Lungolago Locarno gia presente dal seed base
    const { data: locLoc } = await supabase.from("ev_location").select("id").eq("site_id", siteId).eq("nome", "Lungolago Locarno").maybeSingle();
    const locLungolago = locLoc?.id ?? locLac;

    // --- Mappa nomi -> id di clienti e fornitori esistenti ---
    const { data: clienti } = await supabase.from("ev_clienti").select("id, nome").eq("site_id", siteId);
    const cliByNome = new Map((clienti || []).map((c) => [c.nome, c.id]));
    const { data: fornitori } = await supabase.from("ev_fornitori").select("id, nome").eq("site_id", siteId);
    const fornByNome = new Map((fornitori || []).map((f) => [f.nome, f.id]));

    const locByEvento: Record<string, string> = {
        "DJ Set Riva al Lago": locLungolago,
        "Party su Catamarano": locCatamarano,
        "Aperitivo by La Mano": locLac,
        "DJ Set Montagna / Neve": locCari,
        "Halloween Adventure": locBiz,
    };

    const EVENTI: EventoDef[] = [
        {
            titolo: "DJ Set Riva al Lago",
            tipo: "public",
            stato_plan: "confirmed",
            data_evento: addDays(24),
            volo_brandizzato: true,
            ora_inizio: "14:00",
            ora_fine: "02:00",
            lat: 46.16,
            lng: 8.8,
            locationNome: "Lungolago Locarno",
            clienteNome: "Comune di Bellinzona",
            budget: 12000,
            ricavo: 15000,
            note: "Free entry. Bar + griglia + posteggi tutto il giorno. Target 300-400 pax, stima ~400. Format nuovo.",
            immagine: "/momentum/events/dj-lago.png",
            fornitori: [
                { nome: "DJ Luma", ruolo: "DJ set", stato: "confermato" },
                { nome: "Catering Sapori Ticino", ruolo: "Griglia", stato: "in_trattativa" },
                { nome: "Mobile Bar Spritz&Co", ruolo: "Bar", stato: "confermato" },
                { nome: "AudioLuci Service SA", ruolo: "Service audio", stato: "confermato" },
            ],
            tasks: [
                { titolo: "Permesso free entry + SUISA", stato: "in_corso" },
                { titolo: "Gestione posteggi", stato: "da_fare" },
                { titolo: "Conferma griglia", stato: "in_attesa_terzi" },
            ],
        },
        {
            titolo: "Party su Catamarano",
            tipo: "public",
            stato_plan: "to_plan",
            data_evento: null,
            senza_data: true,
            lat: 43.508,
            lng: 16.44,
            locationNome: "Catamarano (Coste Croate)",
            clienteNome: "Spazio Arte Mendrisio",
            budget: 20000,
            ricavo: 24000,
            note: "Evento flottante senza data fissa. Si attiva con data + minimo pax. Target giovani sport+festa, prezzo accessibile. Margine min 20% + copertura costi (org + Yan). Periodo: fine set-ott.",
            immagine: "/momentum/events/catamarano.png",
            fornitori: [
                { nome: "DJ Nero", ruolo: "DJ residente", stato: "da_contattare" },
                { nome: "Location Partner Lugano", ruolo: "Noleggio catamarano", stato: "da_contattare" },
            ],
            tasks: [
                { titolo: "Definire data + minimo pax", stato: "da_fare" },
                { titolo: "Preventivo noleggio catamarano", stato: "da_fare" },
            ],
        },
        {
            titolo: "Aperitivo by La Mano",
            tipo: "public",
            stato_plan: "planning",
            data_evento: "2026-07-25",
            lat: 46.003,
            lng: 8.955,
            locationNome: "LAC Lugano",
            clienteNome: "Delta SA",
            budget: 6000,
            ricavo: 9000,
            note: "Aperitivo by La Mano. Luglio, data TBD. Trattativa LAC (corte, no piscina) + Dorin. Preferenza location vicino acqua.",
            immagine: "/momentum/events/aperitivo-sante.png",
            fornitori: [
                { nome: "Mobile Bar Spritz&Co", ruolo: "Aperitivo/bar", stato: "in_trattativa" },
                { nome: "Location Partner Lugano", ruolo: "Location (LAC/Dorin)", stato: "in_trattativa" },
                { nome: "Social Studio TI", ruolo: "Comunicazione", stato: "confermato" },
            ],
            tasks: [
                { titolo: "Chiudere trattativa LAC vs Dorin", stato: "in_corso" },
                { titolo: "Fissare data luglio", stato: "da_fare" },
            ],
        },
        {
            titolo: "DJ Set Montagna / Neve",
            tipo: "pvt",
            stato_plan: "to_plan",
            data_evento: "2026-12-27",
            volo_brandizzato: true,
            lat: 46.462,
            lng: 8.9,
            locationNome: "Cari (alta quota)",
            clienteNome: "Marco Bernasconi",
            budget: 18000,
            ricavo: 30000,
            note: "DJ set alta quota esclusivo, 100-150 pax. Giochi sulla neve (slittata chiaro di luna). Target 30-50 anni medio-alto spendenti + famiglie, programma kids. Aggancio progetto Cari. Periodo: vacanze Natale, dipende da neve.",
            immagine: "/momentum/events/dj-montagna.png",
            fornitori: [
                { nome: "DJ Luma", ruolo: "DJ set alta quota", stato: "da_contattare" },
                { nome: "Location Partner Lugano", ruolo: "Rifugio/quota Cari", stato: "in_trattativa" },
                { nome: "Catering Sapori Ticino", ruolo: "Food montagna", stato: "da_contattare" },
                { nome: "Mobile Bar Spritz&Co", ruolo: "Bar", stato: "da_contattare" },
                { nome: "SecurEvent Sagl", ruolo: "Staff & sicurezza", stato: "da_contattare" },
            ],
            tasks: [
                { titolo: "Verifica neve + fattibilita", stato: "da_fare" },
                { titolo: "Programma kids", stato: "da_fare" },
                { titolo: "Aggancio progetto Cari", stato: "in_corso" },
            ],
        },
        {
            titolo: "Halloween Adventure",
            tipo: "public",
            stato_plan: "planning",
            data_evento: "2026-10-31",
            ora_fine: "05:00",
            lat: 46.18,
            lng: 9.01,
            locationNome: "Galleria Business Center",
            clienteNome: "Spazio Arte Mendrisio",
            budget: 22000,
            ricavo: 40000,
            note: "Halloween Adventure. Galleria business center, spazio privato, 1000-1500 pax, fino alle 05:00.",
            immagine: "/momentum/events/halloween.png",
            fornitori: [
                { nome: "DJ Nero", ruolo: "Main DJ", stato: "in_trattativa" },
                { nome: "AudioLuci Service SA", ruolo: "Allestimento scenografico Halloween", stato: "in_trattativa" },
                { nome: "SecurEvent Sagl", ruolo: "Sicurezza (1000+ pax)", stato: "confermato" },
                { nome: "Catering Sapori Ticino", ruolo: "Food", stato: "da_contattare" },
                { nome: "Mobile Bar Spritz&Co", ruolo: "Bar", stato: "da_contattare" },
            ],
            tasks: [
                { titolo: "Piano sicurezza 1000+ pax", stato: "in_corso" },
                { titolo: "Allestimento scenografico", stato: "da_fare" },
                { titolo: "Autorizzazione orari (05:00)", stato: "in_attesa_terzi" },
            ],
        },
    ];

    let created = 0;
    for (const ev of EVENTI) {
        const clienteId = cliByNome.get(ev.clienteNome) ?? null;
        const locationId = locByEvento[ev.titolo] ?? null;

        // get-or-create evento by titolo
        const { data: existing } = await supabase
            .from("ev_eventi")
            .select("id")
            .eq("site_id", siteId)
            .eq("titolo", ev.titolo)
            .maybeSingle();

        let eventoId: string;
        if (existing) {
            eventoId = existing.id;
            // aggiorna i campi add-on anche se l'evento esiste gia
            await supabase
                .from("ev_eventi")
                .update({
                    senza_data: ev.senza_data ?? false,
                    volo_brandizzato: ev.volo_brandizzato ?? false,
                    immagine_url: ev.immagine,
                })
                .eq("id", eventoId);
        } else {
            const { data: ins, error: insErr } = await supabase
                .from("ev_eventi")
                .insert({
                    site_id: siteId,
                    cliente_id: clienteId,
                    location_id: locationId,
                    titolo: ev.titolo,
                    tipo_evento: ev.tipo,
                    categoria_prodotto: ev.tipo === "pvt" ? "pvt_event" : "public_event",
                    stato_plan: ev.stato_plan,
                    data_evento: ev.data_evento,
                    senza_data: ev.senza_data ?? false,
                    volo_brandizzato: ev.volo_brandizzato ?? false,
                    ora_inizio: ev.ora_inizio ?? null,
                    ora_fine: ev.ora_fine ?? null,
                    lat: ev.lat,
                    lng: ev.lng,
                    budget_previsto: ev.budget,
                    ricavo_previsto: ev.ricavo,
                    note: ev.note,
                    immagine_url: ev.immagine,
                })
                .select("id")
                .single();
            if (insErr || !ins) throw new Error(`Evento "${ev.titolo}": ${insErr?.message}`);
            eventoId = ins.id;
            created++;
        }

        // Fornitori
        const { data: links } = await supabase
            .from("ev_eventi_fornitori")
            .select("fornitore_id")
            .eq("site_id", siteId)
            .eq("evento_id", eventoId);
        const linked = new Set((links || []).map((l) => l.fornitore_id));

        const toLink = [...ev.fornitori];
        if (ev.volo_brandizzato) {
            toLink.push({
                nome: "Volo Brandizzato (Parapendio + Drone)",
                ruolo: "Volo brandizzato + riprese aeree",
                stato: "da_contattare",
            });
        }
        for (const f of toLink) {
            const fid = f.nome === "Volo Brandizzato (Parapendio + Drone)" ? voloFornId : fornByNome.get(f.nome);
            if (!fid || linked.has(fid)) continue;
            await supabase.from("ev_eventi_fornitori").insert({
                site_id: siteId,
                evento_id: eventoId,
                fornitore_id: fid,
                ruolo: f.ruolo,
                stato_ingaggio: f.stato,
            });
        }

        // Task (solo se assenti)
        const { data: exTasks } = await supabase
            .from("ev_eventi_task")
            .select("id")
            .eq("site_id", siteId)
            .eq("evento_id", eventoId)
            .limit(1);
        if (!exTasks || exTasks.length === 0) {
            for (const t of ev.tasks) {
                await supabase.from("ev_eventi_task").insert({
                    site_id: siteId,
                    evento_id: eventoId,
                    titolo: t.titolo,
                    stato: t.stato,
                });
            }
        }

        console.log(`✓ ${ev.titolo}${ev.senza_data ? " (senza data)" : ""}${ev.volo_brandizzato ? " [volo]" : ""}`);
    }

    console.log(`\n✅ Eventi reali: ${created} creati (${EVENTI.length - created} aggiornati).`);
}

main().catch((e) => {
    console.error("\n❌", e);
    process.exit(1);
});
