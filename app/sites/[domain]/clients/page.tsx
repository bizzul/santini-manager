import React from "react";
import { getUserContext } from "@/lib/auth-utils";
import { Client } from "@/types/supabase";
import DialogCreate from "./dialogCreate";
import { createClient } from "@/utils/supabase/server";
import DataWrapper from "./dataWrapper";
import { redirect } from "next/navigation";
import { getSiteData } from "@/lib/fetchers";

// Force dynamic rendering to prevent static/dynamic conflicts
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getData(domain: string): Promise<Client[]> {
  try {
    console.log("Fetching site data for domain:", domain);

    // Use the getSiteData function which properly handles subdomain extraction
    const siteResult = await getSiteData(domain);

    if (!siteResult?.data) {
      console.error("No site data returned for domain:", domain);
      console.error("This means either:");
      console.error("1. The site doesn't exist in the database");
      console.error("2. The subdomain doesn't match what's stored");
      console.error("3. There's a URL routing issue");
      return [];
    }

    const siteData = siteResult.data;
    console.log("Site found:", siteData);

    // Now fetch clients using the site ID
    const supabase = await createClient();

    // Try to fetch clients with site_id filter first (if migration is complete)
    let { data: clients, error } = await supabase
      .from("Client")
      .select("*")
      .eq("site_id", siteData.id)
      .order("businessName", { ascending: true });

    // If site_id filter fails (column doesn't exist yet), fall back to unfiltered query
    if (
      error &&
      error.message.includes("column") &&
      error.message.includes("site_id")
    ) {
      console.log("site_id column not found, falling back to unfiltered query");
      const { data: fallbackClients, error: fallbackError } = await supabase
        .from("Client")
        .select("*")
        .order("businessName", { ascending: true });

      if (fallbackError) {
        console.error("Error fetching clients (fallback):", fallbackError);
        return [];
      }
      clients = fallbackClients;
    } else if (error) {
      console.error("Error fetching clients:", error);
      return [];
    }

    return clients || [];
  } catch (error) {
    console.error("Unexpected error in getData:", error);
    return [];
  }
}

async function Page({ params }: { params: Promise<{ domain: string }> }) {
  try {
    //get initial data
    const resolvedParams = await params;
    console.log("Page params:", resolvedParams);

    const userContext = await getUserContext();
    console.log("User context:", userContext);

    if (!userContext) {
      // Handle the absence of a session. Redirect or return an error.
      // For example, you might redirect to the login page:
      console.error("No user context found, redirecting to login");
      return redirect("/login");
    }

    const data = await getData(resolvedParams.domain);

    return (
      // <SWRProvider>
      <div className="min-w-full px-4 h-full ">
        <DialogCreate />
        {data.length > 0 ? (
          <DataWrapper data={data} />
        ) : (
          <div className="w-full text-center flex flex-col justify-center items-center h-[20rem]">
            <h1 className="font-bold text-2xl">Nessun cliente registrato</h1>
            <p>Premi (Aggiungi cliente) per aggiungere il tuo primo cliente!</p>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("Error in Page component:", error);
    // Return a simple error component instead of throwing
    return (
      <div className="min-w-full px-4 h-full">
        <div className="w-full text-center flex flex-col justify-center items-center h-[20rem]">
          <h1 className="font-bold text-2xl text-red-600">Errore</h1>
          <p>Si è verificato un errore durante il caricamento della pagina.</p>
        </div>
      </div>
    );
  }
}

export default Page;
