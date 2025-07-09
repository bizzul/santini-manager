"use server";

import { prisma } from "../../../../prisma-global";
import { revalidatePath, revalidateTag } from "next/cache";

export async function saveKanban(kanban: {
  title: string;
  identifier: string;
  color?: string;
  columns: {
    id?: number;
    title: string;
    identifier: string;
    position: number;
    icon?: string;
  }[];
}) {
  console.log("Starting saveKanban with data:", {
    title: kanban.title,
    identifier: kanban.identifier,
    columnCount: kanban.columns.length,
  });

  try {
    const result = await prisma.$transaction(async (tx) => {
      console.log(
        "Creating/updating kanban with identifier:",
        kanban.identifier
      );

      // Create or update the kanban
      const kanbanResult = await tx.kanban.upsert({
        where: {
          identifier: kanban.identifier,
        },
        create: {
          title: kanban.title,
          identifier: kanban.identifier,
          color: kanban.color,
        },
        update: {
          title: kanban.title,
          color: kanban.color,
        },
      });

      console.log("Kanban saved with ID:", kanbanResult.id);

      // Get existing columns
      const existingColumns = await tx.kanbanColumn.findMany({
        where: {
          kanbanId: kanbanResult.id,
        },
      });

      console.log("Found existing columns:", existingColumns.length);

      // Delete columns that are no longer present
      const columnsToDelete = existingColumns.filter(
        (existing) => !kanban.columns.some((col) => col.id === existing.id)
      );

      if (columnsToDelete.length > 0) {
        console.log(
          "Deleting columns:",
          columnsToDelete.map((col) => col.id)
        );
        await tx.kanbanColumn.deleteMany({
          where: {
            id: {
              in: columnsToDelete.map((col) => col.id),
            },
          },
        });
      }

      // Update or create columns
      const columnPromises = kanban.columns.map((column) => {
        console.log("Processing column:", column.title, column.identifier);
        return tx.kanbanColumn.upsert({
          where: {
            id: column.id || -1, // Use -1 for new columns
            identifier: column.identifier,
          },
          create: {
            title: column.title,
            identifier: column.identifier,
            position: column.position,
            icon: column.icon,
            kanbanId: kanbanResult.id,
          },
          update: {
            title: column.title,
            position: column.position,
            icon: column.icon,
          },
        });
      });

      const columns = await Promise.all(columnPromises);
      console.log("All columns processed:", columns.length);

      return {
        ...kanbanResult,
        columns,
      };
    });

    console.log("Transaction completed successfully");

    // Comprehensive revalidation
    revalidatePath("/kanban");
    revalidatePath("/");
    revalidateTag("kanbans");

    console.log("Revalidation completed");

    return result;
  } catch (error) {
    console.error("Error saving kanban:", error);
    throw new Error("Failed to save kanban");
  }
}
