/**
 * Elimina utenti demo (default: email che terminano con "@example.com").
 *
 * Per ciascun utente:
 *   - pulisce junction/riferimenti (_RolesToUser, user_organizations,
 *     user_sites, Action, Errortracking, PackingControl, QualityControl,
 *     Task, Timetracking)
 *   - elimina l'account Supabase Auth
 *   - elimina il profilo dalla tabella User
 *
 * I superadmin vengono SEMPRE saltati.
 *
 * Dry-run di default. Per applicare:
 *   APPLY=1 npx tsx --env-file=.env.local scripts/delete-demo-users.ts
 * Filtro personalizzato (email suffix):
 *   SUFFIX=@example.com npx tsx --env-file=.env.local scripts/delete-demo-users.ts
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
const SERVICE_KEY =
    process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUFFIX = process.env.SUFFIX || "@example.com";
const APPLY = process.env.APPLY === "1";
// Lista esplicita di email (CLI args o env EMAILS separate da virgola).
// Se presente, ignora il filtro SUFFIX ed elimina esattamente queste email.
const EMAILS = [
    ...process.argv.slice(2).filter((a) => !a.startsWith("-")),
    ...(process.env.EMAILS?.split(",").map((s) => s.trim()).filter(Boolean) ||
        []),
];

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing Supabase env vars. Run with --env-file=.env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function cleanupUser(authId: string, userTableId: number) {
    const tablesToClean: Array<[string, string, string | number]> = [
        ["_RolesToUser", "B", userTableId],
        ["user_organizations", "user_id", authId],
        ["user_sites", "user_id", authId],
        ["Action", "userId", userTableId],
        ["Errortracking", "employee_id", userTableId],
        ["PackingControl", "userId", userTableId],
        ["QualityControl", "userId", userTableId],
        ["Task", "userId", userTableId],
        ["Timetracking", "employee_id", userTableId],
    ];

    for (const [table, column, value] of tablesToClean) {
        const { error } = await supabase.from(table).delete().eq(column, value);
        if (error) console.warn(`    ! ${table}: ${error.message}`);
    }
}

async function main() {
    const query = supabase
        .from("User")
        .select("id, authId, email, given_name, family_name, role");

    const { data: users, error } = EMAILS.length > 0
        ? await query.in("email", EMAILS).order("email")
        : await query.ilike("email", `%${SUFFIX}`).order("email");

    if (error) throw new Error(error.message);

    if (!users || users.length === 0) {
        console.log(
            EMAILS.length > 0
                ? "Nessun utente trovato per le email fornite."
                : `Nessun utente con email che termina con "${SUFFIX}".`,
        );
        return;
    }

    if (EMAILS.length > 0 && users.length !== EMAILS.length) {
        const found = new Set(users.map((u: any) => u.email));
        const missing = EMAILS.filter((e) => !found.has(e));
        console.warn(
            `\nATTENZIONE: ${missing.length} email non trovate:\n  ${
                missing.join("\n  ")
            }\n`,
        );
    }

    console.log(
        `\n${APPLY ? "APPLY" : "DRY-RUN"} — ${users.length} utenti selezionati\n`,
    );

    let deleted = 0;
    for (const u of users) {
        const label = `${(u.given_name || "").trim()} ${(u.family_name || "")
            .trim()}`.trim() + ` <${u.email}> [${u.role}]`;

        if (u.role === "superadmin") {
            console.log(`- SKIP superadmin: ${label}`);
            continue;
        }

        console.log(`- ${APPLY ? "DELETE" : "would delete"}: ${label}`);

        if (!APPLY) continue;

        if (u.authId) {
            await cleanupUser(u.authId, u.id);
            const { error: authErr } = await supabase.auth.admin.deleteUser(
                u.authId,
            );
            if (authErr && !/not found/i.test(authErr.message)) {
                console.warn(`    ! auth delete: ${authErr.message}`);
            }
        }

        const { error: profErr } = await supabase.from("User").delete().eq(
            "id",
            u.id,
        );
        if (profErr) {
            console.error(`    ! profilo: ${profErr.message}`);
        } else {
            deleted++;
        }
    }

    console.log(
        `\n${APPLY ? `Eliminati ${deleted} utenti.` : `${users.length} candidati. Esegui con APPLY=1 per eliminare.`}\n`,
    );
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
