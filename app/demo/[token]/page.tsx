import Link from "next/link";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import {
    getDemoLandingData,
    recordDemoAccessEvent,
} from "@/lib/demo/service";

export const dynamic = "force-dynamic";

function extractContext(headerStore: Headers) {
    return {
        ipAddress: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            null,
        userAgent: headerStore.get("user-agent"),
        referrer: headerStore.get("referer"),
        country: headerStore.get("x-vercel-ip-country"),
        city: headerStore.get("x-vercel-ip-city"),
        landingPath: headerStore.get("x-invoke-path") || null,
    };
}

export default async function DemoLandingPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;
    const headerStore = await headers();
    const context = extractContext(headerStore);
    const landing = await getDemoLandingData(token);

    if (landing.tokenRecord && landing.availability === "active") {
        await recordDemoAccessEvent(
            landing.tokenRecord.workspace,
            landing.tokenRecord.id,
            "landing_view",
            context,
        );
    } else if (landing.tokenRecord && landing.availability === "expired") {
        await recordDemoAccessEvent(
            landing.tokenRecord.workspace,
            landing.tokenRecord.id,
            "expired_token",
            context,
        );
    } else if (landing.tokenRecord && landing.availability === "revoked") {
        await recordDemoAccessEvent(
            landing.tokenRecord.workspace,
            landing.tokenRecord.id,
            "revoked_token",
            context,
        );
    }

    const branding = landing.tokenRecord?.workspace.branding_config;
    const landingConfig = landing.tokenRecord?.workspace.landing_config;
    const customerName = branding?.customerName ||
        landing.tokenRecord?.workspace.customer_name ||
        "Demo cliente";

    return (
        <main className="min-h-screen bg-slate-950 px-4 py-16 text-white">
            <div className="mx-auto max-w-5xl">
                <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
                    <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
                        <section className="p-8 md:p-12">
                            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/80">
                                Demo personalizzata
                            </p>
                            <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-5xl">
                                {landingConfig?.landingTitle || "Accedi alla tua demo dedicata"}
                            </h1>
                            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/75">
                                {landingConfig?.landingSubtitle ||
                                    "Ambiente demo dedicato con dati realisti e percorso guidato per il prospect."}
                            </p>
                            {landingConfig?.introNarrative && (
                                <p className="mt-6 max-w-2xl text-base leading-7 text-white/70">
                                    {landingConfig.introNarrative}
                                </p>
                            )}

                            <div className="mt-10">
                                {landing.availability === "active" ? (
                                    <Link href={`/demo/${token}/login`}>
                                        <Button className="h-12 rounded-full bg-white px-6 text-slate-900 hover:bg-white/90">
                                            {landingConfig?.ctaLabel || "Entra nella demo"}
                                        </Button>
                                    </Link>
                                ) : (
                                    <div className="inline-flex rounded-full border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                                        {landing.availability === "expired" &&
                                            "Questa demo e' scaduta."}
                                        {landing.availability === "revoked" &&
                                            "L'accesso demo e' stato revocato."}
                                        {landing.availability === "used" &&
                                            "Questo link demo e' gia' stato utilizzato."}
                                        {landing.availability === "invalid" &&
                                            "Link demo non valido."}
                                    </div>
                                )}
                            </div>

                            {landingConfig?.painPoints?.length ? (
                                <div className="mt-12 grid gap-3">
                                    {landingConfig.painPoints.map((point) => (
                                        <div
                                            key={point}
                                            className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white/85"
                                        >
                                            {point}
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </section>

                        <aside className="border-l border-white/10 bg-black/10 p-8 md:p-10">
                            {branding?.customerLogoUrl ? (
                                <img
                                    src={branding.customerLogoUrl}
                                    alt={customerName}
                                    className="h-16 w-auto rounded-xl bg-white p-2"
                                />
                            ) : (
                                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-semibold">
                                    {customerName.slice(0, 2).toUpperCase()}
                                </div>
                            )}

                            <div className="mt-8">
                                <p className="text-sm uppercase tracking-[0.25em] text-white/50">
                                    Prospect
                                </p>
                                <p className="mt-3 text-2xl font-semibold">
                                    {landing.tokenRecord?.workspace.customer_company || customerName}
                                </p>
                            </div>

                            <div className="mt-10">
                                <p className="text-sm uppercase tracking-[0.25em] text-white/50">
                                    Moduli consigliati
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {landingConfig?.recommendedModules?.map((module) => (
                                        <span
                                            key={module}
                                            className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-white/85"
                                        >
                                            {module}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {branding?.heroImageUrl && (
                                <div className="mt-10 overflow-hidden rounded-3xl border border-white/10">
                                    <img
                                        src={branding.heroImageUrl}
                                        alt={customerName}
                                        className="h-56 w-full object-cover"
                                    />
                                </div>
                            )}
                        </aside>
                    </div>
                </div>
            </div>
        </main>
    );
}
