import React from "react";
import { faBox, faCheckSquare } from "@fortawesome/free-solid-svg-icons";
import { getSession } from "@auth0/nextjs-auth0";
import { PackingControl } from "@prisma/client";
import { prisma } from "../../../../prisma-global";
import { redirect } from "next/navigation";
import MobilePage from "@/components/boxing/mobilePage";
import { revalidatePath } from "next/cache";
interface Data {
  packing: PackingControl[];
}

export const revalidate = 0;
async function getSellProducts(): Promise<Data> {
  // Fetch data from your API here.
  // Fetch all the products

  const data = await prisma.packingControl.findMany({
    include: {
      items: true,
      task: { include: { column: true, sellProduct: true } },
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
    orderBy: {
      task: {
        unique_code: "asc",
      },
    },
  });

  return { packing: data };
}

async function Page() {
  //get initial data
  const data = await getSellProducts();

  const session = await getSession();
  const returnLink = `/api/auth/login?returnTo=${encodeURIComponent(
    "/boxing/edit"
  )}`;
  if (!session || !session.user) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect(returnLink);
  }
  // Now it's safe to use session.user
  const { user } = session;

  return <MobilePage data={data} session={user} />;
}

export default Page;
