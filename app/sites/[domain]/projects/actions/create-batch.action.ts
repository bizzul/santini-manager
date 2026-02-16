"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { generateTaskCode } from "@/lib/code-generator";
import { createProjectFolders } from "@/lib/project-folders";
import type { ExtractedProject } from "@/validation/voice-input/extracted-project";

interface CreateBatchResult {
    success: boolean;
    createdCount?: number;
    error?: string;
    errors?: Array<{ index: number; error: string }>;
}

/**
 * Create multiple projects from voice input extraction
 */
export async function createBatchProjects(
    siteId: string,
    projects: ExtractedProject[]
): Promise<CreateBatchResult> {
    const session = await getUserContext();

    if (!session?.user?.id) {
        return { success: false, error: "Non autenticato" };
    }

    const userId = session.user.id;

    if (!projects || projects.length === 0) {
        return { success: false, error: "Nessun progetto da creare" };
    }

    const supabase = await createClient();
    const errors: Array<{ index: number; error: string }> = [];
    let createdCount = 0;

    try {
        // Get site info
        const { data: site, error: siteError } = await supabase
            .from("sites")
            .select("id, organization_id")
            .eq("id", siteId)
            .single();

        if (siteError || !site) {
            return { success: false, error: "Sito non trovato" };
        }

        // Get the OFFER kanban for the site (is_offer_kanban = true)
        // Voice input creates offers that go into the first column (todo) of the offer kanban
        const { data: offerKanban, error: kanbanError } = await supabase
            .from("Kanban")
            .select(`
                id,
                title,
                is_offer_kanban,
                category_id,
                category:KanbanCategory!category_id(
                    id,
                    is_internal,
                    internal_base_code
                )
            `)
            .eq("site_id", siteId)
            .eq("is_offer_kanban", true)
            .limit(1)
            .single();

        if (kanbanError || !offerKanban) {
            return { success: false, error: "Nessun kanban offerte trovato per il sito. Assicurati di avere un kanban con 'is_offer_kanban' attivo." };
        }

        // Get columns for the offer kanban (first column is "todo")
        const { data: columns, error: columnsError } = await supabase
            .from("KanbanColumn")
            .select("*")
            .eq("kanbanId", offerKanban.id)
            .order("position", { ascending: true });

        if (columnsError || !columns || columns.length === 0) {
            return { success: false, error: "Nessuna colonna trovata nel kanban offerte" };
        }

        // First column is the "todo" column where new offers go
        const todoColumnId = columns[0].id;

        // Get existing clients for matching
        const { data: existingClients } = await supabase
            .from("Client")
            .select("id, businessName, individualFirstName, individualLastName, clientType")
            .eq("site_id", siteId);

        // Helper to get display name
        const getClientDisplayName = (c: { businessName?: string | null; individualFirstName?: string | null; individualLastName?: string | null; clientType?: string | null }) => {
            if (c.clientType === "BUSINESS" && c.businessName) {
                return c.businessName;
            }
            const parts = [c.individualFirstName, c.individualLastName].filter(Boolean);
            return parts.join(" ") || c.businessName || "";
        };

        const clientNameToId = new Map(
            existingClients?.map((c) => [getClientDisplayName(c).toLowerCase().trim(), c.id]) || []
        );

        // Get existing suppliers for matching
        const { data: existingSuppliers } = await supabase
            .from("Supplier")
            .select("id, name")
            .eq("site_id", siteId);

        const supplierNameToId = new Map(
            existingSuppliers?.map((s) => [s.name.toLowerCase().trim(), s.id]) || []
        );

        // Process each project
        for (let i = 0; i < projects.length; i++) {
            const project = projects[i];

            try {
                // Find or create client
                let clientId: number | null = null;
                const clientKey = project.cliente.toLowerCase().trim();

                // Check if we already have a matched client from extraction
                if (project.matchedClient?.id) {
                    clientId = project.matchedClient.id;
                } else if (clientNameToId.has(clientKey)) {
                    clientId = clientNameToId.get(clientKey)!;
                } else {
                    // Create new client with location info if available
                    // Default to BUSINESS type with businessName
                    // code is NOT NULL - generate from businessName (first 4 chars)
                    const codeFromName = (project.cliente || "AZ")
                        .slice(0, 4)
                        .toUpperCase()
                        .replace(/\s/g, "") || `AZ${i}`;
                    const newClientData: Record<string, unknown> = {
                        businessName: project.cliente,
                        clientType: "BUSINESS",
                        code: codeFromName,
                        site_id: siteId,
                    };

                    // If location is specified and it's a new client, save the address
                    if (project.luogo && project.isNewClient) {
                        newClientData.address = project.luogo;
                    }

                    const { data: newClient, error: clientError } = await supabase
                        .from("Client")
                        .insert(newClientData)
                        .select("id")
                        .single();

                    if (clientError) {
                        errors.push({
                            index: i,
                            error: `Errore creazione cliente: ${clientError.message}`,
                        });
                        continue;
                    }
                    clientId = newClient.id;
                    clientNameToId.set(clientKey, clientId);
                }

                // Find supplier if specified
                let supplierId: number | null = null;
                if (project.fornitore) {
                    const supplierKey = project.fornitore.toLowerCase().trim();
                    if (supplierNameToId.has(supplierKey)) {
                        supplierId = supplierNameToId.get(supplierKey)!;
                    }
                    // Note: We don't auto-create suppliers, just link if exists
                }

                // Generate unique code automatically (always as OFFERTA type)
                const uniqueCode = await generateTaskCode(siteId, "OFFERTA");

                // Build notes with kanban status info if provided
                let notes = project.note || "";
                if (project.kanban === "gia_fatto") {
                    notes = notes ? `${notes}\n[Stato vocale: Già fatto]` : "[Stato vocale: Già fatto]";
                }

                // Prepare task data - always goes to first column (todo) of offer kanban
                const insertData: Record<string, unknown> = {
                    title: project.tipoProdotto,
                    name: project.tipoProdotto,
                    luogo: project.luogo || null,
                    clientId: clientId,
                    deliveryDate: project.terminePosa
                        ? new Date(project.terminePosa).toISOString()
                        : null,
                    unique_code: uniqueCode,
                    kanbanId: offerKanban.id,
                    kanbanColumnId: todoColumnId,
                    sellPrice: project.valoreTotale,
                    numero_pezzi: project.numeroPezzi,
                    other: notes,
                    positions: Array(8).fill(""),
                    task_type: "OFFERTA",
                    site_id: siteId,
                };

                // Create task
                const { data: taskCreate, error: taskCreateError } = await supabase
                    .from("Task")
                    .insert(insertData)
                    .select()
                    .single();

                if (taskCreateError) {
                    errors.push({
                        index: i,
                        error: `Errore creazione task: ${taskCreateError.message}`,
                    });
                    continue;
                }

                // Link supplier if found
                if (supplierId && taskCreate) {
                    await supabase.from("TaskSupplier").insert({
                        task_id: taskCreate.id,
                        supplier_id: supplierId,
                    });
                }

                // Create project folders
                if (taskCreate && uniqueCode) {
                    try {
                        const folders = await createProjectFolders(
                            taskCreate.id,
                            uniqueCode,
                            siteId
                        );

                        if (folders.cloudFolderUrl || folders.projectFilesUrl) {
                            await supabase
                                .from("Task")
                                .update({
                                    cloud_folder_url: folders.cloudFolderUrl,
                                    project_files_url: folders.projectFilesUrl,
                                })
                                .eq("id", taskCreate.id);
                        }
                    } catch (folderError) {
                        console.error("Error creating project folders:", folderError);
                        // Don't fail if folder creation fails
                    }
                }

                // Create action record
                if (taskCreate) {
                    await supabase.from("Action").insert({
                        type: "task_create",
                        data: { task: taskCreate.id, source: "voice_input" },
                        user_id: userId,
                        site_id: siteId,
                        organization_id: site.organization_id,
                    });
                }

                createdCount++;
            } catch (error) {
                console.error(`Error creating project ${i}:`, error);
                errors.push({
                    index: i,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Errore sconosciuto",
                });
            }
        }

        // Revalidate projects page
        revalidatePath("/projects");

        if (createdCount === 0 && errors.length > 0) {
            return {
                success: false,
                error: "Nessun progetto creato",
                errors,
            };
        }

        return {
            success: true,
            createdCount,
            errors: errors.length > 0 ? errors : undefined,
        };
    } catch (error) {
        console.error("Error in createBatchProjects:", error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Errore durante la creazione dei progetti",
        };
    }
}
