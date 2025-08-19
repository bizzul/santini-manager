import React from "react";
import { getUserContext } from "@/lib/auth-utils";
import { SellProduct } from "@/types/supabase";
import DialogCreate from "./dialogCreate";
import { createClient } from "@/utils/supabase/server";
import SellProductWrapper from "./sellProductWrapper";
import { redirect } from "next/navigation";

// Force dynamic rendering to prevent static/dynamic conflicts
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getSellProducts(): Promise<SellProduct[]> {
  try {
    console.log("🔄 Starting sell products fetch...");

    // Fetch data from your API here.
    // Fetch all the products
    const supabase = await createClient();
    console.log("✅ Supabase client created");

    const { data: sellProducts, error: sellProductsError } = await supabase
      .from("SellProduct")
      .select("*")
      .order("name", { ascending: true });

    console.log("📦 Sell products query result:", {
      data: sellProducts?.length || 0,
      error: sellProductsError,
    });

    if (sellProductsError) {
      console.error("❌ Error fetching sell products:", sellProductsError);
      return [];
    }

    console.log(
      "✅ Sell products fetched successfully:",
      sellProducts?.length || 0
    );
    return sellProducts || [];
  } catch (error) {
    console.error("💥 Unexpected error in getSellProducts:", error);
    return [];
  }
}

async function Page() {
  try {
    console.log("🚀 Products page starting...");

    //get initial data
    const data = await getSellProducts();
    console.log("📊 Data fetched successfully, count:", data.length);

    const userContext = await getUserContext();
    console.log("👤 User context:", userContext ? "Found" : "Not found");

    if (!userContext || !userContext.user) {
      console.log("❌ No user context, redirecting to login");
      // Handle the absence of a session. Redirect or return an error.
      // For example, you might redirect to the login page:
      return redirect("/login");
    }
    // Now it's safe to use session.user
    const { user } = userContext;
    console.log("✅ User authenticated:", user.email);

    return (
      <div className="container mx-auto">
        <DialogCreate />
        {data && data.length > 0 ? (
          <SellProductWrapper data={data} />
        ) : (
          <div className="w-full h-full text-center">
            <h1 className="font-bold text-2xl">Nessun prodotto registrato!</h1>
            <p>
              Premi (Aggiungi prodotto) per aggiungere il tuo primo prodotto!
            </p>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("💥 Error in products page:", error);
    return (
      <div className="w-full h-full text-center">
        <h1 className="font-bold text-2xl">Errore nel caricamento</h1>
        <p>Si è verificato un errore nel caricamento dei dati.</p>
        <pre className="text-sm text-red-500 mt-2">{String(error)}</pre>
      </div>
    );
  }
}

export default Page;
