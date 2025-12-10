import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { getSiteData } from "../../../../../lib/fetchers";
import {
  calculateAutoArchiveDate,
  generateTaskCode,
  getAutoArchiveSettings,
} from "@/lib/code-generator";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user from Supabase auth to verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, column, columnName } = body;
    const now = new Date();

    // Extract site_id from request headers or domain
    let siteId = null;
    const siteIdFromHeader = req.headers.get("x-site-id");
    const domain = req.headers.get("host");

    if (siteIdFromHeader) {
      siteId = siteIdFromHeader;
    } else if (domain) {
      try {
        const siteResult = await getSiteData(domain);
        if (siteResult?.data) {
          siteId = siteResult.data.id;
        }
      } catch (error) {
        console.error("Error fetching site data:", error);
      }
    }

    logger.debug("Move card request:", {
      id,
      column,
      columnName,
      userId: user.id,
      siteId,
    });

    // Find task with site_id filtering if available
    // Also get the kanban data to check if it's an offer/work/production kanban
    let taskQuery = supabase
      .from("Task")
      .select(`
        *,
        kanban_columns:kanbanColumnId(*),
        kanban:kanbanId(
          id,
          identifier,
          is_offer_kanban,
          target_work_kanban_id,
          is_work_kanban,
          is_production_kanban,
          target_invoice_kanban_id
        ),
        sell_product:sellProductId(
          id,
          name
        )
      `)
      .eq("id", id);

    if (siteId) {
      taskQuery = taskQuery.eq("site_id", siteId);
    }

    logger.debug("Task query with site_id:", siteId);

    const { data: task, error: findError } = await taskQuery.single();

    if (findError || !task) {
      logger.error("Task not found:", id);
      logger.error("Find error:", findError);
      logger.error("Site ID used for filtering:", siteId);

      // Let's also try to find the task without site_id filtering to see if it exists
      const { data: taskWithoutSiteFilter, error: findErrorWithoutSite } =
        await supabase
          .from("Task")
          .select(`
            *,
            kanban_columns:kanbanColumnId(*)
          `)
          .eq("id", id)
          .single();

      if (taskWithoutSiteFilter) {
        logger.debug(
          "Task exists but has site_id:",
          taskWithoutSiteFilter.site_id,
        );
        logger.debug("Expected site_id:", siteId);
      } else {
        logger.debug("Task does not exist at all");
      }

      return NextResponse.json({ error: "Task not found", status: 404 });
    }

    logger.debug("Found task:", {
      taskId: task.id,
      currentColumn: task.kanban_columns?.identifier,
    });

    const prevColumn = task?.kanban_columns?.identifier;

    // Get the target column's position and type
    const { data: targetColumn, error: columnError } = await supabase
      .from("KanbanColumn")
      .select("*, column_type")
      .eq("id", column)
      .single();

    if (columnError || !targetColumn) {
      logger.error("Target column not found:", column);
      return NextResponse.json({
        error: "Target column not found",
        status: 404,
      });
    }

    logger.debug("Found target column:", {
      columnId: targetColumn.id,
      columnName: targetColumn.identifier,
      columnType: targetColumn.column_type,
    });

    // =====================================================
    // Logica Sistema Offerte e Routing
    // =====================================================
    let duplicatedTask = null;
    let movedTask = null;
    let newDisplayMode = task?.display_mode || "normal";
    let autoArchiveAt = null;

    const isOfferKanban = task?.kanban?.is_offer_kanban === true;
    const isWorkKanban = task?.kanban?.is_work_kanban === true;
    const isProductionKanban = task?.kanban?.is_production_kanban === true;
    const columnType = targetColumn.column_type || "normal";

    if (isOfferKanban) {
      logger.debug("Processing offer kanban logic:", {
        columnType,
        targetWorkKanbanId: task?.kanban?.target_work_kanban_id,
      });

      // Gestione colonna "won" (vinta)
      if (columnType === "won") {
        newDisplayMode = "small_green";

        // Calcola data auto-archiviazione
        if (siteId) {
          const archiveSettings = await getAutoArchiveSettings(siteId);
          if (archiveSettings.enabled) {
            autoArchiveAt = calculateAutoArchiveDate(archiveSettings.days);
          }
        }

        // Crea copia nella kanban lavori se configurata
        const targetWorkKanbanId = task?.kanban?.target_work_kanban_id;
        if (targetWorkKanbanId && siteId) {
          try {
            // Trova la prima colonna della kanban destinazione
            const { data: firstColumn } = await supabase
              .from("KanbanColumn")
              .select("id")
              .eq("kanbanId", targetWorkKanbanId)
              .order("position", { ascending: true })
              .limit(1)
              .single();

            if (firstColumn) {
              // Genera nuovo codice per il lavoro
              const newCode = await generateTaskCode(siteId, "LAVORO");

              // Crea la copia del task
              const { data: newTask, error: createError } = await supabase
                .from("Task")
                .insert({
                  // Copia i dati rilevanti
                  title: task.title,
                  name: task.name,
                  unique_code: newCode,
                  clientId: task.clientId,
                  sellProductId: task.sellProductId,
                  sellPrice: task.sellPrice,
                  deliveryDate: task.deliveryDate,
                  positions: task.positions,
                  other: task.other,
                  site_id: siteId,
                  // Nuovi campi
                  kanbanId: targetWorkKanbanId,
                  kanbanColumnId: firstColumn.id,
                  parent_task_id: task.id,
                  task_type: "LAVORO",
                  display_mode: "normal",
                  percentStatus: 0,
                  archived: false,
                  locked: false,
                  material: false,
                  metalli: false,
                  ferramenta: false,
                })
                .select()
                .single();

              if (createError) {
                logger.error("Error creating work task:", createError);
              } else {
                duplicatedTask = newTask;
                logger.debug(
                  "Created work task:",
                  newTask?.id,
                  newTask?.unique_code,
                );
              }
            }
          } catch (dupError) {
            logger.error("Error in duplication process:", dupError);
          }
        }
      }

      // Gestione colonna "lost" (persa)
      if (columnType === "lost") {
        newDisplayMode = "small_red";

        // Calcola data auto-archiviazione
        if (siteId) {
          const archiveSettings = await getAutoArchiveSettings(siteId);
          if (archiveSettings.enabled) {
            autoArchiveAt = calculateAutoArchiveDate(archiveSettings.days);
          }
        }
      }
    }

    // =====================================================
    // Logica Routing Produzione (Kanban Lavori -> Kanban Produzione)
    // =====================================================
    if (isWorkKanban && columnType === "production" && siteId) {
      logger.debug("Processing work kanban -> production routing");

      // Ottieni la categoria del prodotto
      const productCategory = task?.sell_product?.name;
      logger.debug("Product category:", productCategory);

      if (productCategory) {
        // Cerca il routing configurato nelle site_settings
        const { data: routingSetting } = await supabase
          .from("site_settings")
          .select("setting_value")
          .eq("site_id", siteId)
          .eq("setting_key", "production_routing")
          .single();

        const routing = routingSetting?.setting_value || {};
        const targetProductionKanbanId = routing[productCategory];

        logger.debug("Routing config:", routing);
        logger.debug("Target production kanban:", targetProductionKanbanId);

        if (targetProductionKanbanId) {
          try {
            // Trova la prima colonna della kanban produzione
            const { data: firstColumn } = await supabase
              .from("KanbanColumn")
              .select("id")
              .eq("kanbanId", targetProductionKanbanId)
              .order("position", { ascending: true })
              .limit(1)
              .single();

            if (firstColumn) {
              // Sposta la task nella kanban produzione
              const { data: updatedTask, error: moveError } = await supabase
                .from("Task")
                .update({
                  kanbanId: targetProductionKanbanId,
                  kanbanColumnId: firstColumn.id,
                  updated_at: now,
                })
                .eq("id", id)
                .eq("site_id", siteId)
                .select()
                .single();

              if (moveError) {
                logger.error("Error moving task to production:", moveError);
              } else {
                movedTask = updatedTask;
                logger.debug(
                  "Moved task to production kanban:",
                  updatedTask?.id,
                );
              }
            }
          } catch (moveError) {
            logger.error("Error in production routing:", moveError);
          }
        }
      }
    }

    // =====================================================
    // Logica Routing Fatturazione (Kanban Produzione -> Kanban Fatture)
    // =====================================================
    if (isProductionKanban && columnType === "invoicing" && siteId) {
      logger.debug("Processing production kanban -> invoicing routing");

      const targetInvoiceKanbanId = task?.kanban?.target_invoice_kanban_id;
      logger.debug("Target invoice kanban:", targetInvoiceKanbanId);

      if (targetInvoiceKanbanId) {
        try {
          // Trova la prima colonna della kanban fatture
          const { data: firstColumn } = await supabase
            .from("KanbanColumn")
            .select("id")
            .eq("kanbanId", targetInvoiceKanbanId)
            .order("position", { ascending: true })
            .limit(1)
            .single();

          if (firstColumn) {
            // Genera nuovo codice per la fattura
            const newCode = await generateTaskCode(siteId, "FATTURA");

            // Sposta la task nella kanban fatture con nuovo codice
            const { data: updatedTask, error: moveError } = await supabase
              .from("Task")
              .update({
                kanbanId: targetInvoiceKanbanId,
                kanbanColumnId: firstColumn.id,
                unique_code: newCode,
                task_type: "FATTURA",
                updated_at: now,
              })
              .eq("id", id)
              .eq("site_id", siteId)
              .select()
              .single();

            if (moveError) {
              logger.error("Error moving task to invoicing:", moveError);
            } else {
              movedTask = updatedTask;
              logger.debug(
                "Moved task to invoice kanban:",
                updatedTask?.id,
                newCode,
              );
            }
          }
        } catch (moveError) {
          logger.error("Error in invoicing routing:", moveError);
        }
      }
    }

    // Get the total number of columns in the kanban to calculate progress percentage
    const countRes = await supabase
      .from("KanbanColumn")
      .select("*", { count: "exact", head: true })
      .eq("kanbanId", task?.kanbanId);

    if (countRes.error) throw countRes.error;

    const totalColumns = countRes.count ?? 0;

    // Calculate progress based on target column position
    // First column (position 1) should always be 0%
    // For other columns, we calculate progress based on their position relative to total columns
    let progress = 0;
    if (
      targetColumn?.position &&
      targetColumn.position > 1 &&
      totalColumns > 1
    ) {
      // Subtract 1 from position and totalColumns to make the calculation start from 0
      // This ensures first column is 0% and last column is 100%
      progress = Math.round(
        ((targetColumn.position - 1) * 100) / (totalColumns - 1),
      );
    }

    // If materials have been added, add 10 and 15 to the new progress value
    if (task!.metalli) {
      progress += 10;
    }
    if (task!.ferramenta) {
      progress += 15;
    }

    // Cap progress at 100%
    progress = Math.min(progress, 100);

    let qcControlResult;
    let packingControlResult;

    //create the packing control and qualityControl objects
    if (columnName === "QCPROD" && task) {
      const { data: qcMasterItems, error: qcMasterError } = await supabase
        .from("QcMasterItems")
        .select("*");

      if (qcMasterError) throw qcMasterError;

      if (task?.quality_control?.length === 0) {
        // Create QualityControl if it doesn't exist
        const qcPromises = task.positions
          .filter((position: any) => position !== "") // Filter out empty positions
          .map(async (position: any) => {
            // Create Quality Control entry
            const { data: qcControl, error: qcControlError } = await supabase
              .from("QualityControl")
              .insert({
                taskId: task.id,
                userId: user.id,
                positionNr: position,
              })
              .select()
              .single();

            if (qcControlError) throw qcControlError;

            // For each standard QC item, create a QC item linked to the new QC entry
            const qcItemPromises = qcMasterItems.map((item) =>
              supabase
                .from("QcItems")
                .insert({
                  name: item.name,
                  qualityControlId: qcControl.id, // Link to the newly created QC entry
                })
            );

            // Return all QC Item creation promises for this particular QC entry
            return Promise.all(qcItemPromises);
          });

        // Execute all promises for QC entries and their items
        qcControlResult = await Promise.all(qcPromises.flat());
      }
    }

    if (columnName === "IMBALLAGGIO" && task) {
      const { data: packingMasterItems, error: packingMasterError } =
        await supabase
          .from("PackingMasterItems")
          .select("*");

      if (packingMasterError) throw packingMasterError;

      if (task?.packing_control?.length === 0) {
        // Create PackingControl if it doesn't exist
        const { data: packingControl, error: packingControlError } =
          await supabase
            .from("PackingControl")
            .insert({
              taskId: task.id,
              userId: user.id,
            })
            .select()
            .single();

        if (packingControlError) throw packingControlError;

        // For each standard packing item, create a packing item linked to the new packing entry
        const packingItemPromises = packingMasterItems.map((item) =>
          supabase
            .from("PackingItems")
            .insert({
              name: item.name,
              packingControlId: packingControl.id, // Link to the newly created packing entry
            })
        );

        // Execute all promises for packing entries and their items
        packingControlResult = await Promise.all(packingItemPromises);
      }
    }

    // Se la task è stata spostata in un'altra kanban, ritorna subito
    if (movedTask) {
      // Create a new Action record to track the move
      const actionData: any = {
        type: "move_task_kanban",
        data: {
          taskId: id,
          fromColumn: prevColumn,
          toKanban: movedTask.kanbanId,
          reason: columnType,
        },
        user_id: user.id,
        taskId: id,
      };
      if (siteId) {
        actionData.site_id = siteId;
      }

      await supabase.from("Action").insert(actionData);

      return NextResponse.json({
        data: movedTask,
        movedToKanban: true,
        duplicatedTask: duplicatedTask,
        status: 200,
      });
    }

    // Prepara i dati di aggiornamento
    const updateData: any = {
      kanbanColumnId: column,
      updated_at: now,
      percentStatus: progress,
    };

    // Aggiungi campi sistema offerte se necessario
    if (newDisplayMode !== "normal") {
      updateData.display_mode = newDisplayMode;
    }
    if (autoArchiveAt) {
      updateData.auto_archive_at = autoArchiveAt.toISOString();
    }

    // Update task with site_id filtering if available
    let updateQuery = supabase
      .from("Task")
      .update(updateData)
      .eq("id", id);

    if (siteId) {
      updateQuery = updateQuery.eq("site_id", siteId);
    }

    const { data: response, error: updateError } = await updateQuery
      .select(`
        *,
        kanban_columns:kanbanColumnId(*)
      `)
      .single();

    if (updateError) throw updateError;

    if (response) {
      // Create a new Action record to track the user action
      const actionData: any = {
        type: "move_task",
        data: {
          taskId: id,
          fromColumn: prevColumn,
          toColumn: response.kanban_columns?.title,
        },
        user_id: user.id,
        taskId: id,
      };

      // Add site_id if available
      if (siteId) {
        actionData.site_id = siteId;
      }

      const { data: newAction, error: actionError } = await supabase
        .from("Action")
        .insert(actionData)
        .select()
        .single();

      if (actionError) {
        console.error("Error creating action:", actionError);
      }

      return NextResponse.json({
        data: response,
        history: newAction,
        qc: qcControlResult,
        pc: packingControlResult,
        duplicatedTask: duplicatedTask,
        status: 200,
      });
    }
  } catch (err) {
    logger.error("Error in move card API:", err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Unknown error",
      status: 400,
    });
  }
}
