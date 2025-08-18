import React from "react";
import { createClient } from "@/utils/server";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";

async function getData(id: number): Promise<any | any> {
  // Fetch data from your API here.
  const supabase = await createClient();
  const { data: task, error: taskError } = await supabase
    .from("task")
    .select("*")
    .eq("id", id)
    .single();
  if (taskError) {
    console.error("Error fetching task:", taskError);
    throw new Error("Failed to fetch task");
  }
  const { data: client, error: clientError } = await supabase
    .from("client")
    .select("*")
    .eq("id", task.clientId)
    .single();
  if (clientError) {
    console.error("Error fetching client:", clientError);
    throw new Error("Failed to fetch client");
  }
  return task;
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: number }>;
}) {
  const { id } = await params;
  //get initial data
  const data = await getData(id);

  const session = await getUserContext();

  if (!session || !session.user || !session.user.id) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect("/login");
  }
  // Now it's safe to use session.user
  const { user } = session.user;
  // console.log(data);
  const update = new Date(data.updated_at);
  const created = new Date(data.created_at);
  const deliveryDate = new Date(data.deliveryDate ?? "");

  console.log(data);
  return (
    <div className="bg-black min-h-screen text-white flex flex-col justify-center items-center w-full align-middle pt-4 text-sm md:text-lg">
      <div className="flex justify-center items-center w-full">
        {/* <Image src={brand} alt="brand" className="block mx-auto" /> */}
      </div>
      <h1 className="pb-4 flex md:w-1/2 w-full px-4">
        Dati Progetto #{data.unique_code}
      </h1>
      <div className="grid grid-cols-2 text-left md:w-1/2 w-full px-4">
        <h2>PRODOTTO:</h2>
        {/* @ts-ignore */}
        <h2 className="font-bold">{data.sellProduct.name}</h2>

        <h2>CLIENTE:</h2>
        {/* @ts-ignore */}
        <h2 className="font-bold">{data.client.businessName}</h2>

        <h2>NOME PROGETTO:</h2>
        <h2 className="font-bold">{data.title}</h2>

        <h2>DATA CONSEGNA:</h2>
        <h2 className="font-bold">{deliveryDate.toLocaleDateString()}</h2>

        <h2>CREAZIONE:</h2>
        <h2 className="font-bold">{created.toLocaleDateString()}</h2>

        <h2>ULTIMO AGGIORN.:</h2>
        <h2 className="font-bold">{update.toLocaleDateString()}</h2>

        <h2>VALORE:</h2>
        <h2 className="font-bold">{data.sellPrice}</h2>

        <h2>MATERIALE DISP.:</h2>
        <h2 className="font-bold">{data.material ? "SI" : "NO"}</h2>

        <h2>FASE:</h2>
        {/* @ts-ignore */}
        <h2 className="font-bold">{data.column.title}</h2>

        <h2>POSIZIONI:</h2>
        <ul className="font-bold">
          {data.positions.map((position: any, index: number) => (
            <li key={index}>{position}</li>
          ))}
        </ul>

        <h2>ARCHIVIATA:</h2>
        <h2 className="font-bold">{data.archived ? "SI" : "NO"}</h2>
      </div>
    </div>
  );
}
