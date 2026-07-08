/**
 * Crea progetti realistici per lo spazio "formateria" basandosi sui clienti già
 * presenti, distribuendoli nelle kanban esistenti:
 *
 *   Offerte (id 97):     Nuova richiesta(301) · Offerta inviata(302) ·
 *                        Trattativa(303) · Vinta(304) · Persa(346)
 *   Produzione (id 98):  Pianificazione(305) · In produzione(306) ·
 *                        Montaggio(307) · Consegnato(308)
 *
 * formateria è un laboratorio di arredamento / falegnameria su misura, quindi i
 * progetti riflettono commesse di interior (cucine, boiserie, arredi contract...).
 *
 * Idempotente: salta i Task con `unique_code` già presente.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-formateria-projects.ts
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
const SERVICE_KEY =
    process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUBDOMAIN = "formateria";
const OFFER_BOARD = 97;
const WORK_BOARD = 98;

// Colonne (id reali su formateria)
const COL = {
    nuovaRichiesta: 301,
    offertaInviata: 302,
    trattativa: 303,
    vinta: 304,
    persa: 346,
    pianificazione: 305,
    inProduzione: 306,
    montaggio: 307,
    consegnato: 308,
} as const;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing Supabase env vars. Run with --env-file=.env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

interface ProjectDef {
    code: string;
    clientId: number;
    board: number;
    column: number;
    name: string;
    luogo: string;
    sellPrice: number;
    percent: number;
    status: string;
    deliveryDate: string; // ISO
    offerSendDate?: string; // YYYY-MM-DD
    positions: string[];
    pezzi?: number;
    legno?: boolean;
    ferramenta?: boolean;
    metalli?: boolean;
    vernice?: boolean;
    lossReason?: "price" | "delivery_time" | "site_on_hold" | "other";
    note?: string;
}

const PROJECTS: ProjectDef[] = [
    // ---- Offerte · Nuova richiesta ----
    { code: "26-OFF-010", clientId: 407, board: OFFER_BOARD, column: COL.nuovaRichiesta, name: "Boiserie salone showroom", luogo: "Lugano", sellPrice: 12400, percent: 10, status: "open", deliveryDate: "2026-11-06", positions: ["Boiserie", "Mensole", "Illuminazione LED"], pezzi: 3, legno: true, vernice: true },
    { code: "26-OFF-011", clientId: 420, board: OFFER_BOARD, column: COL.nuovaRichiesta, name: "Cabina armadio walk-in", luogo: "Lugano", sellPrice: 8600, percent: 5, status: "open", deliveryDate: "2026-10-30", positions: ["Struttura", "Ante scorrevoli", "Cassettiere"], pezzi: 3, legno: true, ferramenta: true },
    { code: "26-OFF-012", clientId: 430, board: OFFER_BOARD, column: COL.nuovaRichiesta, name: "Reception area wellness", luogo: "Breganzona", sellPrice: 15900, percent: 10, status: "open", deliveryDate: "2026-11-20", positions: ["Bancone reception", "Retro banco", "Espositore"], pezzi: 3, legno: true },
    { code: "26-OFF-013", clientId: 436, board: OFFER_BOARD, column: COL.nuovaRichiesta, name: "Libreria a tutta parete", luogo: "Capriasca", sellPrice: 7300, percent: 5, status: "open", deliveryDate: "2026-10-16", positions: ["Libreria", "Scala scorrevole"], pezzi: 2, legno: true },

    // ---- Offerte · Offerta inviata ----
    { code: "26-OFF-014", clientId: 417, board: OFFER_BOARD, column: COL.offertaInviata, name: "Arredo sale d'attesa", luogo: "Orselina", sellPrice: 24800, percent: 40, status: "sent", deliveryDate: "2026-10-09", offerSendDate: "2026-07-02", positions: ["Sedute", "Banco accettazione", "Pannelli fonoassorbenti"], pezzi: 3, legno: true },
    { code: "26-OFF-015", clientId: 409, board: OFFER_BOARD, column: COL.offertaInviata, name: "Cucina su misura in rovere", luogo: "Massagno", sellPrice: 19500, percent: 40, status: "sent", deliveryDate: "2026-09-25", offerSendDate: "2026-07-04", positions: ["Basi", "Pensili", "Isola", "Top in pietra"], pezzi: 4, legno: true, ferramenta: true },
    { code: "26-OFF-016", clientId: 425, board: OFFER_BOARD, column: COL.offertaInviata, name: "Parete attrezzata soggiorno", luogo: "Sorengo", sellPrice: 9800, percent: 35, status: "sent", deliveryDate: "2026-09-18", offerSendDate: "2026-06-30", positions: ["Mobile TV", "Contenitori", "Mensole"], pezzi: 3, legno: true },
    { code: "26-OFF-017", clientId: 428, board: OFFER_BOARD, column: COL.offertaInviata, name: "Fornitura arredi uffici direzionali", luogo: "Sesto San Giovanni", sellPrice: 31200, percent: 45, status: "sent", deliveryDate: "2026-10-23", offerSendDate: "2026-07-01", positions: ["Scrivanie", "Armadiature", "Reception"], pezzi: 3, legno: true },

    // ---- Offerte · Trattativa ----
    { code: "26-OFF-018", clientId: 434, board: OFFER_BOARD, column: COL.trattativa, name: "Arredo hall ingresso", luogo: "Collina d'Oro", sellPrice: 28600, percent: 60, status: "open", deliveryDate: "2026-09-11", offerSendDate: "2026-06-05", positions: ["Bancone", "Boiserie", "Seduta attesa"], pezzi: 3, legno: true, note: "[05/06/2026] Sopralluogo effettuato, in attesa conferma capitolato" },
    { code: "26-OFF-019", clientId: 422, board: OFFER_BOARD, column: COL.trattativa, name: "Cucina e living open space", luogo: "Caslano", sellPrice: 22400, percent: 65, status: "open", deliveryDate: "2026-09-04", offerSendDate: "2026-06-12", positions: ["Cucina", "Isola", "Mobile living"], pezzi: 3, legno: true, ferramenta: true },
    { code: "26-OFF-020", clientId: 406, board: OFFER_BOARD, column: COL.trattativa, name: "Allestimento studio architettura", luogo: "Vernate", sellPrice: 13700, percent: 55, status: "open", deliveryDate: "2026-09-30", offerSendDate: "2026-06-18", positions: ["Postazioni", "Libreria", "Sala riunioni"], pezzi: 3, legno: true },

    // ---- Offerte · Vinta ----
    { code: "26-OFF-021", clientId: 416, board: OFFER_BOARD, column: COL.vinta, name: "Arredo appartamento modello", luogo: "Massagno", sellPrice: 26900, percent: 100, status: "won", deliveryDate: "2026-08-28", offerSendDate: "2026-05-14", positions: ["Cucina", "Armadi", "Bagno"], pezzi: 3, legno: true, ferramenta: true },
    { code: "26-OFF-022", clientId: 424, board: OFFER_BOARD, column: COL.vinta, name: "Camera padronale su misura", luogo: "Losanna", sellPrice: 11200, percent: 100, status: "won", deliveryDate: "2026-09-05", offerSendDate: "2026-05-22", positions: ["Armadio", "Testiera", "Comodini"], pezzi: 3, legno: true },

    // ---- Offerte · Persa ----
    { code: "26-OFF-023", clientId: 431, board: OFFER_BOARD, column: COL.persa, name: "Bancone bar ristorante", luogo: "Chiasso", sellPrice: 17400, percent: 100, status: "lost", deliveryDate: "2026-08-14", offerSendDate: "2026-05-08", positions: ["Bancone", "Retrobanco"], pezzi: 2, legno: true, lossReason: "price" },
    { code: "26-OFF-024", clientId: 429, board: OFFER_BOARD, column: COL.persa, name: "Espositori fiera export", luogo: "Corciano", sellPrice: 14300, percent: 100, status: "lost", deliveryDate: "2026-08-21", offerSendDate: "2026-05-16", positions: ["Stand", "Espositori", "Illuminazione"], pezzi: 3, legno: true, lossReason: "delivery_time" },

    // ---- Produzione · Pianificazione ----
    { code: "26-PRD-001", clientId: 399, board: WORK_BOARD, column: COL.pianificazione, name: "Coperture e rivestimenti esterni", luogo: "Lugano", sellPrice: 18900, percent: 15, status: "planning", deliveryDate: "2026-10-02", positions: ["Coperture", "Rivestimenti"], pezzi: 2, legno: true, metalli: true },
    { code: "26-PRD-002", clientId: 418, board: WORK_BOARD, column: COL.pianificazione, name: "Arredo villa Sorengo", luogo: "Sorengo", sellPrice: 34500, percent: 20, status: "planning", deliveryDate: "2026-10-16", positions: ["Cucina", "Living", "Camere", "Bagni"], pezzi: 4, legno: true, ferramenta: true },
    { code: "26-PRD-003", clientId: 435, board: WORK_BOARD, column: COL.pianificazione, name: "Ristrutturazione interni residenza", luogo: "Lugano", sellPrice: 27800, percent: 15, status: "planning", deliveryDate: "2026-09-25", positions: ["Boiserie", "Porte", "Armadi"], pezzi: 3, legno: true },

    // ---- Produzione · In produzione ----
    { code: "26-PRD-004", clientId: 403, board: WORK_BOARD, column: COL.inProduzione, name: "Arredo sala parrocchiale", luogo: "Rovio", sellPrice: 12600, percent: 55, status: "production", deliveryDate: "2026-08-14", positions: ["Panche", "Armadi", "Tavoli"], pezzi: 3, legno: true },
    { code: "26-PRD-005", clientId: 402, board: WORK_BOARD, column: COL.inProduzione, name: "Falegnameria su misura abitazione", luogo: "Curio", sellPrice: 15400, percent: 60, status: "production", deliveryDate: "2026-08-07", positions: ["Cucina", "Guardaroba"], pezzi: 2, legno: true, ferramenta: true },
    { code: "26-PRD-006", clientId: 423, board: WORK_BOARD, column: COL.inProduzione, name: "Libreria e studio in noce", luogo: "Caslano", sellPrice: 9900, percent: 50, status: "production", deliveryDate: "2026-08-21", positions: ["Libreria", "Scrivania"], pezzi: 2, legno: true },

    // ---- Produzione · Montaggio ----
    { code: "26-PRD-007", clientId: 421, board: WORK_BOARD, column: COL.montaggio, name: "Cabina armadio e boiserie camera", luogo: "Massagno", sellPrice: 10800, percent: 85, status: "production", deliveryDate: "2026-07-24", positions: ["Cabina armadio", "Boiserie"], pezzi: 2, legno: true, ferramenta: true },
    { code: "26-PRD-008", clientId: 426, board: WORK_BOARD, column: COL.montaggio, name: "Cucina isola in laccato opaco", luogo: "Breganzona", sellPrice: 20300, percent: 90, status: "production", deliveryDate: "2026-07-20", positions: ["Cucina", "Isola", "Dispensa"], pezzi: 3, legno: true, ferramenta: true, vernice: true },

    // ---- Produzione · Consegnato ----
    { code: "26-PRD-009", clientId: 433, board: WORK_BOARD, column: COL.consegnato, name: "Rinnovo living e cucina", luogo: "Breganzona", sellPrice: 17600, percent: 100, status: "done", deliveryDate: "2026-06-26", positions: ["Cucina", "Living"], pezzi: 2, legno: true },
    { code: "26-PRD-010", clientId: 437, board: WORK_BOARD, column: COL.consegnato, name: "Arredo attico vista lago", luogo: "Lugano - Cassarate", sellPrice: 29400, percent: 100, status: "done", deliveryDate: "2026-06-19", positions: ["Cucina", "Living", "Terrazza"], pezzi: 3, legno: true, metalli: true },
];

async function main() {
    console.log("🗂️  Inserimento progetti formateria\n");

    const { data: site, error: siteError } = await supabase
        .from("sites")
        .select("id")
        .eq("subdomain", SUBDOMAIN)
        .single();
    if (siteError || !site) throw new Error(`Sito "${SUBDOMAIN}" non trovato: ${siteError?.message}`);
    const siteId = site.id;

    // Posizione corrente per colonna (per non sovrapporsi ai task esistenti)
    const { data: existingTasks } = await supabase
        .from("Task")
        .select("kanbanColumnId, column_position")
        .eq("site_id", siteId)
        .in("kanbanId", [OFFER_BOARD, WORK_BOARD]);
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

        const nextPos = (posByColumn.get(p.column) || 0) + 1;
        posByColumn.set(p.column, nextPos);

        const isOffer = p.board === OFFER_BOARD;

        const { error } = await supabase.from("Task").insert({
            site_id: siteId,
            unique_code: p.code,
            title: p.name,
            name: p.name,
            task_type: isOffer ? "offer" : "work",
            display_mode: "normal",
            status: p.status,
            clientId: p.clientId,
            kanbanId: p.board,
            kanbanColumnId: p.column,
            column_id: p.column,
            column_position: nextPos,
            percentStatus: p.percent,
            sellPrice: p.sellPrice,
            deliveryDate: new Date(p.deliveryDate).toISOString(),
            offer_send_date: p.offerSendDate ?? null,
            luogo: p.luogo,
            positions: p.positions,
            numero_pezzi: p.pezzi ?? null,
            material: true,
            legno: p.legno ?? false,
            ferramenta: p.ferramenta ?? false,
            metalli: p.metalli ?? false,
            vernice: p.vernice ?? false,
            other: p.note ?? null,
            offer_loss_reason: p.lossReason ?? null,
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
