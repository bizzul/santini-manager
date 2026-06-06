import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext } from "@/lib/server-data";
import { getSiteDocumentTemplate } from "@/lib/documenti/get-site-document-template";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import { fetchSiteDocumenti } from "@/lib/documenti/fetch-site-documenti";
import {
  DocumentiPageClient,
  type DocumentoListItem,
} from "./documenti-page-client";

export default async function Page({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  const userContext = await getUserContext();
  if (!userContext?.user) {
    return redirect("/login");
  }

  const { siteId } = await requireServerSiteContext(domain);
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const [template, documentiResult, clientsResult, suppliersResult, offersResult] =
    await Promise.all([
      getSiteDocumentTemplate(siteId),
      fetchSiteDocumenti(serviceClient, siteId).catch((error) => {
        console.warn("Failed to fetch documenti:", error.message);
        return [];
      }),
      supabase
        .from("Client")
        .select(
          "id, businessName, individualFirstName, individualLastName, individualTitle, address, city, zipCode, email, contactPeople",
        )
        .eq("site_id", siteId)
        .order("businessName", { ascending: true }),
      supabase
        .from("Supplier")
        .select("id, name, address, cap, location, email, contact")
        .eq("site_id", siteId)
        .order("name", { ascending: true }),
      supabase
        .from("Task")
        .select(
          "id, unique_code, name, clientId, clients:clientId(id, businessName, individualFirstName, individualLastName)",
        )
        .eq("site_id", siteId)
        .eq("task_type", "OFFERTA")
        .eq("archived", false)
        .order("created_at", { ascending: false }),
    ]);

  const offers = (offersResult.data ?? []).map((offer) => {
    const client = offer.clients as {
      id?: number;
      businessName?: string | null;
      individualFirstName?: string | null;
      individualLastName?: string | null;
    } | null;
    const clientName = client
      ? client.businessName?.trim() ||
        `${client.individualFirstName ?? ""} ${client.individualLastName ?? ""}`.trim() ||
        null
      : null;

    return {
      id: offer.id as number,
      unique_code: offer.unique_code as string,
      name: offer.name as string,
      clientId: offer.clientId as number | null,
      clientName,
      label: `${offer.unique_code}${clientName ? ` - ${clientName}` : ""}`,
    };
  });

  return (
    <DocumentiPageClient
      domain={domain}
      siteId={siteId}
      template={template}
      documenti={documentiResult as DocumentoListItem[]}
      clients={clientsResult.data ?? []}
      suppliers={suppliersResult.data ?? []}
      offers={offers}
    />
  );
}

