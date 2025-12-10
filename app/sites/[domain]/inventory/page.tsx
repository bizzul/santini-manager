import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import {
  requireServerSiteContext,
  fetchInventoryData,
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

  // Fetch inventory data
  const data = await fetchInventoryData(siteId);

  return (
    <div className="container">
      <DialogCreate data={data} />
      {data.inventory.length > 0 ? (
        <DataWrapper data={data.inventory} />
      ) : (
        <div className="w-full h-full text-center">
          <h1 className="font-bold text-2xl">Nessun prodotto registrato!</h1>
          <p>Premi (Aggiungi prodotto) per aggiungere il tuo primo prodotto!</p>
        </div>
      )}
    </div>
  );
}
