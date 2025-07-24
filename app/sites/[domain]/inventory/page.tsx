import React from "react";
import { Structure } from "../../../components/structure/structure";
import { faBox } from "@fortawesome/free-solid-svg-icons";
import { getSession } from "@auth0/nextjs-auth0";
import {
  Product,
  Product_category,
  SellProduct,
  Supplier,
} from "@prisma/client";
import DialogCreate from "./dialogCreate";
import { dehydrate } from "@tanstack/react-query";
import getQueryClient from "../../getQueryClient";
import { prisma } from "../../../prisma-global";
import DataWrapper from "./dataWrapper";
import { redirect } from "next/navigation";

export type DataResult = {
  inventory: Product[];
  category: Product_category[];
  supplier: Supplier[];
};

export const revalidate = 60;

async function getData(): Promise<DataResult> {
  // Fetch data from your API here.
  const inventory = await prisma.product.findMany({
    include: {
      product_category: true,
      supplierInfo: true,
      Action: { include: { User: true } },
    },
  });

  const category = await prisma.product_category.findMany();
  const supplier = await prisma.supplier.findMany();

  return { inventory, supplier, category };
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
      <DialogCreate data={data} />
      {data.inventory.length > 0 ? (
        <DataWrapper data={data.inventory} />
      ) : (
        <div className="w-full h-full text-center">
          <h1 className="font-bold text-2xl">Nessun prodotto registrato!</h1>
          <p>Premi (Aggiungi prodotto) per aggiungere il tuo primo prodotto!</p>
        </div>
      )}
    </div>
  );
}

export default Page;
