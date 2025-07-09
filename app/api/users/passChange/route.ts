// pages/api/protected-route.js
import { withApiAuthRequired, getSession } from "@auth0/nextjs-auth0";
import { Auth0ManagementApi } from "../../../../core/auth/auth0-management-api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getSession();

  //Managing token
  await Auth0ManagementApi.manageToken(session);

  const email = await req.json();

  const clientId = process.env.AUTH0_CLIENT_ID;
  const response = await fetch(
    `${process.env.AUTH0_ISSUER_BASE_URL}/dbconnections/change_password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        email: email,
        connection: "Username-Password-Authentication",
      }),
    }
  );
  if (response.status === 200) {
    return NextResponse.json({
      reset: "password change succesfully!",
      status: 200,
    });
  } else {
    return NextResponse.json({
      error: `Failed to send password reset email: ${response.status} ${response.statusText}`,
      status: 500,
    });
  }
}
