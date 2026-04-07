"use server";

import { revalidatePath } from "next/cache";
import { getUserContext } from "@/lib/auth-utils";
import {
    createDemoWorkspace,
    extendDemoWorkspace,
    regenerateDemoToken,
    resetDemoWorkspace,
    revokeDemoToken,
} from "@/lib/demo/service";
import { getDemoTemplateByKey } from "@/lib/demo/templates";

export interface CreateDemoActionState {
    success: boolean;
    message: string;
    publicUrl?: string;
    statsPath?: string;
    demoUserEmail?: string | null;
}

function parseTextareaList(value: FormDataEntryValue | null) {
    return String(value || "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
}

async function requireSuperadmin() {
    const userContext = await getUserContext();

    if (!userContext?.canAccessAllOrganizations) {
        throw new Error("Unauthorized");
    }

    return userContext;
}

export async function createDemoWorkspaceAction(
    _prevState: CreateDemoActionState,
    formData: FormData,
): Promise<CreateDemoActionState> {
    try {
        const userContext = await requireSuperadmin();
        const templateKey = String(
            formData.get("templateKey") || "full_suite_speedywood",
        );
        const template = getDemoTemplateByKey(templateKey);
        const customerName = String(formData.get("customerName") || "").trim();

        if (!customerName) {
            return {
                success: false,
                message: "Il nome cliente e' obbligatorio.",
            };
        }

        const result = await createDemoWorkspace({
            demoName: String(formData.get("demoName") || customerName || "Demo"),
            customerName,
            customerCompany: String(formData.get("customerCompany") || "").trim() || undefined,
            customerContactName: String(formData.get("customerContactName") || "").trim() || undefined,
            customerContactEmail: String(formData.get("customerContactEmail") || "").trim() || undefined,
            customerLogoUrl: String(formData.get("customerLogoUrl") || "").trim() || undefined,
            heroImageUrl: String(formData.get("heroImageUrl") || "").trim() || undefined,
            primaryColor: String(formData.get("primaryColor") || "").trim() || undefined,
            templateKey,
            sectorKey: String(formData.get("sectorKey") || template.sector),
            scenarioType: String(formData.get("scenarioType") || template.scenario),
            enabledModules: formData.getAll("enabledModules").map(String),
            recommendedModules: parseTextareaList(formData.get("recommendedModules")),
            painPoints: parseTextareaList(formData.get("painPoints")),
            desiredOutcomes: parseTextareaList(formData.get("desiredOutcomes")),
            currentProcessIssues: String(formData.get("currentProcessIssues") || "").trim() || undefined,
            salesNotes: String(formData.get("salesNotes") || "").trim() || undefined,
            landingTitle: String(formData.get("landingTitle") || "").trim() || undefined,
            landingSubtitle: String(formData.get("landingSubtitle") || "").trim() || undefined,
            introNarrative: String(formData.get("introNarrative") || "").trim() || undefined,
            ctaLabel: String(formData.get("ctaLabel") || "").trim() || undefined,
            dataIntensity: (
                String(formData.get("dataIntensity") || "medium") as
                    | "low"
                    | "medium"
                    | "high"
            ),
            expiresInDays: Number(formData.get("expiresInDays") || 14),
            tokenPolicy: String(formData.get("tokenPolicy") || "multi_use") as
                | "single_use"
                | "multi_use",
            notes: String(formData.get("notes") || "").trim() || undefined,
        }, userContext.user.id);

        revalidatePath("/administration");
        revalidatePath("/administration/demos");

        return {
            success: true,
            message: "Demo creata con successo.",
            publicUrl: result.publicUrl,
            statsPath: result.statsPath,
            demoUserEmail: result.demoUserEmail || null,
        };
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : "Impossibile creare la demo.",
        };
    }
}

export async function revokeDemoTokenAction(formData: FormData) {
    const userContext = await requireSuperadmin();
    const workspaceId = String(formData.get("workspaceId") || "");
    await revokeDemoToken(workspaceId);
    revalidatePath("/administration/demos");
    revalidatePath(`/administration/demos/${workspaceId}`);
    return userContext.user.id;
}

export async function regenerateDemoTokenAction(formData: FormData) {
    const userContext = await requireSuperadmin();
    const workspaceId = String(formData.get("workspaceId") || "");
    await regenerateDemoToken(workspaceId, userContext.user.id);
    revalidatePath("/administration/demos");
    revalidatePath(`/administration/demos/${workspaceId}`);
    return userContext.user.id;
}

export async function extendDemoWorkspaceAction(formData: FormData) {
    await requireSuperadmin();
    const workspaceId = String(formData.get("workspaceId") || "");
    const days = Number(formData.get("days") || 7);
    await extendDemoWorkspace(workspaceId, days);
    revalidatePath("/administration/demos");
    revalidatePath(`/administration/demos/${workspaceId}`);
}

export async function resetDemoWorkspaceAction(formData: FormData) {
    const userContext = await requireSuperadmin();
    const workspaceId = String(formData.get("workspaceId") || "");
    await resetDemoWorkspace(workspaceId, userContext.user.id);
    revalidatePath("/administration/demos");
    revalidatePath(`/administration/demos/${workspaceId}`);
}
