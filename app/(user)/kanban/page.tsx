import React from "react";
import { prisma } from "../../../prisma-global";
import { redirect } from "next/navigation";
import { Client } from "auth0";
import { Action, SellProduct, Task } from "@prisma/client";
import { getSession } from "@auth0/nextjs-auth0";
import ContentPage from "@/components/kanbans/ContentPage";
import { getAvailableSnapshots } from "./actions/get-available-snapshots.action";

export interface Data {
  clients: Client[];
  products: SellProduct[];
  history: Action[];
}

export const revalidate = 0;

async function getData(): Promise<Data | any> {
  const clients = await prisma.client.findMany({});
  const products = await prisma.sellProduct.findMany({
    include: {
      Task: true,
    },
    where: {
      active: true,
    },
  });

  const history = await prisma.action.findMany({
    include: {
      Client: true,
      Task: true,
      User: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return { clients, products, history };
}

export default async function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const data = await getData();
  const session = await getSession();

  if (!session || !session.user) {
    return redirect("/login");
  }

  const { user } = session;
  let kanName = searchParams.name;

  if (typeof name === "string") {
    kanName = searchParams.name!.toUpperCase();
  }

  // Fetch kanban data server-side
  const kanban = await prisma.kanban.findFirst({
    where: {
      identifier: kanName,
    },
    include: {
      columns: {
        orderBy: {
          position: "asc",
        },
      },
    },
  });

  // Fetch initial tasks server-side
  const initialTasks = await fetch(
    `${process.env.NEXT_PUBLIC_URL}/api/kanban/tasks`,
    {
      cache: "no-store",
    }
  ).then((res) => res.json());

  const snapshots = await getAvailableSnapshots();

  return (
    <ContentPage
      kanName={kanName!}
      clients={data.clients}
      products={data.products}
      history={data.history}
      initialTasks={initialTasks}
      snapshots={snapshots}
      kanban={kanban} // Pass the kanban data
    />
  );
}
