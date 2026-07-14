/**
 * Popola lo spazio "graf" (Car Detailing by Graf) con progetti realistici,
 * distribuiti in tutte le kanban del sito e nelle rispettive colonne:
 *
 *   24 "A. Pulizia":  To Do(57) · Pulizia(54) · Ultimata(56) · Consegnata(55)
 *   25 "B. PPF":      To Do(60) · Elaborazione(58) · Ultimata(59) · Consegna(61)
 *   28 "C. Gomme":    To Do(70) · Lift(68) · Ultimato(69) · Consegna(71)
 *   27 "1. Offerte":  To Do(67) · Elaborazione(62) · Inviata(63) ·
 *                     Trattativa(64) · Vinta(65) · Persa(66)
 *
 * Crea/riusa i clienti minimali referenziati dai progetti.
 * Idempotente: salta i Task con `unique_code` già presente.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-graf-projects.ts
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

const SUBDOMAIN = "graf";

// Board id -> colonne (id reali su graf)
const BOARD = {
    pulizia: 24,
    ppf: 25,
    gomme: 28,
    offerte: 27,
} as const;

const COL = {
    // A. Pulizia (24)
    pul_todo: 57,
    pul_lavoro: 54,
    pul_ultimata: 56,
    pul_consegnata: 55,
    // B. PPF (25)
    ppf_todo: 60,
    ppf_elaborazione: 58,
    ppf_ultimata: 59,
    ppf_consegna: 61,
    // C. Gomme (28)
    gom_todo: 70,
    gom_lift: 68,
    gom_ultimato: 69,
    gom_consegna: 71,
    // 1. Offerte (27)
    off_todo: 67,
    off_elaborazione: 62,
    off_inviata: 63,
    off_trattativa: 64,
    off_vinta: 65,
    off_persa: 66,
} as const;

interface ClientDef {
    name: string;
    type: "INDIVIDUAL" | "BUSINESS";
    city: string;
    zip: number;
}

interface ProjectDef {
    code: string;
    board: number;
    column: number;
    name: string;
    client: string; // deve combaciare con ClientDef.name
    sellPrice: number;
    percent: number;
    deliveryOffsetDays: number; // rispetto ad oggi (negativo = passato)
    positions: string[];
    note?: string;
}

const CLIENTS: ClientDef[] = [
    { name: "Sig. Luca Bernasconi", type: "INDIVIDUAL", city: "Lugano", zip: 6900 },
    { name: "Sig.ra Elena Rossi", type: "INDIVIDUAL", city: "Massagno", zip: 6900 },
    { name: "Sig. Marco Fumagalli", type: "INDIVIDUAL", city: "Bellinzona", zip: 6500 },
    { name: "Sig. Andrea Conti", type: "INDIVIDUAL", city: "Locarno", zip: 6600 },
    { name: "Sig.ra Sara Manzoni", type: "INDIVIDUAL", city: "Chiasso", zip: 6830 },
    { name: "Sig. Davide Realini", type: "INDIVIDUAL", city: "Mendrisio", zip: 6850 },
    { name: "Sig. Nicola Ferrari", type: "INDIVIDUAL", city: "Paradiso", zip: 6900 },
    { name: "Sig.ra Giulia Pedrazzini", type: "INDIVIDUAL", city: "Agno", zip: 6982 },
    { name: "Garage Sportivo Lugano SA", type: "BUSINESS", city: "Pregassona", zip: 6963 },
    { name: "Autonoleggio Ceresio Sagl", type: "BUSINESS", city: "Lugano", zip: 6900 },
    { name: "Flotta Ticino Rent SA", type: "BUSINESS", city: "Manno", zip: 6928 },
    { name: "Concessionaria Alpina SA", type: "BUSINESS", city: "Bioggio", zip: 6934 },
];

const PROJECTS: ProjectDef[] = [
    // ---- A. Pulizia (24) ----
    { code: "26-DTL-001", board: BOARD.pulizia, column: COL.pul_todo, name: "Detailing interni completo — Audi A4", client: "Sig. Luca Bernasconi", sellPrice: 320, percent: 5, deliveryOffsetDays: 9, positions: ["Aspirazione", "Igienizzazione ozono", "Trattamento pelle"] },
    { code: "26-DTL-002", board: BOARD.pulizia, column: COL.pul_lavoro, name: "Lavaggio a mano premium — BMW Serie 3", client: "Sig.ra Elena Rossi", sellPrice: 180, percent: 45, deliveryOffsetDays: 2, positions: ["Prelavaggio", "Lavaggio a mano", "Asciugatura"] },
    { code: "26-DTL-003", board: BOARD.pulizia, column: COL.pul_lavoro, name: "Pulizia motore + sottoscocca — VW Golf", client: "Sig. Marco Fumagalli", sellPrice: 150, percent: 50, deliveryOffsetDays: 1, positions: ["Sgrassaggio motore", "Lavaggio sottoscocca"] },
    { code: "26-DTL-004", board: BOARD.pulizia, column: COL.pul_ultimata, name: "Sanificazione full — Mercedes GLC", client: "Autonoleggio Ceresio Sagl", sellPrice: 240, percent: 95, deliveryOffsetDays: -1, positions: ["Igienizzazione", "Trattamento tessuti"] },
    { code: "26-DTL-005", board: BOARD.pulizia, column: COL.pul_consegnata, name: "Detailing consegna auto usata — Fiat 500", client: "Sig. Andrea Conti", sellPrice: 210, percent: 100, deliveryOffsetDays: -5, positions: ["Detailing completo", "Lucidatura fari"] },

    // ---- B. PPF (25) ----
    { code: "26-PPF-001", board: BOARD.ppf, column: COL.ppf_todo, name: "PPF anteriore parziale — Tesla Model 3", client: "Sig.ra Sara Manzoni", sellPrice: 1200, percent: 5, deliveryOffsetDays: 14, positions: ["Cofano", "Paraurti anteriore", "Specchietti"] },
    { code: "26-PPF-002", board: BOARD.ppf, column: COL.ppf_elaborazione, name: "PPF full body — Porsche 911", client: "Sig. Nicola Ferrari", sellPrice: 6800, percent: 55, deliveryOffsetDays: 6, positions: ["Rivestimento integrale", "Bordi porte", "Soglie"] },
    { code: "26-PPF-003", board: BOARD.ppf, column: COL.ppf_elaborazione, name: "Coating ceramico 9H — Range Rover", client: "Concessionaria Alpina SA", sellPrice: 950, percent: 40, deliveryOffsetDays: 4, positions: ["Preparazione", "Applicazione coating"] },
    { code: "26-PPF-004", board: BOARD.ppf, column: COL.ppf_ultimata, name: "PPF cofano + tetto — BMW M4", client: "Garage Sportivo Lugano SA", sellPrice: 1600, percent: 95, deliveryOffsetDays: -2, positions: ["Cofano", "Tetto"] },
    { code: "26-PPF-005", board: BOARD.ppf, column: COL.ppf_consegna, name: "PPF full front — Audi RS6", client: "Sig. Davide Realini", sellPrice: 2100, percent: 100, deliveryOffsetDays: -6, positions: ["Full front", "Fari"] },

    // ---- C. Gomme (28) ----
    { code: "26-GOM-001", board: BOARD.gomme, column: COL.gom_todo, name: "Cambio gomme stagionale — Skoda Octavia", client: "Sig. Marco Fumagalli", sellPrice: 90, percent: 5, deliveryOffsetDays: 7, positions: ["Smontaggio", "Montaggio invernali", "Equilibratura"] },
    { code: "26-GOM-002", board: BOARD.gomme, column: COL.gom_todo, name: "Set 4 pneumatici nuovi — VW Tiguan", client: "Flotta Ticino Rent SA", sellPrice: 780, percent: 10, deliveryOffsetDays: 10, positions: ["Fornitura pneumatici", "Montaggio", "Equilibratura"] },
    { code: "26-GOM-003", board: BOARD.gomme, column: COL.gom_lift, name: "Equilibratura + convergenza — BMW X5", client: "Sig. Luca Bernasconi", sellPrice: 160, percent: 50, deliveryOffsetDays: 1, positions: ["Equilibratura", "Assetto convergenza"] },
    { code: "26-GOM-004", board: BOARD.gomme, column: COL.gom_ultimato, name: "Cambio + deposito gomme — Mercedes Classe A", client: "Sig.ra Giulia Pedrazzini", sellPrice: 120, percent: 95, deliveryOffsetDays: -1, positions: ["Cambio gomme", "Deposito stagionale"] },
    { code: "26-GOM-005", board: BOARD.gomme, column: COL.gom_consegna, name: "Riparazione foratura + revisione — Fiat Panda", client: "Sig. Andrea Conti", sellPrice: 60, percent: 100, deliveryOffsetDays: -4, positions: ["Riparazione foratura", "Controllo pressioni"] },

    // ---- 1. Offerte (27) ----
    { code: "26-OFF-101", board: BOARD.offerte, column: COL.off_todo, name: "Preventivo detailing flotta (8 veicoli)", client: "Flotta Ticino Rent SA", sellPrice: 1900, percent: 5, deliveryOffsetDays: 20, positions: ["Detailing 8 veicoli"], note: "Richiesta preventivo per flotta aziendale" },
    { code: "26-OFF-102", board: BOARD.offerte, column: COL.off_todo, name: "Preventivo PPF full body — Lamborghini Urus", client: "Sig. Nicola Ferrari", sellPrice: 8500, percent: 5, deliveryOffsetDays: 25, positions: ["PPF integrale"] },
    { code: "26-OFF-103", board: BOARD.offerte, column: COL.off_elaborazione, name: "Preventivo coating + interni — Audi Q7", client: "Concessionaria Alpina SA", sellPrice: 1350, percent: 30, deliveryOffsetDays: 12, positions: ["Coating ceramico", "Detailing interni"] },
    { code: "26-OFF-104", board: BOARD.offerte, column: COL.off_inviata, name: "Offerta lavaggi mensili — Autonoleggio", client: "Autonoleggio Ceresio Sagl", sellPrice: 2400, percent: 40, deliveryOffsetDays: 8, positions: ["Abbonamento lavaggi 12 mesi"] },
    { code: "26-OFF-105", board: BOARD.offerte, column: COL.off_inviata, name: "Offerta PPF anteriore — Porsche Macan", client: "Garage Sportivo Lugano SA", sellPrice: 1500, percent: 40, deliveryOffsetDays: 8, positions: ["PPF anteriore"] },
    { code: "26-OFF-106", board: BOARD.offerte, column: COL.off_trattativa, name: "Trattativa detailing + coating — Tesla Model S", client: "Sig.ra Sara Manzoni", sellPrice: 1750, percent: 65, deliveryOffsetDays: 5, positions: ["Detailing completo", "Coating ceramico"], note: "In attesa conferma cliente sul pacchetto coating" },
    { code: "26-OFF-107", board: BOARD.offerte, column: COL.off_vinta, name: "Pacchetto detailing premium — Mercedes AMG GT", client: "Sig. Davide Realini", sellPrice: 2200, percent: 100, deliveryOffsetDays: -3, positions: ["Detailing premium", "Coating", "PPF fari"] },
    { code: "26-OFF-108", board: BOARD.offerte, column: COL.off_persa, name: "Offerta PPF full body — BMW iX", client: "Sig.ra Elena Rossi", sellPrice: 5200, percent: 100, deliveryOffsetDays: -7, positions: ["PPF integrale"], note: "Persa: cliente ha scelto un preventivo concorrente" },
];

function isoFromOffset(days: number): string {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return d.toISOString();
}

async function main() {
    console.log("🧽 Inserimento progetti graf (Car Detailing by Graf)\n");

    const { data: site, error: siteError } = await supabase
        .from("sites")
        .select("id, organization_id")
        .eq("subdomain", SUBDOMAIN)
        .single();
    if (siteError || !site) {
        throw new Error(`Sito "${SUBDOMAIN}" non trovato: ${siteError?.message}`);
    }
    const siteId = site.id as string;
    const organizationId = site.organization_id as string;

    // --- Clienti: riusa per nome, altrimenti crea minimale ---
    const { data: existingClients } = await supabase
        .from("Client")
        .select("id, businessName, individualFirstName, individualLastName")
        .eq("site_id", siteId);

    const clientIdByName = new Map<string, number>();
    for (const c of existingClients || []) {
        const business = (c.businessName || "").trim().toLowerCase();
        if (business) clientIdByName.set(business, c.id);
        const individual = [c.individualFirstName, c.individualLastName]
            .filter(Boolean)
            .join(" ")
            .trim()
            .toLowerCase();
        if (individual) clientIdByName.set(individual, c.id);
    }

    let clientSeq = 1;
    async function resolveClient(def: ClientDef): Promise<number> {
        // chiave di lookup: per business il nome, per individual nome+cognome senza titolo
        const bare = def.name.replace(/^Sig\.ra\s+|^Sig\.\s+/i, "").trim();
        const key = bare.toLowerCase();
        if (clientIdByName.has(key)) return clientIdByName.get(key)!;

        let code = "";
        for (;;) {
            code = `GRAF-C${String(clientSeq).padStart(2, "0")}`;
            clientSeq++;
            const { data: dup } = await supabase
                .from("Client")
                .select("id")
                .eq("site_id", siteId)
                .eq("code", code)
                .maybeSingle();
            if (!dup) break;
        }

        const isIndividual = def.type === "INDIVIDUAL";
        const title = /^Sig\.ra/i.test(def.name)
            ? "Sig.ra"
            : /^Sig\./i.test(def.name)
              ? "Sig."
              : "";
        const [firstName, ...rest] = bare.split(" ");
        const lastName = rest.join(" ");

        const { data: created, error } = await supabase
            .from("Client")
            .insert({
                clientType: def.type,
                clientLanguage: "Italiano",
                individualTitle: isIndividual ? title : "",
                individualFirstName: isIndividual ? firstName : "",
                individualLastName: isIndividual ? lastName : "",
                businessName: isIndividual ? "" : def.name,
                countryCode: "CH",
                city: def.city,
                zipCode: def.zip,
                code,
                organization_id: organizationId,
                site_id: siteId,
                contactPeople: [],
            })
            .select("id")
            .single();
        if (error || !created) throw new Error(`Client ${def.name}: ${error?.message}`);
        clientIdByName.set(key, created.id);
        console.log(`  + cliente: ${def.name} (${code})`);
        return created.id;
    }

    const clientDefByName = new Map(CLIENTS.map((c) => [c.name, c]));

    // Posizione corrente per colonna (per accodare senza sovrapporsi)
    const { data: existingTasks } = await supabase
        .from("Task")
        .select("kanbanColumnId, column_position")
        .eq("site_id", siteId);
    const posByColumn = new Map<number, number>();
    for (const t of existingTasks || []) {
        const col = t.kanbanColumnId as number;
        const pos = (t.column_position as number) || 0;
        posByColumn.set(col, Math.max(posByColumn.get(col) || 0, pos));
    }

    let created = 0;
    let skipped = 0;

    for (const p of PROJECTS) {
        const { data: existing } = await supabase
            .from("Task")
            .select("id")
            .eq("site_id", siteId)
            .eq("unique_code", p.code)
            .maybeSingle();
        if (existing) {
            skipped++;
            console.log(`  = già presente: ${p.code}`);
            continue;
        }

        const def = clientDefByName.get(p.client);
        if (!def) throw new Error(`Cliente non definito: ${p.client}`);
        const clientId = await resolveClient(def);

        const nextPos = (posByColumn.get(p.column) || 0) + 1;
        posByColumn.set(p.column, nextPos);

        const { error } = await supabase.from("Task").insert({
            site_id: siteId,
            unique_code: p.code,
            title: p.name,
            name: p.name,
            task_type: "LAVORO",
            display_mode: "normal",
            clientId,
            kanbanId: p.board,
            kanbanColumnId: p.column,
            column_id: p.column,
            column_position: nextPos,
            percentStatus: p.percent,
            sellPrice: p.sellPrice,
            deliveryDate: isoFromOffset(p.deliveryOffsetDays),
            positions: p.positions,
            material: false,
            other: p.note ?? "",
            archived: false,
            locked: false,
        });

        if (error) throw new Error(`Task ${p.code}: ${error.message}`);
        created++;
        console.log(`  + ${p.code} → board ${p.board} col ${p.column} (${p.name})`);
    }

    console.log(`\n✓ Progetti creati: ${created} (saltati ${skipped} già presenti)`);
    console.log("✅ Fatto");
}

main().catch((err) => {
    console.error("\n❌ Inserimento fallito:", err);
    process.exit(1);
});
