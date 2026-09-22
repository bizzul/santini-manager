/**
 * Test di isolamento RLS — dati con prefisso ZZTEST.
 *
 * Verifica, su ognuna delle 41 tabelle messe in sicurezza piu' attendance_entries:
 *   1. senza login (chiave anon): 0 righe in lettura, scritture rifiutate;
 *   2. utente A: vede le righe del proprio spazio e ZERO righe dello spazio B;
 *   3. utente A: non riesce a scrivere con il site_id dello spazio B;
 *   4. utente A: non riesce ad auto-assegnarsi a user_sites / user_organizations
 *      dello spazio B (il buco chiuso dall'ondata C).
 *
 * La service role e' usata SOLO per setup e teardown, e viene letta da variabile
 * d'ambiente: non compare mai nel codice.
 *
 * USO — va eseguito contro SUPABASE LOCALE:
 *
 *   supabase start
 *   supabase db reset            # applica tutte le migration di supabase/migrations
 *
 *   export ZZTEST_SUPABASE_URL=http://127.0.0.1:54321
 *   export ZZTEST_SUPABASE_ANON_KEY=<anon key stampata da supabase start>
 *   export ZZTEST_SUPABASE_SERVICE_ROLE_KEY=<service_role key stampata da supabase start>
 *   npx tsx scripts/zztest-rls-isolation.ts
 *
 * Lo script si RIFIUTA di girare contro il progetto di produzione.
 * Per un branch Supabase serve ZZTEST_ALLOW_NON_LOCAL=1 esplicito.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Configurazione e guardie
// ---------------------------------------------------------------------------

const PREFIX = "ZZTEST";
const PROD_PROJECT_REF = "jzxffusiwtrvjwmpjztu";

const URL = process.env.ZZTEST_SUPABASE_URL;
const ANON_KEY = process.env.ZZTEST_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.ZZTEST_SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON_KEY || !SERVICE_KEY) {
    console.error(
        "Mancano le variabili d'ambiente ZZTEST_SUPABASE_URL, " +
            "ZZTEST_SUPABASE_ANON_KEY, ZZTEST_SUPABASE_SERVICE_ROLE_KEY.",
    );
    process.exit(1);
}

if (URL.includes(PROD_PROJECT_REF)) {
    console.error(
        `RIFIUTO DI ESEGUIRE: ZZTEST_SUPABASE_URL punta al progetto di produzione (${PROD_PROJECT_REF}).`,
    );
    process.exit(1);
}

const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?/.test(URL);
if (!isLocal && process.env.ZZTEST_ALLOW_NON_LOCAL !== "1") {
    console.error(
        `RIFIUTO DI ESEGUIRE: ${URL} non e' un'istanza locale.\n` +
            "Per un branch Supabase dedicato, esportare ZZTEST_ALLOW_NON_LOCAL=1.",
    );
    process.exit(1);
}

const PASSWORD = "zztest-Rls-2026!";
const EMAIL_A = "zztest.a@example.com";
const EMAIL_B = "zztest.b@example.com";

const svc = createClient(URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Utilita' di reporting
// ---------------------------------------------------------------------------

type Result = { ok: boolean; name: string; detail?: string };
const results: Result[] = [];

function check(name: string, ok: boolean, detail?: string) {
    results.push({ ok, name, detail });
    const mark = ok ? "  ok  " : " FAIL ";
    console.log(`[${mark}] ${name}${detail && !ok ? `  -> ${detail}` : ""}`);
}

function section(title: string) {
    console.log(`\n=== ${title} ${"=".repeat(Math.max(0, 66 - title.length))}`);
}

const rnd = Math.random().toString(36).slice(2, 8);
const tag = (s: string) => `${PREFIX}-${s}-${rnd}`;

// Ids raccolti in setup, usati per asserzioni e teardown.
type Ids = Record<string, (string | number)[]>;
const ids: { a: Ids; b: Ids } = { a: {}, b: {} };

function remember(side: "a" | "b", table: string, id: string | number | null | undefined) {
    if (id === null || id === undefined) return;
    (ids[side][table] ||= []).push(id);
}

async function insert(
    side: "a" | "b",
    table: string,
    row: Record<string, unknown>,
    pk = "id",
): Promise<any> {
    const { data, error } = await svc.from(table).insert(row).select().single();
    if (error) {
        throw new Error(`setup: insert su ${table} (${side}) fallito: ${error.message}`);
    }
    remember(side, table, (data as any)[pk]);
    return data;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

type SideCtx = {
    side: "a" | "b";
    orgId: string;
    siteId: string;
    authId: string;
    userRowId: number;
    taskId: number;
    kanbanId: number;
    clientId: number;
    supplierId: number;
    timetrackingId: number;
    packingControlId: number;
    qualityControlId: number;
    errortrackingId: number;
    inventoryCategoryId: string;
    inventoryItemId: string;
    roleId: number;
};

async function createAuthUser(email: string): Promise<string> {
    // Se esiste da un run precedente, riusalo.
    const { data: list } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = (list?.users as { id: string; email?: string }[] | undefined)
        ?.find((u) => u.email === email);
    if (existing) return existing.id;

    const { data, error } = await svc.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
    });
    if (error || !data.user) {
        throw new Error(`setup: creazione utente auth ${email} fallita: ${error?.message}`);
    }
    return data.user.id;
}

async function setupSide(side: "a" | "b", email: string): Promise<SideCtx> {
    const label = side.toUpperCase();

    // Organizzazioni separate: user_can_access_site() concede l'accesso anche
    // per appartenenza all'ORGANIZZAZIONE del sito, quindi due siti nella
    // stessa organizzazione sarebbero reciprocamente accessibili per disegno.
    const org = await insert(side, "organizations", { name: tag(`Org ${label}`) });
    const site = await insert(side, "sites", {
        name: tag(`Site ${label}`),
        subdomain: tag(`site-${side}`).toLowerCase(),
        organization_id: org.id,
    });

    const authId = await createAuthUser(email);
    const user = await insert(side, "User", {
        authId,
        auth_id: authId,
        email,
        given_name: PREFIX,
        family_name: label,
        role: "user",
        enabled: true,
    });

    await insert(side, "user_organizations", { user_id: authId, organization_id: org.id });
    await insert(side, "user_sites", { user_id: authId, site_id: site.id });

    const siteId = site.id as string;

    // --- ondata A -----------------------------------------------------------
    const kanbanCategory = await insert(side, "KanbanCategory", {
        name: tag(`Cat ${label}`), identifier: tag(`cat-${side}`), site_id: siteId,
    });
    const kanban = await insert(side, "Kanban", {
        title: tag(`Kanban ${label}`), identifier: tag(`kb-${side}`),
        site_id: siteId, category_id: kanbanCategory.id,
    });
    const client = await insert(side, "Client", {
        code: tag(`CLI-${side}`), site_id: siteId, organization_id: org.id,
    });
    const supplier = await insert(side, "Supplier", {
        name: tag(`Sup ${label}`), description: tag("desc"), site_id: siteId,
    });
    const productCategory = await insert(side, "Product_category", {
        name: tag(`PCat ${label}`), description: tag("desc"), site_id: siteId,
    });
    await insert(side, "Product", {
        name: tag(`Prod ${label}`), unit_price: 1, quantity: 1,
        site_id: siteId, categoryId: productCategory.id,
    });
    await insert(side, "Department", {
        name: tag(`Dep ${label}`), description: tag("desc"), site_id: siteId,
    });
    const task = await insert(side, "Task", {
        title: tag(`Task ${label}`), site_id: siteId, kanbanId: kanban.id,
    });
    const timetracking = await insert(side, "Timetracking", {
        use_cnc: false, totalTime: 1, site_id: siteId, task_id: task.id,
    });
    const errortracking = await insert(side, "Errortracking", {
        error_type: tag("type"), error_category: tag("cat"),
        task_id: task.id, employee_id: user.id,
        description: tag(`Err ${label}`), site_id: siteId,
    });
    await insert(side, "Action", {
        type: tag(`action-${side}`), data: { zztest: true },
        site_id: siteId, taskId: task.id,
    });
    await insert(side, "Exit_checklist", {
        name: tag(`Exit ${label}`), task_id: task.id, employee_id: user.id,
        position: tag("pos"), date: new Date().toISOString(), site_id: siteId,
    });
    const packingControl = await insert(side, "PackingControl", {
        taskId: task.id, userId: user.id, site_id: siteId,
    });
    await insert(side, "PackingMasterItem", { name: tag(`PMI ${label}`), site_id: siteId });
    await insert(side, "QcMasterItem", { name: tag(`QMI ${label}`), site_id: siteId });
    const qualityControl = await insert(side, "QualityControl", {
        position_nr: tag("pos"), taskId: task.id, userId: user.id, site_id: siteId,
    });
    await insert(side, "site_modules", { site_id: siteId, module_name: tag(`mod-${side}`) });

    const invCategory = await insert(side, "inventory_categories", {
        site_id: siteId, name: tag(`InvCat ${label}`),
    });
    const invItem = await insert(side, "inventory_items", {
        site_id: siteId, name: tag(`InvItem ${label}`), category_id: invCategory.id,
    });
    await insert(side, "inventory_item_variants", { site_id: siteId, item_id: invItem.id });
    await insert(side, "inventory_suppliers", { site_id: siteId, name: tag(`InvSup ${label}`) });
    await insert(side, "inventory_warehouses", { site_id: siteId, name: tag(`InvWh ${label}`) });
    await insert(side, "inventory_subcategory_images", {
        site_id: siteId, category_id: invCategory.id,
        subcategory_key: tag(`sub-${side}`), subcategory_name: tag(`Sub ${label}`),
    });

    // --- ondata B -----------------------------------------------------------
    await insert(side, "KanbanColumn", {
        title: tag(`Col ${label}`), identifier: tag(`col-${side}`),
        position: 1, kanbanId: kanban.id,
    });
    await insert(side, "TaskHistory", { taskId: task.id, snapshot: { zztest: true } });
    await insert(side, "TaskSupplier", { taskId: task.id, supplierId: supplier.id });
    await insert(side, "ClientAddress", { clientId: client.id, address: tag(`Via ${label}`) });
    await insert(side, "File", {
        name: tag(`File ${label}`), url: `https://example.invalid/${tag("f")}`, taskId: task.id,
    });
    await insert(side, "PackingItem", {
        name: tag(`PItem ${label}`), packingControlId: packingControl.id,
    });
    await insert(side, "Qc_item", {
        name: tag(`QItem ${label}`), qualityControlId: qualityControl.id,
    });

    const role = await insert(side, "Roles", { name: tag(`Role ${label}`), site_id: siteId });
    // tabelle di join Prisma: nessuna colonna id, si tracciano a parte
    {
        const { error } = await svc.from("_RolesToTimetracking")
            .insert({ A: role.id, B: timetracking.id });
        if (error) throw new Error(`setup: _RolesToTimetracking (${side}): ${error.message}`);
        (ids[side]["_RolesToTimetracking"] ||= []).push(`${role.id}:${timetracking.id}`);
    }
    {
        const { error } = await svc.from("_RolesToUser").insert({ A: role.id, B: user.id });
        if (error) throw new Error(`setup: _RolesToUser (${side}): ${error.message}`);
        (ids[side]["_RolesToUser"] ||= []).push(`${role.id}:${user.id}`);
    }

    // --- ondata C / fix -----------------------------------------------------
    await insert(side, "attendance_entries", {
        site_id: siteId, user_id: authId,
        date: new Date().toISOString().slice(0, 10), status: "presente",
    });
    await insert(side, "audit_logs", {
        action: tag(`audit-${side}`), table_name: "Task", user_id: authId,
    });

    return {
        side, orgId: org.id, siteId, authId, userRowId: user.id,
        taskId: task.id, kanbanId: kanban.id, clientId: client.id,
        supplierId: supplier.id, timetrackingId: timetracking.id,
        packingControlId: packingControl.id, qualityControlId: qualityControl.id,
        errortrackingId: errortracking.id,
        inventoryCategoryId: invCategory.id, inventoryItemId: invItem.id,
        roleId: role.id,
    };
}

async function setupGlobals() {
    // Tabelle globali senza tenant: una riga ciascuna, condivisa.
    const { data: unit, error: unitErr } = await svc.from("inventory_units")
        .insert({ code: tag("U"), name: tag("Unit"), unit_type: "count" })
        .select().single();
    if (unitErr) throw new Error(`setup: inventory_units: ${unitErr.message}`);
    remember("a", "inventory_units", unit.id);

    const { data: ci, error: ciErr } = await svc.from("Checklist_item")
        .insert({ name: tag("Checklist") }).select().single();
    if (ciErr) throw new Error(`setup: Checklist_item: ${ciErr.message}`);
    remember("a", "Checklist_item", ci.id);
}

// ---------------------------------------------------------------------------
// Specifica delle tabelle da verificare
// ---------------------------------------------------------------------------

type Spec = {
    table: string;
    wave: "A" | "B" | "C" | "fix";
    /** colonna chiave primaria usata per le asserzioni; null = tabella di join */
    pk: string | null;
    /** colonna testuale con il prefisso ZZTEST, per il conteggio finale */
    textCol?: string;
    /** colonna con il site_id, per il test di scrittura cross-tenant */
    siteCol?: string;
    /** true = tabella globale, A e B vedono le stesse righe: niente test di isolamento */
    global?: boolean;
    /** true = leggibile solo dal superadmin: A non deve vedere nemmeno le proprie righe */
    superadminOnly?: boolean;
};

