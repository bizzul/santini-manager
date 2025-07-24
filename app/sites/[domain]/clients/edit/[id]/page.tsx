import { getSession } from "@auth0/nextjs-auth0";
import { Product } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "../../../../../prisma-global";
import MobilePage from "../../../../../components/inventory/MobilePage";
async function getData(id: number): Promise<Product> {
  try {
    // Fetch data from your API here.
    const product = await prisma.product.findUniqueOrThrow({
      where: {
        inventoryId: Number(id),
      },
      include: {
        product_category: true,
        supplierInfo: true,
        Action: { include: { User: true } },
      },
    });

    return product;
  } catch (err) {
    //@ts-ignore
    return { error: "no Product Found" };
  }
}

async function Page({ params }: { params: { id: number } }) {
  //get initial data
  const data = await getData(params.id);

  const session = await getSession();

  if (!session || !session.user) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect("/login");
  }

  // Now it's safe to use session.user
  const { user } = session;

  //@ts-ignore
  if (data.error) {
    return (
      <div className="flex justify-center w-screen h-screen flex-col items-center align-middle  text-slate-200 bg-[#1A2027]">
        <h1 className="font-bold text-3xl text-center">
          Nessun prodotto con questo ID: {params.id}
        </h1>
      </div>
    );
  }
  return (
    <>
      <MobilePage data={data} />
    </>
  );
}

export default Page;
