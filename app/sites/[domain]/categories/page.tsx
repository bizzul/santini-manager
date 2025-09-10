import React from "react";
import { Product_category } from "@/types/supabase";
import DialogCreate from "./dialogCreate";
import DataWrapper from "./dataWrapper";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";

// Force dynamic rendering to prevent static/dynamic conflicts
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getData(domain: string): Promise<Product_category[]> {
  // Fetch data from your API here.
  const supabase = await createClient();

  // Get site information
  let siteId = null;
  try {
    const siteResult = await getSiteData(domain);
    if (siteResult?.data) {
      siteId = siteResult.data.id;
    }
  } catch (error) {
    console.error("Error fetching site data:", error);
  }

  // Fetch categories filtered by site_id if available
  let categoryQuery = supabase
    .from("Product_category")
    .select("*")
    .order("name", { ascending: true });

  if (siteId) {
    categoryQuery = categoryQuery.eq("site_id", siteId);
  }

  const { data, error } = await categoryQuery;

  return data || [];
}

async function Page({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;

  //get initial data
  const data = await getData(domain);

  const userContext = await getUserContext();

  if (!userContext || !userContext.user) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect("/login");
  }
  // Now it's safe to use session.user
  const { user } = userContext;

  return (
    // <SWRProvider>
    // <Structure titleIcon={faBox} titleText="Categorie prodotto" user={user}>
    <div className="container">
      <DialogCreate domain={domain} />
      {data.length > 0 ? (
        <DataWrapper data={data} domain={domain} />
      ) : (
        <div className="w-full h-full text-center">
          <h1 className="font-bold text-2xl">Nessuna categoria registrata!</h1>
          <p>
            Premi (Aggiungi categoria) per aggiungere la tua prima categoria
          </p>
        </div>
      )}
    </div>
    // </Structure>
  );
}

export default Page;
