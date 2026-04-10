import { NextRequest, NextResponse } from "next/server";
import { getSiteContext, hasSiteId } from "@/lib/site-context";
import { fetchCollaborators } from "@/lib/server-data";

function buildInitials(name: string): string {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "CL";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export async function GET(req: NextRequest) {
  const siteContext = await getSiteContext(req);
  if (!hasSiteId(siteContext)) {
    return NextResponse.json(
      { error: "Contesto sito non disponibile" },
      { status: 400 },
    );
  }

  const collaborators = await fetchCollaborators(siteContext.siteId);
  const rows = (collaborators || []).map((user: any) => {
    const firstName = user.given_name || "";
    const lastName = user.family_name || "";
    const name = `${firstName} ${lastName}`.trim() || user.email || "Collaboratore";
    return {
      id: String(user.id || ""),
      name,
      initials: user.initials || buildInitials(name),
      picture: user.picture || null,
      color: user.color || null,
    };
  }).filter((row) => row.id);

  return NextResponse.json(rows);
}
