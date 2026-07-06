/**
 * Inserisce i progetti aperti nello spazio Suisseframe a partire dal
 * "Rapporto progetti al 7 luglio 2026.xlsx", posizionandoli nelle kanban di
 * produzione attuali in base a Prodotto (board) e Fase (colonna).
 *
 * Prodotto → board:  SF620/SF220 → WIN, SF IV74 → HST - H, SF HM74 → HST - HM, SF WALL → WALL
 * Fase → colonna:     TO DO→to_do, CNC→cnc, PREPARAZ.→prep, VERNIC.→finitura,
 *                     MONTAGGIO→montaggio, Q.C.→qualita, IMBALLAGGIO→spedito
 *
 * Clienti mancanti referenziati dai progetti vengono creati (minimal, BUSINESS).
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-suisseframe-projects.ts [percorso.xlsx]
 */
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
const SERVICE_KEY =
    process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUBDOMAIN = "suisseframe";
const XLSX_PATH =
    process.argv[2] ||
    "/Users/matteopaolocci/Downloads/Rapporto progetti al 7 luglio 2026.xlsx";

/** Prodotto → identifier del board di produzione. */
function boardForProduct(product: string): string {
    const p = product.toUpperCase();
    if (p.includes("WALL")) return "wall";
    if (p.includes("HM74")) return "hst_hm";
    if (p.includes("IV74")) return "hst_h";
    if (p.startsWith("SF620") || p.startsWith("SF220")) return "win";
    return "generale";
}

/** Fase → prefisso identifier della colonna. */
function columnKeyForPhase(phase: string): string {
    const f = phase.toUpperCase().trim();
    if (f.startsWith("TO DO")) return "to_do";
    if (f.startsWith("CNC")) return "cnc";
    if (f.startsWith("PREPARAZ")) return "prep";
    if (f.startsWith("VERNIC")) return "finitura";
    if (f.startsWith("MONTAGG")) return "montaggio";
    if (f.startsWith("Q.C") || f.startsWith("QUALIT")) return "qualita";
    if (f.startsWith("IMBALL")) return "spedito";
    return "to_do";
}

function scopedColumnIdentifier(base: string): string {
    return `${SUBDOMAIN}_${base}`;
}

function toStr(v: unknown): string {
    if (v === null || v === undefined) return "";
    if (typeof v === "object" && v !== null && "text" in (v as object)) {
        return String((v as { text: unknown }).text ?? "");
    }
    return String(v);
}

function parseDate(v: unknown): string | null {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString();
    const d = new Date(toStr(v));
    return isNaN(d.getTime()) ? null : d.toISOString();
}

