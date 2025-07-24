import React from "react";
import { Structure } from "../../../components/structure/structure";
import { faBox, faUser } from "@fortawesome/free-solid-svg-icons";
import { getSession } from "@auth0/nextjs-auth0";
import { Client, SellProduct, Task } from "@prisma/client";
import DialogCreate from "./dialogCreate";
import { dehydrate } from "@tanstack/react-query";
import getQueryClient from "../../getQueryClient";
import { prisma } from "../../../prisma-global";
import SellProductWrapper from "./sellProductWrapper";
import { redirect } from "next/navigation";

export type Data = {
  clients: Client[];
  activeProducts: SellProduct[];
  kanbans: any[];
  tasks: Task[];
};

async function getData(): Promise<Data> {
  const clients = await prisma.client.findMany({});
  const activeProducts = await prisma.sellProduct.findMany({
    where: {
      active: true,
    },
  });
  const kanbans = await prisma.kanban.findMany({
    include: {
      columns: {
        orderBy: {
          position: "asc",
        },
      },
    },
    orderBy: {
      title: "asc",
    },
  });
  const tasks = await prisma.task.findMany({
    include: {
      client: true,
      column: true,
      kanban: true,
      errortracking: true,
      PackingControl: true,
      QualityControl: true,
      sellProduct: true,
      Action: true,
    },
    orderBy: {
      unique_code: "asc",
    },
  });

  return { clients, activeProducts, kanbans, tasks };
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
