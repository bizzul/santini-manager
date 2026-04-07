import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUserContext } from "@/lib/auth-utils";
import {
    getDemoModuleOptions,
    getDemoTemplateByKey,
} from "@/lib/demo/templates";
import { CreateDemoForm } from "./form";

export const dynamic = "force-dynamic";

export default async function CreateDemoPage() {
    const userContext = await getUserContext();

    if (!userContext) {
        redirect("/login");
    }

    if (!userContext.canAccessAllOrganizations) {
        redirect("/administration");
    }

    const template = getDemoTemplateByKey("full_suite_speedywood");
    const moduleOptions = getDemoModuleOptions();

    return (
        <div className="relative z-10 min-h-screen px-4 py-12">
            <div className="mx-auto max-w-6xl space-y-8">
                <div className="flex flex-col items-center gap-6">
                    <Image
                        src="/logo-bianco.svg"
                        alt="Full Data Manager Logo"
                        width={64}
                        height={64}
                    />
                    <Link href="/administration/demos">
                        <Button
                            variant="ghost"
                            className="text-white hover:bg-white/10"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Torna alle demo
                        </Button>
                    </Link>
                    <div className="text-center text-white">
                        <h1 className="text-4xl font-bold">Crea Demo QR</h1>
                        <p className="mt-3 text-lg text-white/70">
                            Provisioning completo di workspace demo, landing personalizzata e accesso via QR.
                        </p>
                    </div>
                </div>

                <div className="rounded-3xl border border-white/20 bg-white/5 p-6 backdrop-blur-xl">
                    <div className="mb-6 flex items-start gap-4 rounded-2xl border border-white/10 bg-black/10 p-5 text-white">
                        <div className="rounded-xl bg-white/10 p-3">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="font-semibold">Template attivo</h2>
                            <p className="mt-1 text-sm text-white/70">
                                `{template.label}` precompila narrativa, pain points e moduli consigliati per l&apos;MVP.
                            </p>
                        </div>
                    </div>

                    <CreateDemoForm
                        moduleOptions={moduleOptions}
                        defaultValues={{
                            landingTitle: template.defaultLandingTitle,
                            landingSubtitle: template.defaultLandingSubtitle,
                            introNarrative: template.defaultIntroNarrative,
                            ctaLabel: template.defaultCtaLabel,
                            painPoints: template.defaultPainPoints,
                            desiredOutcomes: template.defaultDesiredOutcomes,
                            recommendedModules: template.defaultRecommendedModules,
                            enabledModules: template.defaultEnabledModules,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
