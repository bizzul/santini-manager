/**
 * Script di verifica online per FDM.
 *
 * Controlla che:
 *  - il commit pushato corrisponda a `origin/main`
 *  - l'URL pubblica (NEXT_PUBLIC_URL) risponda 200
 *  - alcune rotte chiave restituiscano uno status coerente
 *
 * Uso:
 *   npx tsx scripts/verify-online.ts
 *   oppure dopo aver aggiunto lo script in package.json:
 *   npm run verify:online
 *
 * Variabili richieste:
 *   - NEXT_PUBLIC_URL (es. https://manager.example.com)
 *   - VERIFY_ROUTES (opzionale, comma separated, default: "/,/login")
 *   - VERIFY_EXPECTED_COMMIT (opzionale, SHA breve atteso su origin/main)
 */

import { execSync } from "node:child_process";

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";

type CheckResult = {
    name: string;
    ok: boolean;
    details?: string;
};

const results: CheckResult[] = [];

function run(cmd: string) {
    return execSync(cmd, { encoding: "utf8" }).trim();
}

function record(result: CheckResult) {
    results.push(result);
    const prefix = result.ok ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;
    const detail = result.details ? ` - ${result.details}` : "";
    console.log(`${prefix}  ${BOLD}${result.name}${RESET}${detail}`);
}

async function checkCommit() {
    try {
        run("git fetch origin --quiet");
        const localHead = run("git rev-parse HEAD");
        const remoteHead = run("git rev-parse origin/main");
        const shortLocal = localHead.slice(0, 7);
        const shortRemote = remoteHead.slice(0, 7);
        const expected = process.env.VERIFY_EXPECTED_COMMIT || shortLocal;

        record({
            name: "Local HEAD == origin/main",
            ok: localHead === remoteHead,
            details: `local=${shortLocal} remote=${shortRemote}`,
        });

        record({
            name: "Remote matches expected commit",
            ok: remoteHead.startsWith(expected),
            details: `expected=${expected} remote=${shortRemote}`,
        });
    } catch (err) {
        record({
            name: "Git verification",
            ok: false,
            details: (err as Error).message,
        });
    }
}

async function checkUrl(name: string, url: string, expectedStatus: number[]) {
    try {
        const response = await fetch(url, { method: "GET", redirect: "manual" });
        const ok = expectedStatus.includes(response.status);
        record({
            name,
            ok,
            details: `status=${response.status} url=${url}`,
        });
    } catch (err) {
        record({
            name,
            ok: false,
            details: (err as Error).message,
        });
    }
}

async function main() {
    console.log(`${YELLOW}FDM verify:online starting...${RESET}`);

    await checkCommit();

    const baseUrl = process.env.NEXT_PUBLIC_URL;
    if (!baseUrl) {
        record({
            name: "NEXT_PUBLIC_URL configured",
            ok: false,
            details: "missing env var",
        });
    } else {
        const routesRaw = process.env.VERIFY_ROUTES || "/,/login";
        const routes = routesRaw.split(",").map((r) => r.trim()).filter(Boolean);

        for (const route of routes) {
            const url = `${baseUrl.replace(/\/$/, "")}${route}`;
            await checkUrl(`GET ${route}`, url, [200, 301, 302, 307, 308]);
        }
    }

    const failed = results.filter((result) => !result.ok).length;
    const total = results.length;
    console.log("");
    console.log(
        `${BOLD}Risultato: ${failed === 0 ? GREEN : RED}${total - failed}/${total} PASS${RESET}`,
    );

    if (failed > 0) {
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
