"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { QRCodePreview } from "@/components/demo/QRCodePreview";
import { createDemoWorkspaceAction } from "../actions";
import { initialCreateDemoState } from "./state";

const RANDOM_PROSPECTS = [
    {
        customerName: "Rossi Contract",
        customerCompany: "Rossi Contract SRL",
        customerContactName: "Luca Rossi",
        customerContactEmail: "luca.rossi@example.com",
        sectorKey: "contract",
        scenarioType: "full_suite",
        primaryColor: "#0F172A",
    },
    {
        customerName: "Bianchi Arredi",
        customerCompany: "Bianchi Arredi SA",
        customerContactName: "Giulia Bianchi",
        customerContactEmail: "giulia.bianchi@example.com",
        sectorKey: "arredo",
        scenarioType: "commerciale",
        primaryColor: "#1D4ED8",
    },
    {
        customerName: "Falegnameria Moderna",
        customerCompany: "Falegnameria Moderna SNC",
        customerContactName: "Marco Leoni",
        customerContactEmail: "marco.leoni@example.com",
        sectorKey: "falegnameria",
        scenarioType: "operations",
        primaryColor: "#166534",
    },
];

function randomItem<T>(items: T[]) {
    return items[Math.floor(Math.random() * items.length)];
}

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            disabled={pending}
            className="w-full bg-white text-slate-900 hover:bg-white/90"
        >
            {pending ? "Provisioning demo..." : "Crea demo"}
        </Button>
    );
}

