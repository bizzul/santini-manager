// pages/api/protected-route.js
import { withApiAuthRequired, getSession } from "@auth0/nextjs-auth0";
import { Auth0ManagementApi } from "../../../../../core/auth/auth0-management-api";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../prisma-global";
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const userId = params.id;
  console.log("userId", userId);
  //Managing token
  await Auth0ManagementApi.manageToken(session);

  if (session) {
    const response = await fetch(
      `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${userId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.managementToken}`,
        },
        body: JSON.stringify({
          blocked: true,
        }),
      }
    );

    if (response.ok || response.status === 200) {
      const blockedUser = await response.json();
      const updateLocalUser = await prisma.user.update({
        where: {
          authId: userId,
        },
        data: {
          enabled: false,
        },
      });
      return NextResponse.json({ blocked: blockedUser, status: 200 });
    } else {
      return NextResponse.json({
        error: `Failed to block user: ${response.status} ${response.statusText}`,
        status: 400,
      });
    }
  }
}
