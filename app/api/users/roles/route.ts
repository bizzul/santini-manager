import { getSession } from "@auth0/nextjs-auth0";
import { NextRequest, NextResponse } from "next/server";
import { Auth0ManagementApi } from "../../../../core/auth/auth0-management-api";

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (session) {
    try {
      //Managing token
      await Auth0ManagementApi.manageToken(session);

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
      if (getAllRoles.ok) {
        const data = await getAllRoles.json();
        const roles = data.map((role: any) => {
          return { id: role.id, name: role.name };
        });
        return NextResponse.json({ roles, status: 200 });
      } else {
        throw new Error("failed to get roles");
      }
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.message || "An error occurred";
      return NextResponse.json({ error: errorMessage, status: 400 });
    }
  } else {
    return NextResponse.json({ error: "Unauthorized", status: 401 });
  }
}
