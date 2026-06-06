import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext } from "@/lib/server-data";
import { getSiteDocumentTemplate } from "@/lib/documenti/get-site-document-template";
import { createClient } from "@/utils/supabase/server";
import { DocumentiPageClient } from "./documenti-page-client";

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

  const [template, documentiResult, clientsResult, suppliersResult] =
    await Promise.all([
      getSiteDocumentTemplate(siteId),
      fetchDocumenti(supabase, siteId),
      supabase
        .from("Client")
        .select(
          "id, businessName, firstName, lastName, address, city, zipCode, email",
        )
        .eq("site_id", siteId)
        .order("businessName", { ascending: true }),
      supabase
        .from("Supplier")
        .select("id, name, address, cap, location, email, contact")
        .eq("site_id", siteId)
        .order("name", { ascending: true }),
    ]);

  return (
    <DocumentiPageClient
      domain={domain}
      siteId={siteId}
      template={template}
      documenti={documentiResult}
      clients={clientsResult.data ?? []}
      suppliers={suppliersResult.data ?? []}
    />
  );
}

async function fetchDocumenti(
  supabase: Awaited<ReturnType<typeof createClient>>,
  siteId: string,
) {
  const { data, error } = await supabase
    .from("documenti")
    .select(
      `
      id, tipo_documento, numero, oggetto, status, totale_chf, created_at,
      destinatario, corpo_testo, pdf_url, condizioni_pagamento, termine_fornitura,
      note, cliente_id, allegati,
      righe_documento (
        descrizione, misure, unita, quantita, prezzo_unitario, sconto,
        is_trasporto, articolo_id, art, totale_riga
      )
    `,
    )
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.warn("Failed to fetch documenti:", error.message);
    return [];
  }

  return data ?? [];
}
