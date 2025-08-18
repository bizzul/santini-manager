import React from "react";
import { getUserContext } from "@/lib/auth-utils";
import { SellProduct } from "@prisma/client";
import DialogCreate from "./dialogCreate";
import { createClient } from "@/utils/server";
import SellProductWrapper from "./sellProductWrapper";
import { redirect } from "next/navigation";

async function getSellProducts(): Promise<SellProduct[]> {
  // Fetch data from your API here.
  // Fetch all the products
  const supabase = await createClient();
  const { data: sellProducts, error: sellProductsError } = await supabase
    .from("sell_product")
    .select("*")
    .order("name", { ascending: true });
  if (sellProductsError) {
    console.error("Error fetching sell products:", sellProductsError);
    throw new Error("Failed to fetch sell products");
  }
  return sellProducts;
}

async function Page() {
  //get initial data
  const data = await getSellProducts();

  const userContext = await getUserContext();

  if (!userContext || !userContext.user) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect("/login");
  }
  // Now it's safe to use session.user
  const { user } = userContext;

  return (
    <div className="container mx-auto">
      <DialogCreate />
      {data ? (
        <SellProductWrapper data={data} />
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
