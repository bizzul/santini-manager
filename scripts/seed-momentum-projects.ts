/**
 * Inserisce 10 clienti demo (tabella Client nativa FDM) e 20 progetti (Task)
 * distribuiti nelle board kanban Momentum (Offerte / Plan PVT / Plan PUBLIC /
 * Accounting). I Task compaiono nei kanban e nella lista Progetti.
 *
 * Idempotente: clienti per `code`, progetti per `unique_code`.
 *
 * Prerequisito: le board Momentum devono esistere (seed-momentum-kanbans.ts).
 * Gli id di board/colonne vengono risolti a runtime per identifier.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-momentum-projects.ts
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

interface ClientSeed {
    code: string;
    clientType: "BUSINESS" | "INDIVIDUAL";
    businessName?: string;
    individualFirstName?: string;
    individualLastName?: string;
    city: string;
    email: string;
    landlinePhone?: string;
}

const CLIENTS: ClientSeed[] = [
    { code: "MOM-CLI-01", clientType: "BUSINESS", businessName: "Delta SA Eventi", city: "Bellinzona", email: "eventi@delta-sa.example.ch", landlinePhone: "+41 91 234 56 78" },
    { code: "MOM-CLI-02", clientType: "BUSINESS", businessName: "Comune di Bellinzona", city: "Bellinzona", email: "eventi@bellinzona.example.ch" },
    { code: "MOM-CLI-03", clientType: "BUSINESS", businessName: "Lido Locarno SA", city: "Locarno", email: "info@lidolocarno.example.ch" },
    { code: "MOM-CLI-04", clientType: "BUSINESS", businessName: "Rooftop Lounge Lugano SA", city: "Lugano", email: "booking@rooftoplugano.example.ch" },
    { code: "MOM-CLI-05", clientType: "BUSINESS", businessName: "Alpe Foppa Turismo", city: "Maggia", email: "info@alpefoppa.example.ch" },
    { code: "MOM-CLI-06", clientType: "BUSINESS", businessName: "Cantina Malcantone Sagl", city: "Malcantone", email: "info@cantinamalcantone.example.ch" },
    { code: "MOM-CLI-07", clientType: "BUSINESS", businessName: "Ticino Festival Association", city: "Locarno", email: "info@ticinofestival.example.ch" },
    { code: "MOM-CLI-08", clientType: "INDIVIDUAL", individualFirstName: "Marco", individualLastName: "Bernasconi", city: "Lugano", email: "marco.bernasconi@example.ch", landlinePhone: "+41 79 123 45 67" },
    { code: "MOM-CLI-09", clientType: "INDIVIDUAL", individualFirstName: "Giulia", individualLastName: "Rossi", city: "Mendrisio", email: "giulia.rossi@example.ch" },
    { code: "MOM-CLI-10", clientType: "INDIVIDUAL", individualFirstName: "Roberto", individualLastName: "Conti", city: "Bellinzona", email: "roberto.conti@example.ch" },
];

interface ProjectSeed {
    code: string;
    name: string;
    boardIdentifier: string;
    columnIdentifier: string;
    task_type: "offer" | "work";
    status: string;
    percent: number;
    sellPrice: number;
    luogo: string;
    positions: string[];
    deliveryDate: string;
}

const F = "9670091c-e52"; // frammento site id usato negli identifier board/colonne
const B = {
    offerte: "offerte-" + F,
    planPvt: "plan_pvt-" + F,
    planPublic: "plan_public-" + F,
    accounting: "accounting-" + F,
};

const PROJECTS: ProjectSeed[] = [
    // --- Offerte (Vendita) ---
    { code: "MOM-P-001", name: "Offerta Lake Festival 2026", boardIdentifier: B.offerte, columnIdentifier: "richiesta_offerte-" + F, task_type: "offer", status: "open", percent: 10, sellPrice: 42000, luogo: "Locarno", positions: ["Line-up", "Palco & audio", "Security"], deliveryDate: "2026-07-18" },
    { code: "MOM-P-002", name: "Offerta Rooftop Summer Series", boardIdentifier: B.offerte, columnIdentifier: "in_elaborazione_offerte-" + F, task_type: "offer", status: "open", percent: 25, sellPrice: 18000, luogo: "Lugano", positions: ["DJ set", "Open bar", "Audio-luci"], deliveryDate: "2026-06-20" },
    { code: "MOM-P-003", name: "Offerta Notte Bianca", boardIdentifier: B.offerte, columnIdentifier: "offerta_inviata_offerte-" + F, task_type: "offer", status: "sent", percent: 40, sellPrice: 30000, luogo: "Bellinzona", positions: ["Multi-palco", "Comunicazione", "Sicurezza"], deliveryDate: "2026-09-05" },
    { code: "MOM-P-004", name: "Offerta Festa Aziendale Delta", boardIdentifier: B.offerte, columnIdentifier: "in_trattativa_offerte-" + F, task_type: "offer", status: "open", percent: 60, sellPrice: 15000, luogo: "Bellinzona", positions: ["Live band", "Catering", "DJ after"], deliveryDate: "2026-05-30" },
    { code: "MOM-P-005", name: "Offerta Matrimonio Lakeside", boardIdentifier: B.offerte, columnIdentifier: "vinta_offerte-" + F, task_type: "offer", status: "won", percent: 100, sellPrice: 12000, luogo: "Malcantone", positions: ["DJ ricevimento", "Sax cerimonia", "Banqueting"], deliveryDate: "2026-07-11" },

    // --- Plan PVT ---
    { code: "MOM-P-006", name: "Sunset Rooftop Session", boardIdentifier: B.planPvt, columnIdentifier: "to_plan_plan_pvt-" + F, task_type: "work", status: "planning", percent: 10, sellPrice: 8600, luogo: "Lugano", positions: ["DJ set", "Open bar", "Audio-luci"], deliveryDate: "2026-07-29" },
    { code: "MOM-P-007", name: "Vernissage Art & DJ", boardIdentifier: B.planPvt, columnIdentifier: "planning_plan_pvt-" + F, task_type: "work", status: "planning", percent: 30, sellPrice: 5400, luogo: "Mendrisio", positions: ["Set ambient", "Aperitivo"], deliveryDate: "2026-07-22" },
    { code: "MOM-P-008", name: "Private Birthday Bash", boardIdentifier: B.planPvt, columnIdentifier: "planned_plan_pvt-" + F, task_type: "work", status: "planning", percent: 50, sellPrice: 6800, luogo: "Lugano", positions: ["DJ", "Allestimento"], deliveryDate: "2026-08-07" },
    { code: "MOM-P-009", name: "Matrimonio R&G", boardIdentifier: B.planPvt, columnIdentifier: "confirmed_plan_pvt-" + F, task_type: "work", status: "planning", percent: 70, sellPrice: 11800, luogo: "Malcantone", positions: ["DJ ricevimento", "Sax", "Banqueting"], deliveryDate: "2026-08-05" },
    { code: "MOM-P-010", name: "Corporate Autumn Gala", boardIdentifier: B.planPvt, columnIdentifier: "live_plan_pvt-" + F, task_type: "work", status: "production", percent: 90, sellPrice: 14500, luogo: "Bellinzona", positions: ["Live band", "Catering", "Regia"], deliveryDate: "2026-09-19" },

    // --- Plan PUBLIC ---
    { code: "MOM-P-011", name: "Lakeside Open Air", boardIdentifier: B.planPublic, columnIdentifier: "to_plan_plan_public-" + F, task_type: "work", status: "planning", percent: 10, sellPrice: 30000, luogo: "Locarno", positions: ["Line-up", "Palco", "Security"], deliveryDate: "2026-09-06" },
    { code: "MOM-P-012", name: "Capannone Beats #3", boardIdentifier: B.planPublic, columnIdentifier: "planning_plan_public-" + F, task_type: "work", status: "planning", percent: 30, sellPrice: 22000, luogo: "Giubiasco", positions: ["Headliner techno", "Impianto full", "Security"], deliveryDate: "2026-08-15" },
    { code: "MOM-P-013", name: "Festival Warmup", boardIdentifier: B.planPublic, columnIdentifier: "planned_plan_public-" + F, task_type: "work", status: "planning", percent: 50, sellPrice: 20000, luogo: "Maggia", positions: ["Line-up", "Palco", "Bar"], deliveryDate: "2026-09-13" },
    { code: "MOM-P-014", name: "Alpe Day Dance", boardIdentifier: B.planPublic, columnIdentifier: "confirmed_plan_public-" + F, task_type: "work", status: "planning", percent: 70, sellPrice: 26000, luogo: "Maggia", positions: ["DJ line-up", "Audio-luci", "Logistica montagna"], deliveryDate: "2026-04-14" },
    { code: "MOM-P-015", name: "Notte Bianca Comunale", boardIdentifier: B.planPublic, columnIdentifier: "live_plan_public-" + F, task_type: "work", status: "production", percent: 90, sellPrice: 34000, luogo: "Bellinzona", positions: ["Multi-palco", "Sicurezza", "Viabilita"], deliveryDate: "2026-09-05" },

    // --- Accounting (Balance) ---
    { code: "MOM-P-016", name: "Warehouse NYE - consuntivo", boardIdentifier: B.accounting, columnIdentifier: "invoice_in_accounting-" + F, task_type: "work", status: "done", percent: 100, sellPrice: 28000, luogo: "Riazzino", positions: ["Countdown set", "Impianto", "Security"], deliveryDate: "2026-01-01" },
    { code: "MOM-P-017", name: "Rooftop Aperitivo - fatturazione", boardIdentifier: B.accounting, columnIdentifier: "invoice_out_accounting-" + F, task_type: "work", status: "done", percent: 100, sellPrice: 5200, luogo: "Lugano", positions: ["Sax + DJ", "Aperitivo"], deliveryDate: "2026-06-06" },
    { code: "MOM-P-018", name: "Lake Sound - bilancio", boardIdentifier: B.accounting, columnIdentifier: "balance_accounting-" + F, task_type: "work", status: "done", percent: 100, sellPrice: 24000, luogo: "Locarno", positions: ["Line-up", "Palco", "Bar"], deliveryDate: "2026-06-14" },
    { code: "MOM-P-019", name: "Sunset Sessions - chiusura", boardIdentifier: B.accounting, columnIdentifier: "close_accounting-" + F, task_type: "work", status: "done", percent: 100, sellPrice: 9000, luogo: "Lugano", positions: ["DJ set", "Bar"], deliveryDate: "2026-08-07" },
    { code: "MOM-P-020", name: "Apres Ski - consuntivo", boardIdentifier: B.accounting, columnIdentifier: "close_accounting-" + F, task_type: "work", status: "done", percent: 100, sellPrice: 7000, luogo: "Airolo", positions: ["DJ", "Bar", "Riscaldamento"], deliveryDate: "2026-01-07" },
];

async function main() {
    console.log("🗂️  Seed progetti + clienti Momentum\n");

    const { data: site, error } = await supabase
        .from("sites")
        .select("id, organization_id")
        .eq("subdomain", SUBDOMAIN)
        .single();
    if (error || !site) throw new Error(`Sito "${SUBDOMAIN}" non trovato`);
    const siteId = site.id;
    const orgId = site.organization_id;

    // 1) Clienti
    const clientIds: number[] = [];
    let cCreated = 0;
    let cSkipped = 0;
    for (const c of CLIENTS) {
        const { data: existing } = await supabase
            .from("Client")
            .select("id")
            .eq("site_id", siteId)
            .eq("code", c.code)
            .maybeSingle();
        if (existing) {
            clientIds.push(existing.id);
            cSkipped++;
            continue;
        }
        const payload: Record<string, unknown> = {
            code: c.code,
            clientType: c.clientType,
            businessName: c.businessName ?? null,
            individualFirstName: c.individualFirstName ?? null,
            individualLastName: c.individualLastName ?? null,
            city: c.city,
            email: c.email,
            landlinePhone: c.landlinePhone ?? null,
            site_id: siteId,
            contactPeople: [],
        };
        if (orgId) payload.organization_id = orgId;
        const { data: created, error: cErr } = await supabase
            .from("Client")
            .insert(payload)
            .select("id")
            .single();
        if (cErr || !created) throw new Error(`Client ${c.code}: ${cErr?.message}`);
        clientIds.push(created.id);
        cCreated++;
    }
    console.log(`✓ Clienti: ${cCreated} creati, ${cSkipped} già presenti`);

    // 2) Risolvi id board + colonne per identifier
    const { data: boards } = await supabase
        .from("Kanban")
        .select("id, identifier")
        .eq("site_id", siteId);
    const boardId = new Map((boards || []).map((b) => [b.identifier, b.id]));

    const { data: cols } = await supabase
        .from("KanbanColumn")
        .select("id, identifier, kanbanId")
        .in("kanbanId", Array.from(boardId.values()));
    const colId = new Map((cols || []).map((c) => [c.identifier, c.id]));

    // 3) Progetti (Task)
    const posByColumn = new Map<number, number>();
    let created = 0;
    let skipped = 0;
    let rr = 0;

    for (const p of PROJECTS) {
        const kanbanId = boardId.get(p.boardIdentifier);
        const columnId = colId.get(p.columnIdentifier);
        if (!kanbanId || !columnId) {
            throw new Error(
                `Board/colonna non trovata: ${p.boardIdentifier} / ${p.columnIdentifier}`
            );
        }

        const { data: existing } = await supabase
            .from("Task")
            .select("id")
            .eq("site_id", siteId)
            .eq("unique_code", p.code)
            .maybeSingle();
        if (existing) {
            skipped++;
            continue;
        }

        const nextPos = (posByColumn.get(columnId) || 0) + 1;
        posByColumn.set(columnId, nextPos);
        const clientId = clientIds[rr % clientIds.length];
        rr++;

        const { error: tErr } = await supabase.from("Task").insert({
            site_id: siteId,
            unique_code: p.code,
            title: p.name,
            name: p.name,
            task_type: p.task_type,
            display_mode: "normal",
            status: p.status,
            clientId,
            kanbanId,
            kanbanColumnId: columnId,
            column_id: columnId,
            column_position: nextPos,
            percentStatus: p.percent,
            sellPrice: p.sellPrice,
            deliveryDate: new Date(p.deliveryDate).toISOString(),
            luogo: p.luogo,
            positions: p.positions,
            material: true,
            archived: false,
            locked: false,
        });
        if (tErr) throw new Error(`Task ${p.code}: ${tErr.message}`);
        created++;
        console.log(`  + ${p.code} → ${p.boardIdentifier} (${p.name})`);
    }

    console.log(`\n✓ Progetti: ${created} creati, ${skipped} già presenti`);
    console.log("✅ Fatto");
}

main().catch((err) => {
    console.error("\n❌ Inserimento fallito:", err);
    process.exit(1);
});