function parsePositions(v: unknown): string[] {
    return toStr(v)
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing Supabase env vars. Run with --env-file=.env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
    console.log("🗂️  Inserimento progetti Suisseframe\n");

    const { data: site, error: siteError } = await supabase
        .from("sites")
        .select("id, organization_id")
        .eq("subdomain", SUBDOMAIN)
        .single();
    if (siteError || !site) throw new Error(`Sito "${SUBDOMAIN}" non trovato: ${siteError?.message}`);
    const siteId = site.id;
    const organizationId = site.organization_id as string;

    // Boards
    const { data: boards } = await supabase
        .from("Kanban")
        .select("id, identifier")
        .eq("site_id", siteId);
    const boardIdByIdentifier = new Map<string, number>(
        (boards || []).map((b) => [b.identifier, b.id]),
    );

    // Colonne (per board)
    const { data: columns } = await supabase
        .from("KanbanColumn")
        .select("id, identifier, kanbanId")
        .in("kanbanId", (boards || []).map((b) => b.id));
    const columnIdByKey = new Map<string, number>();
    for (const c of columns || []) {
        columnIdByKey.set(`${c.kanbanId}:${c.identifier}`, c.id);
    }

    // Clienti esistenti (per nome)
    const { data: existingClients } = await supabase
        .from("Client")
        .select("id, businessName, code")
        .eq("site_id", siteId);
    const clientIdByName = new Map<string, number>();
    for (const c of existingClients || []) {
        if (c.businessName) clientIdByName.set(c.businessName.trim().toLowerCase(), c.id);
    }
    let nextClientSeq = 1;

    async function resolveClient(name: string): Promise<number | null> {
        const key = name.trim().toLowerCase();
        if (!key) return null;
        if (clientIdByName.has(key)) return clientIdByName.get(key)!;

        // Crea cliente minimale referenziato dai progetti
        let code = "";
        for (;;) {
            code = `SFP-${String(nextClientSeq).padStart(3, "0")}`;
            nextClientSeq++;
            const { data: dup } = await supabase
                .from("Client")
                .select("id")
                .eq("site_id", siteId)
                .eq("code", code)
                .maybeSingle();
            if (!dup) break;
        }

        const { data: created, error } = await supabase
            .from("Client")
            .insert({
                code,
                clientType: "BUSINESS",
                businessName: name.trim(),
                countryCode: "CH",
                site_id: siteId,
                organization_id: organizationId,
                contactPeople: [],
            })
            .select("id")
            .single();
        if (error || !created) throw new Error(`Client ${name}: ${error?.message}`);
        clientIdByName.set(key, created.id);
        console.log(`  + cliente creato: ${name} (${code})`);
        return created.id;
    }

    // Leggi Excel
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(XLSX_PATH);
    const ws = wb.getWorksheet("Progetti aperti") || wb.worksheets[0];

    const columnPositionCounter = new Map<number, number>();
    let created = 0;
    let skipped = 0;
    const unmatched: string[] = [];

    for (let r = 2; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const numero = toStr(row.getCell(1).value).trim();
        if (!numero) continue;

        const cliente = toStr(row.getCell(2).value).trim();
        const prodotto = toStr(row.getCell(3).value).trim();
        const fase = toStr(row.getCell(4).value).trim();
        const dataCreazione = parseDate(row.getCell(5).value);
        const dataConsegna = parseDate(row.getCell(6).value);
        const percentuale = Number(row.getCell(7).value) || 0;
        const ferramenta = toStr(row.getCell(8).value).trim().toLowerCase() === "si";
        const metalli = toStr(row.getCell(9).value).trim().toLowerCase() === "si";
        const altro = toStr(row.getCell(10).value).trim();
        const posizioni = parsePositions(row.getCell(11).value);
        const prezzo = Number(row.getCell(12).value) || null;

        const boardIdentifier = boardForProduct(prodotto);
        const kanbanId = boardIdByIdentifier.get(boardIdentifier);
        if (!kanbanId) {
            unmatched.push(`${numero} (board ${boardIdentifier} mancante)`);
            continue;
        }

        const colBase = `${columnKeyForPhase(fase)}_${boardIdentifier}`;
        const colId = columnIdByKey.get(`${kanbanId}:${scopedColumnIdentifier(colBase)}`);
        if (!colId) {
            unmatched.push(`${numero} (colonna ${colBase} mancante)`);
            continue;
        }

        // Idempotenza per unique_code
        const { data: existing } = await supabase
            .from("Task")
            .select("id")
            .eq("site_id", siteId)
            .eq("unique_code", numero)
            .maybeSingle();
        if (existing) {
            skipped++;
            continue;
        }

        const clientId = await resolveClient(cliente);
        const pos = (columnPositionCounter.get(colId) || 0) + 1;
        columnPositionCounter.set(colId, pos);

        const { error } = await supabase.from("Task").insert({
            site_id: siteId,
            unique_code: numero,
            title: `${numero} ${prodotto}`.trim(),
            name: `${numero} ${prodotto}`.trim(),
            task_type: "LAVORO",
            status: "open",
            clientId,
            kanbanId,
            kanbanColumnId: colId,
            column_id: colId,
            column_position: pos,
            percentStatus: Math.round(percentuale),
            sellPrice: prezzo,
            deliveryDate: dataConsegna,
            created_at: dataCreazione || undefined,
            positions: posizioni.length ? posizioni : null,
            other: altro || null,
            material: true,
            ferramenta,
            metalli,
            legno: true,
        });

        if (error) throw new Error(`Task ${numero}: ${error.message}`);
        created++;
    }

    console.log(`\n✓ Progetti inseriti: ${created} (saltati ${skipped} già presenti)`);
    if (unmatched.length) {
        console.log(`⚠️  Non mappati (${unmatched.length}):`);
        unmatched.forEach((u) => console.log(`   - ${u}`));
    }
    console.log(`\n✅ Fatto`);
}

main().catch((err) => {
    console.error("\n❌ Inserimento fallito:", err);
    process.exit(1);
});
