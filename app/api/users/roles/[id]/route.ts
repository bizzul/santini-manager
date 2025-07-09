// pages/api/protected-route.js
import { withApiAuthRequired, getSession, Session } from "@auth0/nextjs-auth0";
import { Auth0ManagementApi } from "../../../../../core/auth/auth0-management-api";
import { NextApiRequest, NextApiResponse } from "next";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();

  //Managing token
  await Auth0ManagementApi.manageToken(session);

  const userId = params.id;
  // console.log(userId);
  try {
    const getUserRolesResponse = await fetch(
      `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${userId}/roles`,
      {
        headers: new Headers({
          //@ts-ignore
          Authorization: `Bearer ${session.managementToken}`,
          "Content-Type": "application/json",
        }),
      }
    );
    const rolesData = await getUserRolesResponse.json();

    // if success, return the data
    if (getUserRolesResponse.ok) {
      return NextResponse.json({ rolesData, status: 200 });
    }
    // if another type of error, or no retries left, just rethrow
    throw rolesData;
  } catch (error) {
    return NextResponse.json({ error: error, status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();

  //Managing token
  await Auth0ManagementApi.manageToken(session);

  const userId = params.id;
  const roleId = await req.json();
  if (session) {
    try {
      const response = await fetch(
        `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${userId}/roles`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.managementToken}`,
            "Content-Type": "application/json",
          },
          //   body: JSON.stringify({ roles: [roleId] }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to get user's current roles: ${response.status} ${response.statusText}`
        );
      }
      const currentRoles = await response.json();
      // If the user already has roles, delete them all
      if (currentRoles.length > 0) {
        const deleteResponse = await fetch(
          `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${userId}/roles`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${session.managementToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              roles: currentRoles.map((role: any) => role.id),
            }),
          }
        );

        if (!deleteResponse.ok) {
          throw new Error(
            `Failed to delete user's current roles: ${deleteResponse.status} ${deleteResponse.statusText}`
          );
        }
      }

      // Add the new role(s) to the user
      const addResponse = await fetch(
        `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${userId}/roles`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.managementToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roles: [roleId],
          }),
        }
      );

      if (!addResponse.ok) {
        throw new Error(
          `Failed to add new role(s) to user: ${addResponse.status} ${addResponse.statusText}`
        );
      }
      return NextResponse.json({
        updated: `Successfully updated user's roles: ${roleId}`,
        status: 200,
      });
      // console.log(`Successfully updated user's roles: ${roleId}`);
    } catch (error) {
      console.error(error);
    }
  }
}
