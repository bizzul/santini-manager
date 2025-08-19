import React from "react";
import { getUserContext } from "@/lib/auth-utils";
import { Client } from "@/types/supabase";
import DialogCreate from "./dialogCreate";
import { createClient } from "@/utils/supabase/server";
import DataWrapper from "./dataWrapper";
import { redirect } from "next/navigation";

// Force dynamic rendering to prevent static/dynamic conflicts
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getData(): Promise<Client[]> {
  // Fetch data from your API here.
  const supabase = await createClient();
  const { data: clients, error } = await supabase
    .from("client")
    .select("*")
    .order("businessName", { ascending: true });

  if (error) {
    console.error("Error fetching clients:", error);
    return [];
  }

  return clients;
}

async function Page() {
  //get initial data
  const data = await getData();

  const userContext = await getUserContext();

  if (!userContext) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect("/login");
  }
  // Now it's safe to use session.user
  const { user } = userContext.user;
  return (
    // <SWRProvider>
    <div className="container">
      <DialogCreate />
      {data.length > 0 ? (
        <DataWrapper data={data} />
      ) : (
        <div className="w-full h-full text-center">
          <h1 className="font-bold text-2xl">Nessun cliente registrato</h1>
          <p>Premi (Aggiungi cliente) per aggiungere il tuo primo cliente!</p>
        </div>
      )}
    </div>
  );
}

export default Page;
