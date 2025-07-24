import React from "react";
import { Structure } from "../../../components/structure/structure";
import { faBox } from "@fortawesome/free-solid-svg-icons";
import { getSession } from "@auth0/nextjs-auth0";
import { Product_category } from "@prisma/client";
import DialogCreate from "./dialogCreate";
import { prisma } from "../../../prisma-global";
import DataWrapper from "./dataWrapper";
import { redirect } from "next/navigation";

async function getData(): Promise<Product_category[]> {
  // Fetch data from your API here.
  const category = await prisma.product_category.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return category;
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
    // <Structure titleIcon={faBox} titleText="Categorie prodotto" user={user}>
    <div className="container">
      <DialogCreate />
      {data.length > 0 ? (
        <DataWrapper data={data} />
      ) : (
        <div className="w-full h-full text-center">
          <h1 className="font-bold text-2xl">Nessuna categoria registrata!</h1>
          <p>
            Premi (Aggiungi categoria) per aggiungere la tua prima categoria
          </p>
        </div>
      )}
    </div>
    // </Structure>
  );
}

export default Page;
