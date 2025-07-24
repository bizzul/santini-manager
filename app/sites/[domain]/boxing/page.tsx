import React from "react";
import { Structure } from "../../../components/structure/structure";
import { faBox } from "@fortawesome/free-solid-svg-icons";
import { getSession } from "@auth0/nextjs-auth0";
import { PackingControl } from "@prisma/client";

import { prisma } from "../../../prisma-global";
import SellProductWrapper from "./sellProductWrapper";
import { redirect } from "next/navigation";

async function getSellProducts(): Promise<PackingControl[]> {
  // Fetch data from your API here.
  // Fetch all the products
  const qualityControl = await prisma.packingControl.findMany({
    include: {
      items: true,
      task: { include: { column: true } },
      user: true,
    },
    where: {
      AND: [
        {
          task: {
            archived: false,
            column: {
              identifier: {
                not: "SPEDITO",
              },
            },
          },
        },
      ],
    },
  });

  return qualityControl;
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
    // <Structure titleIcon={faBox} titleText="Packing Control" user={user}>

    <div className="container">
      {data ? (
        <SellProductWrapper data={data} />
      ) : (
        <div className="w-full h-full text-center">
          <h1 className="font-bold text-2xl">Nessun packing control creato!</h1>
        </div>
      )}
    </div>
    // </Structure>
  );
}

export default Page;
