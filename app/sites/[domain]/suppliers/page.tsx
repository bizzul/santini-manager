import React from "react";
import { getUserContext } from "@/lib/auth-utils";
import { Product_category, Supplier } from "@/types/supabase";
import DialogCreate from "./dialogCreate";
import { createClient } from "@/utils/supabase/server";
import DataWrapper from "./dataWrapper";
import { redirect } from "next/navigation";
import { getSiteData } from "@/lib/fetchers";

// Force dynamic rendering to prevent static/dynamic conflicts
export const dynamic = "force-dynamic";
export const revalidate = 0;

export type Datas = {
  suppliers: Supplier[];
  categories: Product_category[];
};

async function getData(domain: string): Promise<Datas> {
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

  // Fetch suppliers filtered by site_id if available
  let supplierQuery = supabase
    .from("Supplier")
    .select("*")
    .order("name", { ascending: true });

  if (siteId) {
    supplierQuery = supplierQuery.eq("site_id", siteId);
  }

  const { data: supplier, error: supplierError } = await supplierQuery;

  const { data: categories, error: categoriesError } = await supabase
    .from("Product_category")
    .select("*")
    .order("name", { ascending: true });

  if (supplierError || categoriesError) {
    console.error("Error fetching data:", supplierError || categoriesError);
    return { suppliers: [], categories: [] };
  }

  return { suppliers: supplier, categories: categories };
}

async function Page({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;

  //get initial data
  const data = await getData(domain);

  const session = await getUserContext();

  if (!session || !session.user) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect("/login");
  }

  // Now it's safe to use session.user
  const { user } = session;

  return (
    // <SWRProvider>
    <div className="container">
      <DialogCreate data={data.categories} domain={domain} />
      {data.suppliers.length > 0 ? (
        <DataWrapper data={data.suppliers} domain={domain} />
      ) : (
        <div className="w-full h-full text-center">
          <h1 className="font-bold text-2xl">Nessun fornitore registrato!</h1>
          <p>
            Premi (Aggiungi fornitore) per aggiungere il tuo primo fornitore!
          </p>
        </div>
      )}
    </div>
  );
}

export default Page;
