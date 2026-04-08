import { NextRequest, NextResponse } from "next/server";
import { getSiteContext, hasSiteId } from "@/lib/site-context";
import { createServiceClient } from "@/utils/supabase/server";
import { createTabularReportResponse } from "@/lib/tabular-report-export";

export const dynamic = "force-dynamic";

type CollaboratorDetailRow = {
  Campo: string;
  Valore: string;
};

export async function POST(req: NextRequest) {
  const siteContext = await getSiteContext(req);
  if (!hasSiteId(siteContext)) {
    return NextResponse.json(
      { error: "Contesto sito non disponibile" },
      { status: 400 },
    );
  }

  const payload = await req.json().catch(() => null);
  const collaboratorId = Number(payload?.userId);
  const format = payload?.format === "pdf" ? "pdf" : "excel";

  if (!Number.isInteger(collaboratorId)) {
    return NextResponse.json(
      { error: "Collaboratore non valido" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data: siteUsers, error: siteUsersError } = await supabase
    .from("user_sites")
    .select("user_id")
    .eq("site_id", siteContext.siteId);

  if (siteUsersError) {
    return NextResponse.json({ error: siteUsersError.message }, { status: 500 });
  }

  const authIds = (siteUsers || []).map((siteUser: any) => siteUser.user_id);
  const { data: collaborator, error } = await supabase
    .from("User")
    .select("*")
    .eq("id", collaboratorId)
    .in("authId", authIds)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!collaborator) {
    return NextResponse.json(
      { error: "Collaboratore non trovato" },
      { status: 404 },
    );
  }

  const { data: roleLinks, error: roleLinksError } = await supabase
    .from("_RolesToUser")
    .select("A")
    .eq("B", collaboratorId);

  if (roleLinksError) {
    return NextResponse.json({ error: roleLinksError.message }, { status: 500 });
  }

  let roleNames = "-";
  const roleIds = (roleLinks || []).map((roleLink: any) => roleLink.A);
  if (roleIds.length > 0) {
    const { data: roles, error: rolesError } = await supabase
      .from("Roles")
      .select("id, name, site_id")
      .in("id", roleIds)
      .or(`site_id.eq.${siteContext.siteId},site_id.is.null`);

    if (rolesError) {
      return NextResponse.json({ error: rolesError.message }, { status: 500 });
    }

    roleNames = (roles || []).map((role: any) => role.name).join(", ") || "-";
  }

  const collaboratorName =
    `${collaborator.given_name || ""} ${collaborator.family_name || ""}`.trim() ||
    collaborator.email ||
    "Collaboratore";

  const rows: CollaboratorDetailRow[] = [
    { Campo: "Nome", Valore: collaborator.given_name || "-" },
    { Campo: "Cognome", Valore: collaborator.family_name || "-" },
    { Campo: "Nome completo", Valore: collaboratorName },
    { Campo: "Email", Valore: collaborator.email || "-" },
    { Campo: "Sigla", Valore: collaborator.initials || "-" },
    { Campo: "Ruoli", Valore: roleNames },
    {
      Campo: "Stato",
      Valore:
        collaborator.enabled === undefined
          ? "-"
          : collaborator.enabled
            ? "Attivo"
            : "Disattivato",
    },
    {
      Campo: "Creato il",
      Valore: collaborator.created_at
        ? new Date(collaborator.created_at).toLocaleString("it-IT")
        : "-",
    },
  ];

  return createTabularReportResponse({
    title: "Scheda collaboratore",
    subtitle: `Profilo collaboratore - ${collaboratorName}`,
    sheetName: "Collaboratore",
    filenameBase: `report-collaboratore-${collaborator.id}`,
    format,
    rows,
    columns: [
      { key: "Campo", header: "Campo", width: 24, pdfWidth: 150 },
      { key: "Valore", header: "Valore", width: 50, pdfWidth: 365 },
    ],
    metaLines: [`Collaboratore ID: ${collaborator.id}`],
    siteName: siteContext.siteData?.name,
    logoUrl: siteContext.siteData?.logo,
    documentCode: `HR-${collaborator.id}`,
  });
}
