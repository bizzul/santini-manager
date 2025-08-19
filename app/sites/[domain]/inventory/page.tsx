import React from "react";
import { Structure } from "@/components/structure/structure";
import { faBox } from "@fortawesome/free-solid-svg-icons";
import { getUserContext } from "@/lib/auth-utils";

import DialogCreate from "./dialogCreate";
import { createClient } from "@/utils/supabase/server";
import DataWrapper from "./dataWrapper";
import { redirect } from "next/navigation";

// Force dynamic rendering to prevent static/dynamic conflicts
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getData(): Promise<any> {
  // Fetch data from your API here.
  const supabase = await createClient();
  const { data: inventory, error: inventoryError } = await supabase
    .from("product")
    .select("*");

  const { data: category, error: categoryError } = await supabase
    .from("product_category")
    .select("*");
  const { data: supplier, error: supplierError } = await supabase
    .from("supplier")
    .select("*");

  return { inventory, supplier, category };
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

export default Page;
