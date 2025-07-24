import { getSession } from "@auth0/nextjs-auth0";
import { Session } from "@auth0/nextjs-auth0";
import { Roles, Task, Product_category, Supplier } from "@prisma/client";
import { redirect } from "next/navigation";
import React from "react";
import { prisma } from "../../../../prisma-global";
import MobilePage from "../../../../components/errorTracking/mobilePage";

export type DataResult = {
  roles: Roles[];
  tasks: Task[];
  categories: Product_category[];
  suppliers: Supplier[];
};

async function getData(): Promise<DataResult> {
  const tasks = await prisma.task.findMany({
    orderBy: { created_at: "desc" },
  });
  const roles = await prisma.roles.findMany();
  const suppliers = await prisma.supplier.findMany();
  const categories = await prisma.product_category.findMany();

  return { tasks, roles, suppliers, categories };
}

async function Page() {
  const session = await getSession();
  const returnLink = `/api/auth/login?returnTo=${encodeURIComponent(
    "/errortracking/create"
  )}`;
  if (!session || !session.user) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect(returnLink);
  }
  // Now it's safe to use session.user
  const { user } = session;

  //get initial data
  const data = await getData();

  return <MobilePage data={data} session={session} />;
}

export default Page;
