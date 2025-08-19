import React from "react";
import SellProductWrapper from "./sellProductWrapper";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { createClient } from "@/utils/supabase/server";
import DataWrapper from "./dataWrapper";

// Force dynamic rendering to prevent static/dynamic conflicts
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getSellProducts(): Promise<any[]> {
  // Fetch all the products from supabase

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("packing_control")
    .select("*")
    .eq("task.archived", false)
    .not("task.column.identifier", "eq", "SPEDITO");

  if (error) {
    console.error("Error fetching packing control:", error);
    return [];
  }

  return data;
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
    // <SWRProvider>
    // <Structure titleIcon={faBox} titleText="Packing Control" user={user}>

    <div className="container">
      {data ? (
        <SellProductWrapper data={data} />
      ) : (
        <div className="w-full h-full text-center">
          <h1 className="font-bold text-2xl">Nessun packing control creato!</h1>
        </div>
      )}
    </div>
    // </Structure>
  );
}

export default Page;
