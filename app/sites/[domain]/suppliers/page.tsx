import React from "react";
import { Structure } from "@/components/structure/structure";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import { getUserContext } from "@/lib/auth-utils";
import { Product_category, Supplier } from "@prisma/client";
import DialogCreate from "./dialogCreate";
import { createClient } from "@/utils/server";
import DataWrapper from "./dataWrapper";
import { redirect } from "next/navigation";

export type Datas = {
  suppliers: Supplier[];
  categories: Product_category[];
};

async function getData(): Promise<Datas> {
  // Fetch data from your API here.
  const supabase = await createClient();
  const { data: supplier, error: supplierError } = await supabase
    .from("supplier")
    .select("*")
    .order("name", { ascending: true });

  const { data: categories, error: categoriesError } = await supabase
    .from("product_category")
    .select("*")
    .order("name", { ascending: true });

  if (supplierError || categoriesError) {
    console.error("Error fetching data:", supplierError || categoriesError);
    return { suppliers: [], categories: [] };
  }

  return { suppliers: supplier, categories: categories };
}

async function Page() {
  //get initial data
  const data = await getData();

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
      <DialogCreate data={data.categories} />
      {data.suppliers.length > 0 ? (
        <DataWrapper data={data.suppliers} />
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
