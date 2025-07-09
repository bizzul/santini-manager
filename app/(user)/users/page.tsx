import React from "react";
import { Structure } from "../../../components/structure/structure";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import { Session, getSession } from "@auth0/nextjs-auth0";
import { Product_category, Roles, Supplier, User } from "@prisma/client";
import DialogCreate from "./dialogCreate";
import { prisma } from "../../../prisma-global";
import DataWrapper from "./dataWrapper";
import { redirect } from "next/navigation";
import { Auth0ManagementApi } from "../../../core/auth/auth0-management-api";
import DialogCreateRole from "./dialogCreateRole";

export type Datas = {
  users: User[];
  roles: Roles[];
  employeeRoles: any;
};

async function getData(session: Session): Promise<Datas> {
  // Fetch data from your API here.

  // Get management API token
  await Auth0ManagementApi.manageToken(session);

  // Fetch all users
  const getUsersResponse = await fetch(
    `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users`,
    {
      headers: new Headers({
        Authorization: `Bearer ${session.managementToken}`,
        "Content-Type": "application/json",
      }),
    }
  );
  const users = await getUsersResponse.json();

  // Get roles for each user

  const userRoleRequests = users.map(async (user: any) => {
    const localRoles = await prisma.user.findMany({
      where: {
        authId: user.user_id,
      },
      include: {
        roles: true,
      },
    });

    const localUser = await prisma.user.findUnique({
      where: { authId: user.user_id },
    });

    const localPicture = await prisma.user.findUnique({
      where: {
        authId: user.user_id,
      },
    });

    const userWithRoles = {
      user_id: user.user_id,
      email_verified: user.email_verified,
      picture: localPicture && localPicture.picture,
      created_at: user.created_at,
      updated_at: user.updated_at,
      email: user.email,
      name: user.name,
      enabled: localUser?.enabled,
      nickname: user.nickname,
      last_login: user.last_login,
      last_ip: user.last_ip,
      logins_count: user.logins_count,
      family_name: user.family_name,
      given_name: user.given_name,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
      blocked: user.blocked,
      // roles: user.roles.map((role: any) => role.name),
      incarichi: localRoles.map((user) => user.roles).flat(),
    };

    return userWithRoles;
  });

  // Wait for all role requests to complete and return the combined data
  const usersData = await Promise.all(userRoleRequests);

  // Get all roles
  const getAllRoles = await fetch(
    `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/roles`,
    {
      headers: new Headers({
        //@ts-ignore
        Authorization: `Bearer ${session.managementToken}`,
        "Content-Type": "application/json",
      }),
    }
  );

  const dataRoles = await getAllRoles.json();
  const roles = dataRoles.map((role: any) => {
    return { id: role.id, name: role.name };
  });

  const employeeRoles = await prisma.roles.findMany();

  return { users: usersData, roles, employeeRoles };
}

async function Page() {
  //get initial data
  const session = await getSession();
  const data = await getData(session!);

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
      <div className="container flex flex-row  gap-4 w-full justify-end align-middle ">
        {/* @ts-ignore */}
        <DialogCreate data={data} />
        <DialogCreateRole />
      </div>

      {data.users.length > 0 ? (
        <DataWrapper data={data.users} />
      ) : (
        <div className="w-full h-full text-center">
          <h1 className="font-bold text-2xl">Nessun utente creato!</h1>
          <p>Premi (Aggiungi utente) per aggiungere il tuo primo utente!</p>
        </div>
      )}
    </div>
  );
}

export default Page;
