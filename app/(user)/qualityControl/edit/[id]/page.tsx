import { getSession } from "@auth0/nextjs-auth0";
import { prisma } from "../../../../../prisma-global";
import { redirect } from "next/navigation";
import SinglePageComponent from "./singlePageComponent";

async function getData(id: number) {
  // Fetch data from your API here.
  // Fetch all the products
  const qualityControl = await prisma.qualityControl.findUnique({
    where: {
      id: Number(id),
    },
    include: {
      items: true,
      task: {
        include: {
          sellProduct: true, // include the sellproduct data from the task
          client: true,
        },
      },
      user: true,
    },
  });

  return qualityControl;
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

  return (
    <>
      <SinglePageComponent data={data!} user={user} />
    </>
  );
}

export default Page;
