import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext } from "@/lib/server-data";
import { KanbanCategoryManager } from "@/components/kanbans/KanbanCategoryManager";

export default async function KanbanCategoriesPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  // Authentication & Authorization
  const userContext = await getUserContext();
  if (!userContext?.user) {
    return redirect("/login");
  }

  // Only superadmins can access this page
  if (userContext.role !== "superadmin") {
    return redirect("/unauthorized");
  }

  // Validate site context
  await requireServerSiteContext(domain);

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
