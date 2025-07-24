import React from "react";
import { Structure } from "../../../components/structure/structure";
import { faClock } from "@fortawesome/free-solid-svg-icons";
import { getSession } from "@auth0/nextjs-auth0";
import { Roles, Task, Timetracking, User } from "@prisma/client";
import DialogCreate from "./dialogCreate";
import { prisma } from "../../../prisma-global";
import DataWrapper from "./dataWrapper";
import { redirect } from "next/navigation";

export type Datas = {
  timetrackings: Timetracking[];
  tasks: Task[];
  users: User[];
  roles: Roles[];
};

async function getData(): Promise<Datas> {
  // Fetch data from your API here.
  const timetrackings = await prisma.timetracking.findMany({
    orderBy: {
      created_at: "desc",
    },
    include: {
      task: true,
      user: true,
      roles: true,
    },
  });

  const tasks = await prisma.task.findMany({
    orderBy: {
      unique_code: "asc",
    },
    where: { archived: false },
  });

  const users = await prisma.user.findMany({
    where: { enabled: true },
    orderBy: { family_name: "asc" },
  });

  const roles = await prisma.roles.findMany();

  return { timetrackings, tasks, users, roles };
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
  //@ts-ignore
  // const { user } = await getSession();
  return (
    // <SWRProvider>
    <div className="container">
      <DialogCreate data={data.tasks} users={data.users} roles={data.roles} />
      {data.timetrackings.length > 0 ? (
        <DataWrapper data={data.timetrackings} />
      ) : (
        <div className="w-full h-full text-center">
          <h1 className="font-bold text-2xl">
            Nessun rapporto ore registrato!
          </h1>
          <p>Premi (Aggiungi rapporto) per aggiungere il tuo primo rapporto!</p>
        </div>
      )}
    </div>
  );
}

export default Page;
