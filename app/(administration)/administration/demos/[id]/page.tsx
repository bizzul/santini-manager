import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import {
    ArrowLeft,
    Clock3,
    ExternalLink,
    MapPin,
    RefreshCw,
    Shield,
    TimerReset,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodePreview } from "@/components/demo/QRCodePreview";
import { getUserContext } from "@/lib/auth-utils";
import { getDemoWorkspaceDetails } from "@/lib/demo/service";
import {
    extendDemoWorkspaceAction,
    regenerateDemoTokenAction,
    resetDemoWorkspaceAction,
    revokeDemoTokenAction,
} from "../actions";

export const dynamic = "force-dynamic";

function EventLabel({ type }: { type: string }) {
    return (
        <Badge className="border-white/20 bg-white/10 text-white">
            {type}
        </Badge>
    );
}

export default async function DemoDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const userContext = await getUserContext();

    if (!userContext) {
        redirect("/login");
    }

    if (!userContext.canAccessAllOrganizations) {
        redirect("/administration");
    }

    const { id } = await params;
    const details = await getDemoWorkspaceDetails(id);

    if (!details) {
        notFound();
    }

    const { workspace, site, events, tokens, activeUrl } = details;

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
                    <Link href="/administration/demos">
                        <Button variant="ghost" className="text-white hover:bg-white/10">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Torna alle demo
                        </Button>
                    </Link>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
                    <div className="rounded-3xl border border-white/20 bg-white/10 p-6 text-white backdrop-blur-xl">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <Badge className="border-white/20 bg-white/10 text-white">
                                        {workspace.status}
                                    </Badge>
                                    <Badge className="border-white/20 bg-white/10 text-white">
                                        {workspace.template_key}
                                    </Badge>
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold">{workspace.display_name}</h1>
                                    <p className="mt-1 text-white/70">
                                        {workspace.customer_company || workspace.customer_name}
                                    </p>
                                </div>
                                {site && (
                                    <p className="text-sm text-white/70">
                                        Site demo: <span className="font-medium text-white">{site.subdomain}</span>
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                                <form action={regenerateDemoTokenAction}>
                                    <input type="hidden" name="workspaceId" value={workspace.id} />
                                    <Button
                                        type="submit"
                                        variant="outline"
                                        className="w-full border-white/20 bg-transparent text-white hover:bg-white/10"
                                    >
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Rigenera QR
                                    </Button>
                                </form>
                                <form action={revokeDemoTokenAction}>
                                    <input type="hidden" name="workspaceId" value={workspace.id} />
                                    <Button
                                        type="submit"
                                        variant="outline"
                                        className="w-full border-red-300/30 bg-transparent text-white hover:bg-red-500/20"
                                    >
                                        <Shield className="mr-2 h-4 w-4" />
                                        Revoca token
                                    </Button>
                                </form>
                                <form action={extendDemoWorkspaceAction}>
                                    <input type="hidden" name="workspaceId" value={workspace.id} />
                                    <input type="hidden" name="days" value="7" />
                                    <Button
                                        type="submit"
                                        variant="outline"
                                        className="w-full border-white/20 bg-transparent text-white hover:bg-white/10"
                                    >
                                        <Clock3 className="mr-2 h-4 w-4" />
                                        +7 giorni
                                    </Button>
                                </form>
                                <form action={resetDemoWorkspaceAction}>
                                    <input type="hidden" name="workspaceId" value={workspace.id} />
                                    <Button
                                        type="submit"
                                        variant="outline"
                                        className="w-full border-white/20 bg-transparent text-white hover:bg-white/10"
                                    >
                                        <TimerReset className="mr-2 h-4 w-4" />
                                        Reset demo
                                    </Button>
                                </form>
                            </div>
                        </div>

                        <div className="mt-8 grid gap-4 md:grid-cols-4">
                            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                                <p className="text-sm text-white/60">Primo accesso</p>
                                <p className="mt-2 font-medium">
                                    {workspace.first_landing_view_at
                                        ? new Date(workspace.first_landing_view_at).toLocaleString()
                                        : "Mai"}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                                <p className="text-sm text-white/60">Ultimo login</p>
                                <p className="mt-2 font-medium">
                                    {workspace.last_login_at
                                        ? new Date(workspace.last_login_at).toLocaleString()
                                        : "Mai"}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                                <p className="text-sm text-white/60">Login totali</p>
                                <p className="mt-2 font-medium">{workspace.login_count}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                                <p className="text-sm text-white/60">Magic link generati</p>
                                <p className="mt-2 font-medium">{workspace.magic_link_count}</p>
                            </div>
                        </div>

                        <div className="mt-8 grid gap-6 lg:grid-cols-2">
                            <section className="rounded-2xl border border-white/10 bg-black/10 p-5">
                                <h2 className="text-lg font-semibold">Informazioni commerciali</h2>
                                <div className="mt-4 space-y-2 text-sm text-white/80">
                                    <p>Cliente: {workspace.customer_name}</p>
                                    <p>Azienda: {workspace.customer_company || "-"}</p>
                                    <p>Referente: {workspace.customer_contact_name || "-"}</p>
                                    <p>Email: {workspace.customer_contact_email || "-"}</p>
                                    <p>Settore: {workspace.sector_key}</p>
                                </div>
                                <div className="mt-5 space-y-2">
                                    {workspace.landing_config?.painPoints?.map((item) => (
                                        <div
                                            key={item}
                                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                                        >
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="rounded-2xl border border-white/10 bg-black/10 p-5">
                                <h2 className="text-lg font-semibold">Accesso e sicurezza</h2>
                                <div className="mt-4 space-y-2 text-sm text-white/80">
                                    <p>Token attivi: {tokens.filter((token) => !token.revoked_at).length}</p>
                                    <p>Ultimo IP: {workspace.last_ip_address || "-"}</p>
                                    <p>Ultimo user-agent: {workspace.last_user_agent || "-"}</p>
                                    <p>
                                        Scadenza: {workspace.expires_at
                                            ? new Date(workspace.expires_at).toLocaleString()
                                            : "-"}
                                    </p>
                                </div>
                                {events.find((event) => event.country || event.city) && (
                                    <div className="mt-4 flex items-center gap-2 text-sm text-white/70">
                                        <MapPin className="h-4 w-4" />
                                        {events.find((event) => event.country || event.city)?.city || "-"},{" "}
                                        {events.find((event) => event.country || event.city)?.country || "-"}
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-3xl border border-white/20 bg-white/10 p-6 text-white backdrop-blur-xl">
                            <h2 className="text-lg font-semibold">Asset demo</h2>
                            <div className="mt-5 space-y-4">
                                {activeUrl ? (
                                    <>
                                        <QRCodePreview
                                            value={activeUrl}
                                            title="QR attivo"
                                            filename={`demo-${workspace.display_name}`}
                                        />
                                        <a
                                            href={activeUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 text-sm underline underline-offset-4"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            Apri landing pubblica
                                        </a>
                                    </>
                                ) : (
                                    <p className="text-sm text-white/60">Nessun token attivo disponibile.</p>
                                )}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-white/20 bg-white/10 p-6 text-white backdrop-blur-xl">
                            <h2 className="text-lg font-semibold">Token</h2>
                            <div className="mt-4 space-y-3">
                                {tokens.map((token) => (
                                    <div
                                        key={token.id}
                                        className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm"
                                    >
                                        <p className="font-medium">{token.label || "Token"}</p>
                                        <p className="text-white/70">
                                            Policy: {token.use_policy} | Uses: {token.uses_count}
                                        </p>
                                        <p className="text-white/60">
                                            {token.revoked_at
                                                ? `Revocato ${new Date(token.revoked_at).toLocaleString()}`
                                                : "Attivo"}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-white/20 bg-white/10 p-6 text-white backdrop-blur-xl">
                    <h2 className="text-xl font-semibold">Timeline eventi</h2>
                    <div className="mt-6 space-y-4">
                        {events.length === 0 && (
                            <p className="text-sm text-white/60">Nessun evento registrato.</p>
                        )}
                        {events.map((event) => (
                            <div
                                key={event.id}
                                className="grid gap-3 rounded-2xl border border-white/10 bg-black/10 p-4 lg:grid-cols-[180px_1fr_220px]"
                            >
                                <div className="text-sm text-white/60">
                                    {new Date(event.created_at).toLocaleString()}
                                </div>
                                <div className="space-y-2">
                                    <EventLabel type={event.event_type} />
                                    {event.redirect_path && (
                                        <p className="text-sm text-white/70">
                                            Redirect: {event.redirect_path}
                                        </p>
                                    )}
                                    {event.referrer && (
                                        <p className="text-sm text-white/70">
                                            Referrer: {event.referrer}
                                        </p>
                                    )}
                                </div>
                                <div className="text-sm text-white/70">
                                    <p>{event.ip_address || "-"}</p>
                                    <p>{event.country || ""} {event.city || ""}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
