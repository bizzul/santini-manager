import React from "react";
import { getUserContext } from "@/lib/auth-utils";
import { SellProduct } from "@/types/supabase";
import DialogCreate from "./dialogCreate";
import { createClient } from "@/utils/supabase/server";
import SellProductWrapper from "./sellProductWrapper";
import { redirect } from "next/navigation";
import { getSiteData } from "@/lib/fetchers";

// Force dynamic rendering to prevent static/dynamic conflicts
export const dynamic = "force-dynamic";
export const revalidate = 0;

export type Data = {
  clients: any[];
  activeProducts: SellProduct[];
  kanbans: any[];
  tasks: any[];
};

async function getData(domain?: string): Promise<Data> {
  const supabase = await createClient();

  // Get site information first
  let site_id = null;
  if (domain) {
    try {
      const siteResult = await getSiteData(domain);
      if (siteResult?.data) {
        site_id = siteResult.data.id;
      }
    } catch (error) {
      console.error("Error fetching site data:", error);
    }
  }

  // Get clients filtered by site_id if available
  let clientsQuery = supabase.from("Client").select("*");
  if (site_id) {
    clientsQuery = clientsQuery.eq("site_id", site_id);
  }
  const { data: clients, error: clientsError } = await clientsQuery;

  if (clientsError) {
    console.error("Error fetching clients:", clientsError);
    throw new Error("Failed to fetch clients");
  }

  // Get products filtered by site_id if available
  let productsQuery = supabase
    .from("SellProduct")
    .select("*")
    .eq("active", true);
  if (site_id) {
    productsQuery = productsQuery.eq("site_id", site_id);
  }
  const { data: activeProducts, error: activeProductsError } =
    await productsQuery;

  if (activeProductsError) {
    console.error("Error fetching active products:", activeProductsError);
    throw new Error("Failed to fetch active products");
  }

  // Get kanbans filtered by site_id if available
  let kanbansQuery = supabase.from("Kanban").select("*");
  if (site_id) {
    kanbansQuery = kanbansQuery.eq("site_id", site_id);
  }
  const { data: kanbans, error: kanbansError } = await kanbansQuery;

  if (kanbansError) {
    console.error("Error fetching kanbans:", kanbansError);
    throw new Error("Failed to fetch kanbans");
  }

  // Get tasks filtered by site_id if available, with related data
  let tasksQuery = supabase.from("Task").select(`
      *,
      Kanban!kanbanId (
        id,
        title
      ),
      KanbanColumn!kanbanColumnId (
        id,
        title
      ),
      Client!clientId (
        businessName,
        individualFirstName,
        individualLastName
      ),
      SellProduct!sellProductId (
        name
      ),
      Action (
        id,
        createdAt,
        User (
          picture,
          authId,
          given_name
        )
      )
    `);
  if (site_id) {
    tasksQuery = tasksQuery.eq("site_id", site_id);
  }
  const { data: tasks, error: tasksError } = await tasksQuery;

  if (tasksError) {
    console.error("Error fetching tasks:", tasksError);
    throw new Error("Failed to fetch tasks");
  }

  return { clients, activeProducts, kanbans, tasks };
}

export default async function Page({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  //get initial data
  const data = await getData(domain);

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
