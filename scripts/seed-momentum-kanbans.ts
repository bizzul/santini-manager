/**
 * Crea i kanban secondari + colonne per lo spazio "momentum" dentro le
 * categorie gia create dall'utente (Vendita / Events / Balance), replicando
 * i flussi della specifica Momentum sul sistema kanban nativo FDM.
 *
 *   Vendita  -> "Offerte" : Richiesta · In elaborazione · Offerta inviata ·
 *                           In trattativa · Vinta(won) · Persa(lost)
 *   Events   -> "Plan PVT" e "Plan PUBLIC" :
 *               To Plan · Planning · Planned · Confirmed · Live · Finish(invoicing)
 *   Balance  -> "Accounting" : Invoice IN · Invoice OUT · Balance · Close(won)
 *
 * Routing coerente con la specifica:
 *   - Offerte.is_offer_kanban = true, target_work_kanban_id -> Plan PVT
 *   - Plan.*.target_invoice_kanban_id -> Accounting (colonna Finish = invoicing)
 *
 * Idempotente: salta board/colonne gia presenti (match per identifier).
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-momentum-kanbans.ts
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

interface ColDef {
    title: string;
    identifier: string;
    position: number;
    column_type: string;
    is_creation_column: boolean;
    icon?: string;
}

interface BoardDef {
    title: string;
    identifier: string;
    categoryName: string;
    color: string;
    icon: string;
    is_offer_kanban?: boolean;
    is_work_kanban?: boolean;
    columns: ColDef[];
}

function planColumns(suffix: string): ColDef[] {
    return [
        { title: "To Plan", identifier: `to_plan_${suffix}`, position: 1, column_type: "normal", is_creation_column: true, icon: "ListTodo" },
        { title: "Planning", identifier: `planning_${suffix}`, position: 2, column_type: "normal", is_creation_column: false, icon: "PencilRuler" },
        { title: "Planned", identifier: `planned_${suffix}`, position: 3, column_type: "normal", is_creation_column: false, icon: "CalendarCheck" },
        { title: "Confirmed", identifier: `confirmed_${suffix}`, position: 4, column_type: "normal", is_creation_column: false, icon: "BadgeCheck" },
        { title: "Live", identifier: `live_${suffix}`, position: 5, column_type: "normal", is_creation_column: false, icon: "Radio" },
        { title: "Finish", identifier: `finish_${suffix}`, position: 6, column_type: "invoicing", is_creation_column: false, icon: "Flag" },
    ];
}

const BOARDS: BoardDef[] = [
    {
        title: "Offerte",
        identifier: "offerte",
        categoryName: "Vendita",
        color: "#F59E0B",
        icon: "BadgeDollarSign",
        is_offer_kanban: true,
        columns: [
            { title: "Richiesta", identifier: "richiesta_offerte", position: 1, column_type: "normal", is_creation_column: true, icon: "Inbox" },
            { title: "In elaborazione", identifier: "in_elaborazione_offerte", position: 2, column_type: "normal", is_creation_column: false, icon: "Loader" },
            { title: "Offerta inviata", identifier: "offerta_inviata_offerte", position: 3, column_type: "normal", is_creation_column: false, icon: "Send" },
            { title: "In trattativa", identifier: "in_trattativa_offerte", position: 4, column_type: "normal", is_creation_column: false, icon: "Handshake" },
            { title: "Vinta", identifier: "vinta_offerte", position: 5, column_type: "won", is_creation_column: false, icon: "Trophy" },
            { title: "Persa", identifier: "persa_offerte", position: 6, column_type: "lost", is_creation_column: false, icon: "ArchiveX" },
        ],
    },
    {
        title: "Plan PVT",
        identifier: "plan_pvt",
        categoryName: "Events",
        color: "#6366f1",
        icon: "CalendarClock",
        is_work_kanban: true,
        columns: planColumns("plan_pvt"),
    },
    {
        title: "Plan PUBLIC",
        identifier: "plan_public",
        categoryName: "Events",
        color: "#0ea5e9",
        icon: "Users",
        is_work_kanban: true,
        columns: planColumns("plan_public"),
    },
    {
        title: "Accounting",
        identifier: "accounting",
        categoryName: "Balance",
        color: "#16a34a",
        icon: "Receipt",
        columns: [
            { title: "Invoice IN", identifier: "invoice_in_accounting", position: 1, column_type: "normal", is_creation_column: true, icon: "ArrowDownToLine" },
            { title: "Invoice OUT", identifier: "invoice_out_accounting", position: 2, column_type: "normal", is_creation_column: false, icon: "ArrowUpFromLine" },
            { title: "Balance", identifier: "balance_accounting", position: 3, column_type: "normal", is_creation_column: false, icon: "Scale" },
            { title: "Close", identifier: "close_accounting", position: 4, column_type: "won", is_creation_column: false, icon: "CircleCheckBig" },
        ],
    },
];

async function getCategoryId(siteId: string, name: string): Promise<number> {
    const { data } = await supabase
        .from("KanbanCategory")
        .select("id")
        .eq("site_id", siteId)
        .eq("name", name)
        .maybeSingle();
    if (!data) throw new Error(`Categoria "${name}" non trovata per lo spazio`);
    return data.id;
}

// Frammento del site id per rendere gli identifier globalmente unici
// (KanbanColumn.identifier e Kanban.identifier hanno un vincolo UNIQUE globale,
//  come fa la stessa app FDM suffissando con un frammento del site id).
let SITE_FRAG = "";
const uid = (id: string) => `${id}-${SITE_FRAG}`;

async function ensureBoard(
    siteId: string,
    board: BoardDef,
    categoryId: number,
    extra: Record<string, unknown> = {}
): Promise<number> {
    const boardIdentifier = uid(board.identifier);
    const { data: existing } = await supabase
        .from("Kanban")
        .select("id")
        .eq("site_id", siteId)
        .eq("identifier", boardIdentifier)
        .maybeSingle();

    let kanbanId: number;
    if (existing) {
        kanbanId = existing.id;
        // aggiorna eventuali target/flag
        if (Object.keys(extra).length > 0) {
            await supabase.from("Kanban").update(extra).eq("id", kanbanId);
        }
    } else {
        const { data, error } = await supabase
            .from("Kanban")
            .insert({
                title: board.title,
                identifier: boardIdentifier,
                site_id: siteId,
                category_id: categoryId,
                color: board.color,
                icon: board.icon,
                is_offer_kanban: board.is_offer_kanban ?? false,
                is_work_kanban: board.is_work_kanban ?? false,
                is_production_kanban: false,
                show_category_colors: false,
                ...extra,
            })
            .select("id")
            .single();
        if (error || !data) throw new Error(`Kanban ${board.identifier}: ${error?.message}`);
        kanbanId = data.id;
    }

    for (const col of board.columns) {
        const colIdentifier = uid(col.identifier);
        const { data: existingCol } = await supabase
            .from("KanbanColumn")
            .select("id")
            .eq("kanbanId", kanbanId)
            .eq("identifier", colIdentifier)
            .maybeSingle();
        if (existingCol) continue;
        const { error: colErr } = await supabase.from("KanbanColumn").insert({
            title: col.title,
            identifier: colIdentifier,
            position: col.position,
            kanbanId,
            column_type: col.column_type,
            is_creation_column: col.is_creation_column,
            icon: col.icon ?? null,
        });
        if (colErr) throw new Error(`Colonna ${colIdentifier}: ${colErr.message}`);
    }

    return kanbanId;
}

async function main() {
    console.log("🎛️  Kanban Momentum (categorie native)\n");
    const { data: site, error } = await supabase
        .from("sites")
        .select("id")
        .eq("subdomain", SUBDOMAIN)
        .single();
    if (error || !site) throw new Error(`Sito "${SUBDOMAIN}" non trovato`);
    const siteId = site.id;
    SITE_FRAG = siteId.slice(0, 12);

    // Pulizia board momentum eventualmente create in run precedenti parziali
    // (nessun task collegato: sono board demo appena generate).
    const { data: prevBoards } = await supabase
        .from("Kanban")
        .select("id")
        .eq("site_id", siteId);
    const prevIds = (prevBoards || []).map((b) => b.id);
    if (prevIds.length > 0) {
        await supabase.from("KanbanColumn").delete().in("kanbanId", prevIds);
        await supabase.from("Kanban").delete().in("id", prevIds);
        console.log(`↻ Rimosse ${prevIds.length} board momentum preesistenti`);
    }

    const catByName = new Map<string, number>();
    for (const name of ["Vendita", "Events", "Balance"]) {
        catByName.set(name, await getCategoryId(siteId, name));
    }

    // 1) Accounting (serve come target invoice per i Plan)
    const accBoard = BOARDS.find((b) => b.identifier === "accounting")!;
    const accountingId = await ensureBoard(
        siteId,
        accBoard,
        catByName.get("Balance")!
    );
    console.log(`✓ Accounting (id ${accountingId})`);

    // 2) Plan PVT / PUBLIC -> target invoice = Accounting
    const planPvt = BOARDS.find((b) => b.identifier === "plan_pvt")!;
    const planPvtId = await ensureBoard(siteId, planPvt, catByName.get("Events")!, {
        target_invoice_kanban_id: accountingId,
    });
    const planPublic = BOARDS.find((b) => b.identifier === "plan_public")!;
    const planPublicId = await ensureBoard(
        siteId,
        planPublic,
        catByName.get("Events")!,
        { target_invoice_kanban_id: accountingId }
    );
    console.log(`✓ Plan PVT (id ${planPvtId}), Plan PUBLIC (id ${planPublicId})`);

    // 3) Offerte -> target work = Plan PVT (offerta vinta genera task nel Plan)
    const offerte = BOARDS.find((b) => b.identifier === "offerte")!;
    const offerteId = await ensureBoard(
        siteId,
        offerte,
        catByName.get("Vendita")!,
        { target_work_kanban_id: planPvtId }
    );
    console.log(`✓ Offerte (id ${offerteId})`);

    console.log("\n✅ Kanban Momentum creati.");
}

main().catch((e) => {
    console.error("\n❌", e);
    process.exit(1);
});
