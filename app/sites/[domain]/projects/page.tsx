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

export type Data = {
  clients: any[];
  activeProducts: SellProduct[];
  kanbans: any[];
  tasks: any[];
};

async function getData(): Promise<Data> {
  const supabase = await createClient();
  const { data: clients, error: clientsError } = await supabase
    .from("Client")
    .select("*");
  if (clientsError) {
    console.error("Error fetching clients:", clientsError);
    throw new Error("Failed to fetch clients");
  }
  const { data: activeProducts, error: activeProductsError } = await supabase
    .from("SellProduct")
    .select("*")
    .eq("active", true);
  if (activeProductsError) {
    console.error("Error fetching active products:", activeProductsError);
    throw new Error("Failed to fetch active products");
  }
  const { data: kanbans, error: kanbansError } = await supabase
    .from("Kanban")
    .select("*");
  if (kanbansError) {
    console.error("Error fetching kanbans:", kanbansError);
    throw new Error("Failed to fetch kanbans");
  }
  const { data: tasks, error: tasksError } = await supabase
    .from("Task")
    .select("*");
  if (tasksError) {
    console.error("Error fetching tasks:", tasksError);
    throw new Error("Failed to fetch tasks");
  }

  return { clients, activeProducts, kanbans, tasks };
}

async function Page() {
  //get initial data
  const data = await getData();

  const session = await getUserContext();

  if (!session || !session.user || !session.user.id) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect("/login");
  }
  // Now it's safe to use session.user
  const { user } = session.user || {};

  return (
    // <SWRProvider>
    // <Structure titleIcon={faUser} titleText="Progetti" user={user}>
    <div className="container ">
      <DialogCreate data={data} />
      {data ? (
        <SellProductWrapper data={data} />
      ) : (
        <div className="w-full h-full text-center">
          <h1 className="font-bold text-2xl">Nessun progetto registrato!</h1>
          <p>Premi (Aggiungi progetto) per aggiungere il tuo primo progetto!</p>
        </div>
      )}
    </div>
    // </Structure>
  );
}

export default Page;
