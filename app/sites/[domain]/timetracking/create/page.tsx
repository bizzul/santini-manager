import React from "react";
import { Session, getSession } from "@auth0/nextjs-auth0";
import { redirect } from "next/navigation";
import { prisma } from "../../../../prisma-global";
import { Roles, Task } from "@prisma/client";
import CreatePage from "../../../../components/timeTracking/create-page";

export type Datas = {
  tasks: Task[];
  roles: Roles[];
};

async function getData(session: Session): Promise<Datas> {
  // Fetch data from your API here.
  // Fetch all items that match specified conditions
  const tasks = await prisma.task.findMany({
    orderBy: { unique_code: "desc" },
    include: { client: true, column: true },
    where: { archived: false, column: { identifier: { not: "SPEDITO" } } },
  });

  // Fetch the specific item with ID 9999
  const specificTask = await prisma.task.findUnique({
    where: { unique_code: "9999" },
  });

  // Combine results, ensuring no duplicates
  const combinedTasks: Task[] | any = tasks.some(
    (task) => task.unique_code === "9999"
  )
    ? tasks
    : [...tasks, specificTask];

  const roles = await prisma.roles.findMany({
    where: {
      user: {
        some: {
          authId: {
            equals: session.user.sub,
          },
        },
      },
    },
  });

  return { tasks: combinedTasks, roles: roles };
}

async function Page() {
  const session = await getSession();

  const returnLink = `/api/auth/login?returnTo=${encodeURIComponent(
    "/timetracking/create"
  )}`;
  if (!session || !session.user) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect(returnLink);
  }

  const data = await getData(session);

  const { user } = session;

  return (
    <>
      <h1 className="pt-4 text-center text-xl">
        Ciao {user.given_name} {user.family_name}
      </h1>
      <CreatePage data={data} session={session} />
    </>
  );
}

export default Page;
