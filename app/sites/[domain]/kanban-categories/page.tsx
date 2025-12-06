import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { KanbanCategoryManager } from "@/components/kanbans/KanbanCategoryManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function KanbanCategoriesPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const userContext = await getUserContext();

  if (!userContext || !userContext.user) {
    return redirect("/login");
  }

  // Only superadmins can access this page
  if (userContext.role !== "superadmin") {
    return redirect("/unauthorized");
  }

  const resolvedParams = await params;
  const domain = resolvedParams.domain;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Gestione Categorie Kanban</h1>
        <p className="text-muted-foreground mt-2">
          Gestisci le categorie per organizzare le tue kanban boards
        </p>
      </div>

      <KanbanCategoryManager domain={domain} />
    </div>
  );
}

