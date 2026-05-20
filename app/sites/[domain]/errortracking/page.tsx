import React from "react";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { getUserContext } from "@/lib/auth-utils";
import {
  requireServerSiteContext,
  fetchErrorTracking,
  fetchTasks,
  fetchUsers,
  fetchRoles,
  fetchSuppliers,
  fetchCategories,
} from "@/lib/server-data";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import { EmptyState } from "@/components/layout/empty-state";
import DialogCreate from "./dialogCreate";
import DataWrapper from "./dataWrapper";

export default async function Page({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  const userContext = await getUserContext();
  if (!userContext?.user) {
    return redirect("/login");
  }

  const { siteId } = await requireServerSiteContext(domain);

  const [errors, tasks, users, roles, suppliers, categories] =
    await Promise.all([
      fetchErrorTracking(siteId),
      fetchTasks(siteId),
      fetchUsers(siteId),
      fetchRoles(siteId),
      fetchSuppliers(siteId),
      fetchCategories(siteId),
    ]);

  const data = { errors, tasks, users, roles, suppliers, categories };

  return (
    <PageLayout>
      <PageHeader
        title="Tracciamento errori"
        subtitle="Registro degli errori rilevati nei processi"
        actions={<DialogCreate data={data} />}
      />
      <PageContent>
        {errors.length > 0 ? (
          <DataWrapper data={errors} />
        ) : (
          <EmptyState
            icon={<AlertTriangle className="h-6 w-6" />}
            title="Nessun errore registrato"
            description="Premi 'Aggiungi errore' per creare la prima segnalazione."
          />
        )}
      </PageContent>
    </PageLayout>
  );
}
