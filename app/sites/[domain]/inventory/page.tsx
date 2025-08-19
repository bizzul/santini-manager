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

async function getData(): Promise<{
  inventory: any[];
  supplier: any[];
  category: any[];
}> {
  try {
    console.log("🔄 Starting inventory data fetch...");

    // Fetch data from your API here.
    const supabase = await createClient();
    console.log("✅ Supabase client created");

    const { data: inventory, error: inventoryError } = await supabase
      .from("Product")
      .select("*");

    console.log("📦 Inventory query result:", {
      data: inventory?.length || 0,
      error: inventoryError,
    });

    if (inventoryError) {
      console.error("❌ Error fetching inventory:", inventoryError);
      return { inventory: [], supplier: [], category: [] };
    }

    const { data: category, error: categoryError } = await supabase
      .from("Product_category")
      .select("*");

    console.log("🏷️ Category query result:", {
      data: category?.length || 0,
      error: categoryError,
    });

    if (categoryError) {
      console.error("❌ Error fetching categories:", categoryError);
      return { inventory: inventory || [], supplier: [], category: [] };
    }

    const { data: supplier, error: supplierError } = await supabase
      .from("Supplier")
      .select("*");

    console.log("🏭 Supplier query result:", {
      data: supplier?.length || 0,
      error: supplierError,
    });

    if (supplierError) {
      console.error("❌ Error fetching suppliers:", supplierError);
      return {
        inventory: inventory || [],
        supplier: [],
        category: category || [],
      };
    }

    const result = {
      inventory: inventory || [],
      supplier: supplier || [],
      category: category || [],
    };

    console.log("✅ Final data result:", {
      inventoryCount: result.inventory.length,
      supplierCount: result.supplier.length,
      categoryCount: result.category.length,
    });

    return result;
  } catch (error) {
    console.error("💥 Unexpected error in getData:", error);
    return { inventory: [], supplier: [], category: [] };
  }
}

async function Page() {
  try {
    console.log("🚀 Inventory page starting...");

    //get initial data
    const data = await getData();
    console.log("📊 Data fetched successfully");

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
      <div className="container">
        <DialogCreate data={data} />
        {data.inventory && data.inventory.length > 0 ? (
          <DataWrapper data={data.inventory} />
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
    console.error("💥 Error in inventory page:", error);
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
