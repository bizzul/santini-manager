import React from "react";
import { getUserContext } from "@/lib/auth-utils";

import DialogCreate from "./dialogCreate";
import { createClient } from "@/utils/server";
import DataWrapper from "./dataWrapper";
import { redirect } from "next/navigation";

async function getData(): Promise<any> {
  const supabase = await createClient();
  const { data: errors, error: errorsError } = await supabase
    .from("errortracking")
    .select("*");

  const { data: tasks, error: tasksError } = await supabase
    .from("task")
    .select("*")
    .order("created_at", { ascending: false });
  const users = await supabase
    .from("user")
    .select("*")
    .order("family_name", { ascending: true });
  const { data: roles, error: rolesError } = await supabase
    .from("roles")
    .select("*");
  const { data: suppliers, error: suppliersError } = await supabase
    .from("supplier")
    .select("*");
  const { data: categories, error: categoriesError } = await supabase
    .from("product_category")
    .select("*");

  return { tasks, roles, suppliers, categories, errors, users };
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

  return (
    //  <Structure titleIcon={faCrosshairs} titleText="ErrorTracking" user={user}>
    <div className="container">
      <DialogCreate data={data} />
      {data.errors.length > 0 ? (
        <DataWrapper data={data.errors} />
      ) : (
        <div className="w-full h-full text-center">
          <h1 className="font-bold text-2xl">Nessun errore registrato!</h1>
          <p>Premi (Aggiungi errore) per aggiungere il tuo primo errore!</p>
        </div>
      )}
    </div>
    // </Structure>
  );
}

export default Page;
