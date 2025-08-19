import React from "react";
import { Product_category } from "@/types/supabase";
import DialogCreate from "./dialogCreate";
import DataWrapper from "./dataWrapper";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";

// Force dynamic rendering to prevent static/dynamic conflicts
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getData(): Promise<Product_category[]> {
  // Fetch data from your API here.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("Product_category")
    .select("*")
    .order("name", { ascending: true });

  return data || [];
}

async function Page() {
  //get initial data
  const data = await getData();

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
      <DialogCreate />
      {data.length > 0 ? (
        <DataWrapper data={data} />
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
