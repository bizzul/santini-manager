import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext, fetchCategories } from "@/lib/server-data";
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

  // Fetch data
  const categories = await fetchCategories(siteId);

  return (
    <div className="container">
      <DialogCreate domain={domain} />
      {categories.length > 0 ? (
        <DataWrapper data={categories} domain={domain} />
      ) : (
        <div className="w-full h-full text-center">
          <h1 className="font-bold text-2xl">Nessuna categoria registrata!</h1>
          <p>
            Premi (Aggiungi categoria) per aggiungere la tua prima categoria
          </p>
        </div>
      )}
    </div>
  );
}