export function CreateDemoForm({
    defaultValues,
    moduleOptions,
}: {
    defaultValues: {
        landingTitle: string;
        landingSubtitle: string;
        introNarrative: string;
        ctaLabel: string;
        painPoints: string[];
        desiredOutcomes: string[];
        recommendedModules: string[];
        enabledModules: string[];
    };
    moduleOptions: Array<{
        name: string;
        label: string;
    }>;
}) {
    const [state, formAction] = useActionState(
        createDemoWorkspaceAction,
        initialCreateDemoState,
    );
    const formRef = useRef<HTMLFormElement>(null);

    const fillRandomValues = () => {
        const form = formRef.current;
        if (!form) return;

        const selectedProspect = randomItem(RANDOM_PROSPECTS);
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const dataIntensity = randomItem(["low", "medium", "high"]);
        const tokenPolicy = randomItem(["multi_use", "single_use"]);
        const expiresInDays = String(randomItem([7, 14, 21, 30]));

        const setValue = (name: string, value: string) => {
            const field = form.elements.namedItem(name) as
                | HTMLInputElement
                | HTMLTextAreaElement
                | HTMLSelectElement
                | null;

            if (!field) return;
            field.value = value;
            field.dispatchEvent(new Event("input", { bubbles: true }));
            field.dispatchEvent(new Event("change", { bubbles: true }));
        };

        setValue("demoName", `${selectedProspect.customerName} Demo ${randomSuffix}`);
        setValue("customerName", selectedProspect.customerName);
        setValue("customerCompany", selectedProspect.customerCompany);
        setValue("customerContactName", selectedProspect.customerContactName);
        setValue("customerContactEmail", selectedProspect.customerContactEmail);
        setValue("customerLogoUrl", "https://placehold.co/240x80/png");
        setValue("heroImageUrl", "https://placehold.co/1200x700/png");
        setValue("primaryColor", selectedProspect.primaryColor);
        setValue("sectorKey", selectedProspect.sectorKey);
        setValue("scenarioType", selectedProspect.scenarioType);
        setValue("expiresInDays", expiresInDays);
        setValue("dataIntensity", dataIntensity);
        setValue("tokenPolicy", tokenPolicy);
        setValue(
            "currentProcessIssues",
            "Preventivi, avanzamento lavori e materiali sono distribuiti su troppi strumenti diversi.",
        );
        setValue(
            "salesNotes",
            "Prospect generato in automatico per test rapido del flusso demo.",
        );
        setValue(
            "landingTitle",
            `Una demo pensata per ${selectedProspect.customerCompany}`,
        );
        setValue(
            "landingSubtitle",
            "Mostra offerte, produzione, magazzino e presenze con dati pronti da esplorare.",
        );
        setValue(
            "introNarrative",
            "Questa demo e' stata compilata automaticamente per testare il provisioning end-to-end e simulare un prospect realistico.",
        );
        setValue("ctaLabel", "Apri demo di test");
        setValue(
            "painPoints",
            [
                "Offerte e commesse su file diversi",
                "Nessuna vista unica sull'avanzamento lavori",
                "Magazzino non sincronizzato con la produzione",
            ].join("\n"),
        );
        setValue(
            "desiredOutcomes",
            [
                "Ridurre i tempi di coordinamento",
                "Avere KPI chiari per commerciale e produzione",
                "Tracciare materiali, ore e presenze in un solo posto",
            ].join("\n"),
        );
        setValue(
            "recommendedModules",
            [
                "Dashboard",
                "Kanban offerte",
                "Produzione",
                "Magazzino",
                "Timetracking",
            ].join("\n"),
        );

        const enabledModules = new Set(
            randomItem([
                defaultValues.enabledModules,
                ["dashboard", "kanban", "clients", "inventory", "timetracking"],
                ["dashboard", "kanban", "products", "suppliers", "attendance"],
            ]),
        );

        form.querySelectorAll<HTMLInputElement>('input[name="enabledModules"]').forEach(
            (checkbox) => {
                checkbox.checked = enabledModules.has(checkbox.value);
            },
        );
    };

    return (
        <div className="space-y-8">
            <form ref={formRef} action={formAction} className="space-y-8">
                <div className="flex justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={fillRandomValues}
                        className="border-white/20 bg-transparent text-white hover:bg-white/10"
                    >
                        Riempi campi random
                    </Button>
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                    <section className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
                        <h2 className="mb-4 text-xl font-semibold text-white">
                            1. Identita&apos; Demo
                        </h2>
                        <div className="grid gap-4">
                            <Input name="demoName" placeholder="Demo Santini Contract" />
                            <Input name="customerName" placeholder="Nome cliente / prospect" required />
                            <Input name="customerCompany" placeholder="Azienda" />
                            <Input name="customerContactName" placeholder="Referente" />
                            <Input
                                name="customerContactEmail"
                                type="email"
                                placeholder="referente@example.com"
                            />
                            <Input name="customerLogoUrl" placeholder="URL logo cliente" />
                            <Input name="heroImageUrl" placeholder="URL immagine hero" />
                            <Input name="primaryColor" placeholder="#0F172A" />
                        </div>
                    </section>

                    <section className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
                        <h2 className="mb-4 text-xl font-semibold text-white">
                            2. Scenario
                        </h2>
                        <div className="grid gap-4">
                            <input type="hidden" name="templateKey" value="full_suite_arredo" />
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-white/80">
                                    Template demo
                                </label>
                                <Input value="full_suite_arredo" readOnly disabled />
                                <p className="text-xs leading-5 text-white/60">
                                    E' la base tecnica e narrativa della demo. Per ora l'MVP usa
                                    solo `full_suite_arredo`, cioe' una demo completa per aziende
                                    arredo/contract.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-white/80">
                                    Settore (`sectorKey`)
                                </label>
                                <Input
                                    name="sectorKey"
                                    defaultValue="arredo"
                                    required
                                    placeholder="es. arredo, contract, falegnameria"
                                />
                                <p className="text-xs leading-5 text-white/60">
                                    Serve a contestualizzare la demo per il tipo di azienda che la
                                    ricevera'. Usalo per descrivere il mercato del prospect, ad
                                    esempio `arredo` o `contract`.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-white/80">
                                    Tipo scenario (`scenarioType`)
                                </label>
                                <Input
                                    name="scenarioType"
                                    defaultValue="full_suite"
                                    required
                                    placeholder="es. full_suite, commerciale, operations"
                                />
                                <p className="text-xs leading-5 text-white/60">
                                    Definisce il taglio della demo. `full_suite` mostra un flusso
                                    completo, mentre scenari come `commerciale` o `operations`
                                    servono per demo piu' focalizzate.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-white/80">
                                    Durata demo (`expiresInDays`)
                                </label>
                                <Input
                                    name="expiresInDays"
                                    type="number"
                                    min={1}
                                    defaultValue={14}
                                    required
                                />
                                <p className="text-xs leading-5 text-white/60">
                                    Numero di giorni in cui QR e workspace restano validi.
                                    Consigliato: `14` per una demo commerciale standard.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-white/80">
                                    Intensita' dati (`dataIntensity`)
                                </label>
                                <select
                                    name="dataIntensity"
                                    defaultValue="medium"
                                    className="h-10 rounded-md border border-white/20 bg-slate-950/60 px-3 text-sm text-white"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                                <p className="text-xs leading-5 text-white/60">
                                    Dice quanto deve essere ricco il seed della demo. `low` per una
                                    prova veloce, `medium` per l'uso standard, `high` quando vuoi
                                    piu' dati da esplorare in dashboard e liste.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-white/80">
                                    Politica token QR (`tokenPolicy`)
                                </label>
                                <select
                                    name="tokenPolicy"
                                    defaultValue="multi_use"
                                    className="h-10 rounded-md border border-white/20 bg-slate-950/60 px-3 text-sm text-white"
                                >
                                    <option value="multi_use">Multi use</option>
                                    <option value="single_use">Single use</option>
                                </select>
                                <p className="text-xs leading-5 text-white/60">
                                    `multi_use` permette al cliente di rientrare piu' volte con lo
                                    stesso QR. `single_use` e' utile solo per accessi usa-e-getta o
                                    controllati.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                <section className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
                    <h2 className="mb-4 text-xl font-semibold text-white">
                        3. Moduli abilitati
                    </h2>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {moduleOptions.map((module) => (
                            <label
                                key={module.name}
                                className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white"
                            >
                                <input
                                    type="checkbox"
                                    name="enabledModules"
                                    value={module.name}
                                    defaultChecked={defaultValues.enabledModules.includes(
                                        module.name,
                                    )}
                                />
                                <span>{module.label}</span>
                            </label>
                        ))}
                    </div>
                </section>

                <div className="grid gap-6 lg:grid-cols-2">
                    <section className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
                        <h2 className="mb-4 text-xl font-semibold text-white">
                            4. Problemi aziendali
                        </h2>
                        <div className="grid gap-4">
                            <Textarea
                                name="painPoints"
                                defaultValue={defaultValues.painPoints.join("\n")}
                                className="min-h-32 border-white/20 bg-slate-950/60 text-white"
                            />
                            <Textarea
                                name="desiredOutcomes"
                                defaultValue={defaultValues.desiredOutcomes.join("\n")}
                                className="min-h-28 border-white/20 bg-slate-950/60 text-white"
                            />
                            <Textarea
                                name="currentProcessIssues"
                                placeholder="Criticita' attuali del prospect"
                                className="min-h-24 border-white/20 bg-slate-950/60 text-white"
                            />
                            <Textarea
                                name="salesNotes"
                                placeholder="Note commerciali interne"
                                className="min-h-24 border-white/20 bg-slate-950/60 text-white"
                            />
                        </div>
                    </section>

                    <section className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
                        <h2 className="mb-4 text-xl font-semibold text-white">
                            5. Landing personalizzata
                        </h2>
                        <div className="grid gap-4">
                            <Input
                                name="landingTitle"
                                defaultValue={defaultValues.landingTitle}
                                required
                            />
                            <Textarea
                                name="landingSubtitle"
                                defaultValue={defaultValues.landingSubtitle}
                                className="min-h-20 border-white/20 bg-slate-950/60 text-white"
                            />
                            <Textarea
                                name="introNarrative"
                                defaultValue={defaultValues.introNarrative}
                                className="min-h-28 border-white/20 bg-slate-950/60 text-white"
                            />
                            <Input
                                name="ctaLabel"
                                defaultValue={defaultValues.ctaLabel}
                            />
                            <Textarea
                                name="recommendedModules"
                                defaultValue={defaultValues.recommendedModules.join("\n")}
                                className="min-h-24 border-white/20 bg-slate-950/60 text-white"
                            />
                            <Textarea
                                name="notes"
                                placeholder="Note operative interne"
                                className="min-h-20 border-white/20 bg-slate-950/60 text-white"
                            />
                        </div>
                    </section>
                </div>

                <SubmitButton />
            </form>

            {state.message && (
                <Alert
                    variant={state.success ? "default" : "destructive"}
                    className={state.success
                        ? "border-emerald-400/40 bg-emerald-500/10 text-white"
                        : "border-red-400/50 bg-red-500/10 text-white"}
                >
                    <AlertTitle>
                        {state.success ? "Demo pronta" : "Creazione fallita"}
                    </AlertTitle>
                    <AlertDescription>{state.message}</AlertDescription>
                </Alert>
            )}

            {state.success && state.publicUrl && (
                <div className="grid gap-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 lg:grid-cols-[1fr_auto]">
                    <div className="space-y-3 text-white">
                        <p className="text-sm uppercase tracking-[0.2em] text-emerald-200">
                            Output
                        </p>
                        <p className="text-sm break-all">{state.publicUrl}</p>
                        {state.demoUserEmail && (
                            <p className="text-sm text-white/80">
                                Demo user: {state.demoUserEmail}
                            </p>
                        )}
                        {state.statsPath && (
                            <Link
                                href={state.statsPath}
                                className="inline-flex text-sm font-medium text-emerald-200 underline underline-offset-4"
                            >
                                Apri statistiche demo
                            </Link>
                        )}
                    </div>
                    <QRCodePreview value={state.publicUrl} title="QR demo" filename="demo-created" />
                </div>
            )}
        </div>
    );
}
