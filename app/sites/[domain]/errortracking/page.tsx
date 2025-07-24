import React from "react";
import { Structure } from "../../../components/structure/structure";
import { faBox, faCrosshairs } from "@fortawesome/free-solid-svg-icons";
import { getSession } from "@auth0/nextjs-auth0";
import {
  Errortracking,
  Product,
  Product_category,
  Roles,
  Supplier,
  Task,
  User,
} from "@prisma/client";
import DialogCreate from "./dialogCreate";
import { prisma } from "../../../prisma-global";
import DataWrapper from "./dataWrapper";
import { redirect } from "next/navigation";

export type DataResult = {
  roles: Roles[];
  tasks: Task[];
  categories: Product_category[];
  suppliers: Supplier[];
  errors: Errortracking[];
  users: User[];
};

async function getData(): Promise<DataResult> {
  const errors = await prisma.errortracking.findMany({
    include: {
      supplier: true,
      task: true,
      files: true,
      user: true,
    },
  });
  const tasks = await prisma.task.findMany({
    orderBy: { created_at: "desc" },
  });
  const users = await prisma.user.findMany({ orderBy: { family_name: "asc" } });
  const roles = await prisma.roles.findMany();
  const suppliers = await prisma.supplier.findMany();
  const categories = await prisma.product_category.findMany();

  return { tasks, roles, suppliers, categories, errors, users };
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
    //  <Structure titleIcon={faCrosshairs} titleText="ErrorTracking" user={user}>
    <div className="container">
      <DialogCreate data={data} />
      {data.errors.length > 0 ? (
        <DataWrapper data={data.errors} />
      ) : (
        <div className="w-full h-full text-center">
          <h1 className="font-bold text-2xl">Nessun errore registrato!</h1>
          <p>Premi (Aggiungi errore) per aggiungere il tuo primo errore!</p>
        </div>
      )}
    </div>
    // </Structure>
  );
}

export default Page;