const SPECS: Spec[] = [
    // ondata A
    { table: "Task", wave: "A", pk: "id", textCol: "title", siteCol: "site_id" },
    { table: "Kanban", wave: "A", pk: "id", textCol: "title", siteCol: "site_id" },
    { table: "KanbanCategory", wave: "A", pk: "id", textCol: "name", siteCol: "site_id" },
    { table: "Client", wave: "A", pk: "id", textCol: "code", siteCol: "site_id" },
    { table: "Supplier", wave: "A", pk: "id", textCol: "name", siteCol: "site_id" },
    { table: "Product", wave: "A", pk: "id", textCol: "name", siteCol: "site_id" },
    { table: "Product_category", wave: "A", pk: "id", textCol: "name", siteCol: "site_id" },
    { table: "Department", wave: "A", pk: "id", textCol: "name", siteCol: "site_id" },
    { table: "Timetracking", wave: "A", pk: "id", siteCol: "site_id" },
    { table: "Errortracking", wave: "A", pk: "id", textCol: "description", siteCol: "site_id" },
    { table: "Action", wave: "A", pk: "id", textCol: "type", siteCol: "site_id" },
    { table: "Exit_checklist", wave: "A", pk: "id", textCol: "name", siteCol: "site_id" },
    { table: "PackingControl", wave: "A", pk: "id", siteCol: "site_id" },
    { table: "PackingMasterItem", wave: "A", pk: "id", textCol: "name", siteCol: "site_id" },
    { table: "QcMasterItem", wave: "A", pk: "id", textCol: "name", siteCol: "site_id" },
    { table: "QualityControl", wave: "A", pk: "id", textCol: "position_nr", siteCol: "site_id" },
    { table: "site_modules", wave: "A", pk: "id", textCol: "module_name", siteCol: "site_id" },
    { table: "inventory_categories", wave: "A", pk: "id", textCol: "name", siteCol: "site_id" },
    { table: "inventory_items", wave: "A", pk: "id", textCol: "name", siteCol: "site_id" },
    { table: "inventory_item_variants", wave: "A", pk: "id", siteCol: "site_id" },
    { table: "inventory_suppliers", wave: "A", pk: "id", textCol: "name", siteCol: "site_id" },
    { table: "inventory_warehouses", wave: "A", pk: "id", textCol: "name", siteCol: "site_id" },
    { table: "inventory_subcategory_images", wave: "A", pk: "id", textCol: "subcategory_name", siteCol: "site_id" },

    // ondata B
    { table: "KanbanColumn", wave: "B", pk: "id", textCol: "title" },
    { table: "TaskHistory", wave: "B", pk: "id" },
    { table: "TaskSupplier", wave: "B", pk: "id" },
    { table: "ClientAddress", wave: "B", pk: "id", textCol: "address" },
    { table: "File", wave: "B", pk: "id", textCol: "name" },
    { table: "PackingItem", wave: "B", pk: "id", textCol: "name" },
    { table: "Qc_item", wave: "B", pk: "id", textCol: "name" },
    { table: "_RolesToTimetracking", wave: "B", pk: null },
    { table: "_RolesToUser", wave: "B", pk: null },
    { table: "Checklist_item", wave: "B", pk: "id", textCol: "name", global: true, superadminOnly: true },

    // ondata C
    { table: "User", wave: "C", pk: "id", textCol: "given_name" },
    { table: "sites", wave: "C", pk: "id", textCol: "name" },
    { table: "organizations", wave: "C", pk: "id", textCol: "name" },
    { table: "user_sites", wave: "C", pk: "id" },
    { table: "user_organizations", wave: "C", pk: "id" },
    { table: "audit_logs", wave: "C", pk: "id", textCol: "action", superadminOnly: true },
    { table: "Roles", wave: "C", pk: "id", textCol: "name", siteCol: "site_id" },
    { table: "inventory_units", wave: "C", pk: "id", textCol: "name", global: true },

    // fix su tabella gia' con RLS
    { table: "attendance_entries", wave: "fix", pk: "id", siteCol: "site_id" },
];

