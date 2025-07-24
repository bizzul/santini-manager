import React from "react";
import { Structure } from "../../../components/structure/structure";
import { faBox, faUser } from "@fortawesome/free-solid-svg-icons";
import { getSession } from "@auth0/nextjs-auth0";
import { Client, Product, Product_category, Supplier } from "@prisma/client";
import DialogCreate from "./dialogCreate";
import { prisma } from "../../../prisma-global";
import DataWrapper from "./dataWrapper";
import { redirect } from "next/navigation";

async function getData(): Promise<Client[]> {
  // Fetch data from your API here.
  const clients = await prisma.client.findMany({
    include: {
      Task: true,
      Action: { include: { User: true } },
    },
    orderBy: {
      businessName: "asc",
    },
  });

  return clients;
}

async function Page() {
  //get initial data
  const data = await getData();

  const session = await getSession();

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
      <DialogCreate />
      {data.length > 0 ? (
        <DataWrapper data={data} />
      ) : (
        <div className="w-full h-full text-center">
          <h1 className="font-bold text-2xl">Nessun cliente registrato</h1>
          <p>Premi (Aggiungi cliente) per aggiungere il tuo primo cliente!</p>
        </div>
      )}
    </div>
  );
}

export default Page;
