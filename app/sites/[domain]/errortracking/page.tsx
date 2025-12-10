import React from "react";
import { redirect } from "next/navigation";
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
import DialogCreate from "./dialogCreate";
import DataWrapper from "./dataWrapper";

export default async function Page({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  // Authentication
  const userContext = await getUserContext();
  if (!userContext?.user) {
    return redirect("/login");
  }

  // Get site context (required)
  const { siteId } = await requireServerSiteContext(domain);

  // Fetch all data in parallel
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
    <div className="container">
      <DialogCreate data={data} />
      {errors.length > 0 ? (
        <DataWrapper data={errors} />
      ) : (
        <div className="w-full h-full text-center">
          <h1 className="font-bold text-2xl">Nessun errore registrato!</h1>
          <p>Premi (Aggiungi errore) per aggiungere il tuo primo errore!</p>
        </div>
      )}
    </div>
  );
}