// ---------------------------------------------------------------------------
// Asserzioni
// ---------------------------------------------------------------------------

async function signIn(email: string): Promise<SupabaseClient> {
    const client = createClient(URL!, ANON_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
    if (error) throw new Error(`login ${email} fallito: ${error.message}`);
    return client;
}

function idsOf(side: "a" | "b", table: string): (string | number)[] {
    return ids[side][table] ?? [];
}

/** 1. Anonimo: 0 righe su tutte le tabelle, scritture rifiutate. */
async function assertAnon() {
    section("1. Senza login (chiave anon)");
    const anon = createClient(URL!, ANON_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    for (const spec of SPECS) {
        const all = [...idsOf("a", spec.table), ...idsOf("b", spec.table)];
        if (!all.length || spec.pk === null) {
            // tabelle di join: si conta tutto
            const { data, error } = await anon.from(spec.table).select("*").limit(5);
            check(`anon · ${spec.table} · 0 righe`,
                !!error || (data?.length ?? 0) === 0,
                error ? error.message : `${data?.length} righe visibili`);
            continue;
        }
        const { data, error } = await anon.from(spec.table).select(spec.pk).in(spec.pk, all as any);
        check(`anon · ${spec.table} · 0 righe`,
            !!error || (data?.length ?? 0) === 0,
            error ? error.message : `${data?.length} righe visibili`);
    }

    // Scritture anonime
    const writes: [string, Record<string, unknown>][] = [
        ["Task", { title: tag("anon"), site_id: ids.a["sites"]?.[0] }],
        ["attendance_entries", {
            site_id: ids.a["sites"]?.[0], user_id: ids.a["User"]?.[0],
            date: "2026-01-01", status: "presente",
        }],
        ["user_sites", { user_id: ids.a["User"]?.[0], site_id: ids.b["sites"]?.[0] }],
    ];
    for (const [table, row] of writes) {
        const { error } = await anon.from(table).insert(row as any);
        check(`anon · ${table} · insert rifiutata`, !!error, "insert riuscita");
    }
}

/** 2 e 3. Utente A: vede solo il proprio spazio, non scrive sullo spazio B. */
async function assertUser(ctxA: SideCtx, ctxB: SideCtx) {
    section("2. Utente A: isolamento in lettura");
    const a = await signIn(EMAIL_A);

    for (const spec of SPECS) {
        if (spec.pk === null) continue; // trattate a parte
        const mine = idsOf("a", spec.table);
        const theirs = idsOf("b", spec.table);

        if (!spec.global) {
            const { data: other, error: otherErr } = await a
                .from(spec.table).select(spec.pk).in(spec.pk, theirs as any);
            check(`A · ${spec.table} · 0 righe dello spazio B`,
                !otherErr && (other?.length ?? 0) === 0,
                otherErr ? otherErr.message : `${other?.length} righe di B visibili`);
        }

        const { data: own, error: ownErr } = await a
            .from(spec.table).select(spec.pk).in(spec.pk, mine as any);
        if (spec.superadminOnly) {
            check(`A · ${spec.table} · riservata al superadmin`,
                !ownErr && (own?.length ?? 0) === 0,
                ownErr ? ownErr.message : `${own?.length} righe visibili`);
        } else {
            check(`A · ${spec.table} · vede le proprie ${mine.length} righe`,
                !ownErr && (own?.length ?? 0) === mine.length,
                ownErr ? ownErr.message : `viste ${own?.length}/${mine.length}`);
        }
    }

    // tabelle di join: A deve vedere solo la coppia legata al proprio spazio
    for (const table of ["_RolesToTimetracking", "_RolesToUser"] as const) {
        const { data, error } = await a.from(table).select("A,B");
        const rows = (data ?? []) as { A: number; B: number }[];
        const forbiddenA = table === "_RolesToTimetracking" ? ctxB.roleId : ctxB.roleId;
        const leaked = rows.some((r) => r.A === forbiddenA);
        check(`A · ${table} · nessuna riga dello spazio B`, !error && !leaked,
            error ? error.message : "riga di B visibile");
    }

    section("3. Utente A: scritture cross-tenant rifiutate");

    for (const spec of SPECS) {
        if (!spec.siteCol) continue;
        const row: Record<string, unknown> = { [spec.siteCol]: ctxB.siteId };
        // campi obbligatori minimi per tabella
        Object.assign(row, MINIMAL_ROWS[spec.table]?.(ctxB) ?? {});
        const { error } = await a.from(spec.table).insert(row as any);
        check(`A · ${spec.table} · insert con site_id di B rifiutata`,
            !!error, "insert riuscita");
    }

    // update cross-tenant: 0 righe toccate oppure errore
    {
        const { data, error } = await a.from("Task")
            .update({ title: tag("hijack") }).eq("id", ctxB.taskId).select("id");
        check("A · Task · update di una riga di B senza effetto",
            !!error || (data?.length ?? 0) === 0,
            `${data?.length} righe aggiornate`);
    }
    {
        const { data, error } = await a.from("Task")
            .delete().eq("id", ctxB.taskId).select("id");
        check("A · Task · delete di una riga di B senza effetto",
            !!error || (data?.length ?? 0) === 0,
            `${data?.length} righe cancellate`);
    }

    section("4. Utente A: auto-assegnazione a spazio e organizzazione di B");
    {
        const { error } = await a.from("user_sites")
            .insert({ user_id: ctxA.authId, site_id: ctxB.siteId });
        check("A · user_sites · auto-assegnazione allo spazio di B rifiutata",
            !!error, "insert riuscita: il buco e' ancora aperto");
    }
    {
        const { error } = await a.from("user_organizations")
            .insert({ user_id: ctxA.authId, organization_id: ctxB.orgId });
        check("A · user_organizations · auto-assegnazione all'organizzazione di B rifiutata",
            !!error, "insert riuscita: il buco e' ancora aperto");
    }
    {
        const { data, error } = await a.from("User").select("id").eq("id", ctxB.userRowId);
        check("A · User · non vede l'utente di B",
            !error && (data?.length ?? 0) === 0,
            error ? error.message : "utente di B visibile");
    }

    await a.auth.signOut();
}

/** Campi obbligatori minimi per i tentativi di insert cross-tenant. */
const MINIMAL_ROWS: Record<string, (ctx: SideCtx) => Record<string, unknown>> = {
    Client: () => ({ code: tag("X") }),
    Supplier: () => ({ name: tag("X"), description: tag("X") }),
    Product: () => ({ name: tag("X"), unit_price: 1, quantity: 1 }),
    Product_category: () => ({ name: tag("X"), description: tag("X") }),
    Department: () => ({ name: tag("X"), description: tag("X") }),
    Kanban: () => ({ title: tag("X"), identifier: tag("x") }),
    KanbanCategory: () => ({ name: tag("X"), identifier: tag("x") }),
    Timetracking: () => ({ use_cnc: false, totalTime: 1 }),
    Errortracking: (c) => ({
        error_type: tag("X"), error_category: tag("X"),
        task_id: c.taskId, employee_id: c.userRowId, description: tag("X"),
    }),
    Action: () => ({ type: tag("X"), data: {} }),
    Exit_checklist: (c) => ({
        name: tag("X"), task_id: c.taskId, employee_id: c.userRowId,
        position: tag("X"), date: new Date().toISOString(),
    }),
    PackingControl: (c) => ({ taskId: c.taskId, userId: c.userRowId }),
    PackingMasterItem: () => ({ name: tag("X") }),
    QcMasterItem: () => ({ name: tag("X") }),
    QualityControl: (c) => ({ position_nr: tag("X"), taskId: c.taskId, userId: c.userRowId }),
    site_modules: () => ({ module_name: tag("x") }),
    inventory_categories: () => ({ name: tag("X") }),
    inventory_items: () => ({ name: tag("X") }),
    inventory_item_variants: (c) => ({ item_id: c.inventoryItemId }),
    inventory_suppliers: () => ({ name: tag("X") }),
    inventory_warehouses: () => ({ name: tag("X") }),
    inventory_subcategory_images: (c) => ({
        category_id: c.inventoryCategoryId,
        subcategory_key: tag("x"), subcategory_name: tag("X"),
    }),
    Roles: () => ({ name: tag("X") }),
    attendance_entries: (c) => ({
        user_id: c.authId, date: "2026-02-02", status: "presente",
    }),
};

// ---------------------------------------------------------------------------
// Comportamento documentato: due siti nella STESSA organizzazione
// ---------------------------------------------------------------------------
// Non e' un fallimento: user_can_access_site() concede l'accesso anche per
// appartenenza all'organizzazione del sito. Il test lo verifica e lo stampa,
// perche' e' la ragione per cui il setup usa due organizzazioni distinte.

async function assertOrgScopeIsDocumented(ctxA: SideCtx) {
    section("5. Comportamento documentato: accesso via organizzazione");

    const extraSite = await insert("a", "sites", {
        name: tag("Site A2"),
        subdomain: tag("site-a2").toLowerCase(),
        organization_id: ctxA.orgId,
    });
    const extraTask = await insert("a", "Task", {
        title: tag("Task A2"), site_id: extraSite.id,
    });

    const a = await signIn(EMAIL_A);
    const { data } = await a.from("Task").select("id").eq("id", extraTask.id);
    check(
        "A vede i task di un ALTRO sito della propria organizzazione (per disegno di user_can_access_site)",
        (data?.length ?? 0) === 1,
        "l'accesso per organizzazione non funziona piu': verificare user_can_access_site()",
    );
    await a.auth.signOut();
}

// ---------------------------------------------------------------------------
// Teardown
// ---------------------------------------------------------------------------

/** Ordine inverso alle dipendenze FK. */
const TEARDOWN_ORDER = [
    "audit_logs", "attendance_entries",
    "_RolesToUser", "_RolesToTimetracking",
    "Qc_item", "PackingItem", "File", "ClientAddress",
    "TaskSupplier", "TaskHistory", "KanbanColumn",
    "Checklist_item", "inventory_units",
    "inventory_subcategory_images", "inventory_item_variants", "inventory_items",
    "inventory_warehouses", "inventory_suppliers", "inventory_categories",
    "site_modules", "QualityControl", "QcMasterItem", "PackingMasterItem",
    "PackingControl", "Exit_checklist", "Action", "Errortracking",
    "Timetracking", "Task", "Department", "Product", "Product_category",
    "Supplier", "Client", "Kanban", "KanbanCategory", "Roles",
    "user_sites", "user_organizations", "User", "sites", "organizations",
];

async function teardown() {
    section("Teardown");

    for (const table of TEARDOWN_ORDER) {
        const all = [...idsOf("a", table), ...idsOf("b", table)];
        if (!all.length) continue;

        if (table === "_RolesToUser" || table === "_RolesToTimetracking") {
            for (const pair of all as string[]) {
                const [A, B] = pair.split(":").map(Number);
                const { error } = await svc.from(table).delete().eq("A", A).eq("B", B);
                if (error) console.warn(`  teardown ${table} (${pair}): ${error.message}`);
            }
            continue;
        }

        const { error } = await svc.from(table).delete().in("id", all as any);
        if (error) console.warn(`  teardown ${table}: ${error.message}`);
    }

    // Utenti auth
    for (const email of [EMAIL_A, EMAIL_B]) {
        const { data: list } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const u = (list?.users as { id: string; email?: string }[] | undefined)
            ?.find((x) => x.email === email);
        if (u) {
            const { error } = await svc.auth.admin.deleteUser(u.id);
            if (error) console.warn(`  teardown auth ${email}: ${error.message}`);
        }
    }
}

/** Conteggio finale per prefisso, tabella per tabella. Deve essere 0 ovunque. */
async function verifyTeardown() {
    section("Verifica teardown — deve essere 0 su ogni tabella");

    let residui = 0;
    for (const spec of SPECS) {
        if (spec.textCol) {
            const { count, error } = await svc
                .from(spec.table)
                .select("*", { count: "exact", head: true })
                .like(spec.textCol, `${PREFIX}-%`);
            if (error) {
                console.log(`  ${spec.table.padEnd(30)} errore: ${error.message}`);
                residui++;
                continue;
            }
            console.log(`  ${spec.table.padEnd(30)} ${count ?? 0} righe ${PREFIX}`);
            if ((count ?? 0) > 0) residui++;
        } else {
            // nessuna colonna testuale: verifica per id raccolti
            const all = [...idsOf("a", spec.table), ...idsOf("b", spec.table)];
            if (!all.length) {
                console.log(`  ${spec.table.padEnd(30)} 0 righe (verifica per id)`);
                continue;
            }
            if (spec.pk === null) {
                console.log(`  ${spec.table.padEnd(30)} verifica per coppia (A,B)`);
                continue;
            }
            const { count, error } = await svc
                .from(spec.table)
                .select("*", { count: "exact", head: true })
                .in(spec.pk, all as any);
            if (error) {
                console.log(`  ${spec.table.padEnd(30)} errore: ${error.message}`);
                residui++;
                continue;
            }
            console.log(`  ${spec.table.padEnd(30)} ${count ?? 0} righe (verifica per id)`);
            if ((count ?? 0) > 0) residui++;
        }
    }

    check("Teardown completo: 0 righe ZZTEST residue", residui === 0,
        `${residui} tabelle con residui`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    console.log(`Target: ${URL}`);
    console.log(`Prefisso dati di test: ${PREFIX}-*-${rnd}\n`);

    let setupOk = false;
    try {
        section("Setup (service role)");
        const ctxA = await setupSide("a", EMAIL_A);
        const ctxB = await setupSide("b", EMAIL_B);
        await setupGlobals();
        setupOk = true;
        console.log("  setup completato");

        await assertAnon();
        await assertUser(ctxA, ctxB);
        await assertOrgScopeIsDocumented(ctxA);
    } catch (e) {
        console.error(`\nERRORE: ${(e as Error).message}`);
        results.push({ ok: false, name: "esecuzione", detail: (e as Error).message });
    } finally {
        if (setupOk || Object.keys(ids.a).length || Object.keys(ids.b).length) {
            await teardown();
            await verifyTeardown();
        }
    }

    section("Riepilogo");
    const failed = results.filter((r) => !r.ok);
    console.log(`  ${results.length - failed.length}/${results.length} asserzioni superate`);
    if (failed.length) {
        console.log("\n  Fallite:");
        for (const f of failed) console.log(`   - ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    }
    process.exit(failed.length ? 1 : 0);
}

main();
