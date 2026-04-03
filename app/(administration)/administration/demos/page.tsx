import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, BarChart3, Plus, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getUserContext } from "@/lib/auth-utils";
import { listDemoWorkspaces } from "@/lib/demo/service";
import { filterDemoWorkspaceList } from "@/lib/demo/list-utils";

export const dynamic = "force-dynamic";

function statusLabel(status: string) {
    switch (status) {
        case "active":
            return "Attiva";
        case "revoked":
            return "Revocata";
        case "expired":
            return "Scaduta";
        case "failed":
            return "Errore";
        default:
            return "Provisioning";
    }
}

function getParamValue(value?: string | string[]) {
    return Array.isArray(value) ? value[0] : value || "";
}

export default async function DemosPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const userContext = await getUserContext();

    if (!userContext) {
        redirect("/login");
    }

    if (!userContext.canAccessAllOrganizations) {
        redirect("/administration");
    }

    const rawSearchParams = await searchParams;
    const allDemos = await listDemoWorkspaces();
    const filters = {
        query: getParamValue(rawSearchParams.q),
        status: getParamValue(rawSearchParams.status) || "all",
        template: getParamValue(rawSearchParams.template) || "all",
        sector: getParamValue(rawSearchParams.sector) || "all",
        sort: (getParamValue(rawSearchParams.sort) || "recent") as
            | "recent"
            | "last-login"
            | "most-logins"
            | "expiring",
    };
    const demos = filterDemoWorkspaceList(allDemos, filters);
    const activeDemos = allDemos.filter((demo) => demo.workspace.status === "active");
    const revokedDemos = allDemos.filter((demo) => demo.workspace.status === "revoked");
    const expiredDemos = allDemos.filter((demo) => demo.workspace.status === "expired");
    const templates = Array.from(
        new Set(allDemos.map((demo) => demo.workspace.template_key)),
    );
    const sectors = Array.from(
        new Set(allDemos.map((demo) => demo.workspace.sector_key)),
    );

    return (
        <div className="relative z-10 min-h-screen px-4 py-12">
            <div className="mx-auto max-w-7xl space-y-8">
                <div className="flex flex-col items-center gap-6">
                    <Image
                        src="/logo-bianco.svg"
                        alt="Full Data Manager Logo"
                        width={60}
                        height={60}
                    />
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <Link href="/administration">
                            <Button variant="ghost" className="text-white hover:bg-white/10">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                        </Link>
                        <Link href="/administration/demos/create">
                            <Button className="bg-white text-slate-900 hover:bg-white/90">
                                <Plus className="mr-2 h-4 w-4" />
                                Crea Demo
                            </Button>
                        </Link>
                    </div>
                    <div className="text-center text-white">
                        <h1 className="text-4xl font-bold">Demo QR</h1>
                        <p className="mt-2 text-lg text-white/70">
                            Elenco demo, accessi, scadenze e stato dei token.
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/20 bg-white/10 p-5 text-white">
                        <p className="text-sm uppercase tracking-[0.2em] text-white/60">
                            Demo totali
                        </p>
                        <p className="mt-3 text-3xl font-semibold">{demos.length}</p>
                    </div>
                    <div className="rounded-2xl border border-white/20 bg-white/10 p-5 text-white">
                        <p className="text-sm uppercase tracking-[0.2em] text-white/60">
                            Attive
                        </p>
                        <p className="mt-3 text-3xl font-semibold">
                            {activeDemos.length}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/20 bg-white/10 p-5 text-white">
                        <p className="text-sm uppercase tracking-[0.2em] text-white/60">Login registrati</p>
                        <p className="mt-3 text-3xl font-semibold">
                            {allDemos.reduce((total, demo) => total + (demo.workspace.login_count || 0), 0)}
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-5 text-white/80">
                        <p className="text-sm uppercase tracking-[0.2em] text-white/50">Scadute</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{expiredDemos.length}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-5 text-white/80">
                        <p className="text-sm uppercase tracking-[0.2em] text-white/50">Revocate</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{revokedDemos.length}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-5 text-white/80">
                        <p className="text-sm uppercase tracking-[0.2em] text-white/50">Landing view</p>
                        <p className="mt-2 text-2xl font-semibold text-white">
                            {allDemos.reduce((total, demo) => total + (demo.workspace.landing_view_count || 0), 0)}
                        </p>
                    </div>
                </div>

                <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
                    <form className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
                        <input
                            name="q"
                            defaultValue={filters.query}
                            placeholder="Cerca demo, prospect, subdomain..."
                            className="h-10 rounded-md border border-white/20 bg-slate-950/60 px-3 text-sm text-white placeholder:text-white/40"
                        />
                        <select
                            name="status"
                            defaultValue={filters.status}
                            className="h-10 rounded-md border border-white/20 bg-slate-950/60 px-3 text-sm text-white"
                        >
                            <option value="all">Tutti gli stati</option>
                            <option value="active">Attive</option>
                            <option value="expired">Scadute</option>
                            <option value="revoked">Revocate</option>
                            <option value="failed">Errore</option>
                            <option value="provisioning">Provisioning</option>
                        </select>
                        <select
                            name="template"
                            defaultValue={filters.template}
                            className="h-10 rounded-md border border-white/20 bg-slate-950/60 px-3 text-sm text-white"
                        >
                            <option value="all">Tutti i template</option>
                            {templates.map((template) => (
                                <option key={template} value={template}>
                                    {template}
                                </option>
                            ))}
                        </select>
                        <select
                            name="sector"
                            defaultValue={filters.sector}
                            className="h-10 rounded-md border border-white/20 bg-slate-950/60 px-3 text-sm text-white"
                        >
                            <option value="all">Tutti i settori</option>
                            {sectors.map((sector) => (
                                <option key={sector} value={sector}>
                                    {sector}
                                </option>
                            ))}
                        </select>
                        <select
                            name="sort"
                            defaultValue={filters.sort}
                            className="h-10 rounded-md border border-white/20 bg-slate-950/60 px-3 text-sm text-white"
                        >
                            <option value="recent">Piu' recenti</option>
                            <option value="last-login">Ultimo login</option>
                            <option value="most-logins">Piu' login</option>
                            <option value="expiring">Scadenza vicina</option>
                        </select>
                        <div className="flex gap-2">
                            <Button type="submit" className="bg-white text-slate-900 hover:bg-white/90">
                                Filtra
                            </Button>
                            <Link href="/administration/demos">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="border-white/20 bg-transparent text-white hover:bg-white/10"
                                >
                                    Reset
                                </Button>
                            </Link>
                        </div>
                    </form>
                    <p className="mt-3 text-sm text-white/60">
                        {demos.length} risultati su {allDemos.length} demo.
                    </p>
                </div>

                <div className="overflow-hidden rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl">
                    <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5 text-white">
                        <BarChart3 className="h-5 w-5" />
                        <h2 className="text-xl font-semibold">Lista demo</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-white/5 text-left text-white/70">
                                <tr>
                                    <th className="px-6 py-4">Demo</th>
                                    <th className="px-6 py-4">Template</th>
                                    <th className="px-6 py-4">Stato</th>
                                    <th className="px-6 py-4">Ultimo login</th>
                                    <th className="px-6 py-4">Accessi</th>
                                    <th className="px-6 py-4">Scadenza</th>
                                    <th className="px-6 py-4">QR</th>
                                    <th className="px-6 py-4">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10 text-white">
                                {demos.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-16 text-center text-white/60">
                                            Nessuna demo creata.
                                        </td>
                                    </tr>
                                )}
                                {demos.map((demo) => (
                                    <tr key={demo.workspace.id} className="hover:bg-white/5">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium">{demo.workspace.display_name}</p>
                                                <p className="text-white/60">
                                                    {demo.workspace.customer_company || demo.workspace.customer_name}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p>{demo.workspace.template_key}</p>
                                                <p className="text-white/60">{demo.workspace.sector_key}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge className="border-white/20 bg-white/10 text-white">
                                                {statusLabel(demo.workspace.status)}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-white/80">
                                            {demo.workspace.last_login_at
                                                ? new Date(demo.workspace.last_login_at).toLocaleString()
                                                : "Mai"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p>{demo.workspace.login_count} login</p>
                                                <p className="text-white/60">
                                                    {demo.workspace.landing_view_count} landing view
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-white/80">
                                            {demo.workspace.expires_at
                                                ? new Date(demo.workspace.expires_at).toLocaleDateString()
                                                : "-"}
                                        </td>
                                        <td className="px-6 py-4">
                                            {demo.activeUrl ? (
                                                <a
                                                    href={demo.activeUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-2 text-white/90 underline underline-offset-4"
                                                >
                                                    <QrCode className="h-4 w-4" />
                                                    Apri link
                                                </a>
                                            ) : (
                                                <span className="text-white/50">Nessun token attivo</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link href={`/administration/demos/${demo.workspace.id}`}>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-white/20 bg-transparent text-white hover:bg-white/10"
                                                >
                                                    Dettaglio
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
