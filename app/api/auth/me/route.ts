import { getSession } from "@auth0/nextjs-auth0";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Return the user data from the session
    return NextResponse.json({
      user: {
        ...session.user,
        sub: session.user.sub,
        picture: session.user.picture || null,
      },
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
