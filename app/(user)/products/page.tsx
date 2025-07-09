import React from "react";
import { Structure } from "../../../components/structure/structure";
import { faBox } from "@fortawesome/free-solid-svg-icons";
import { getSession } from "@auth0/nextjs-auth0";
import { SellProduct } from "@prisma/client";
import DialogCreate from "./dialogCreate";
import { dehydrate } from "@tanstack/react-query";
import getQueryClient from "../../getQueryClient";
import { prisma } from "../../../prisma-global";
import SellProductWrapper from "./sellProductWrapper";
import { redirect } from "next/navigation";

async function getSellProducts(): Promise<SellProduct[]> {
  // Fetch data from your API here.
  // Fetch all the products
  const sellProducts = await prisma.sellProduct.findMany({
    include: {
      Task: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return sellProducts;
}

async function Page() {
  //get initial data
  const data = await getSellProducts();

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
    // <Structure titleIcon={faBox} titleText="Prodotti" user={user}>
    <div className="container">
      <DialogCreate />
      {data ? (
        <SellProductWrapper data={data} />
      ) : (
        <div className="w-full h-full text-center">
          <h1 className="font-bold text-2xl">Nessun prodotto registrato!</h1>
          <p>Premi (Aggiungi prodotto) per aggiungere il tuo primo prodotto!</p>
        </div>
      )}
    </div>
    // </Structure>
  );
}

export default Page;
