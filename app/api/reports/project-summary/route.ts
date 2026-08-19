import { NextRequest, NextResponse } from "next/server";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteContext, hasSiteId } from "@/lib/site-context";
import { createServiceClient } from "@/utils/supabase/server";
import { buildDocumentFilename } from "@/lib/document-filename";
import { parseTypedComments } from "@/lib/task-typed-comments";
import { resolvePdfLogoBuffer } from "@/lib/pdf-report-branding";
import { buildProjectSummaryPdf } from "@/lib/project-summary-pdf";

export const dynamic = "force-dynamic";

type ClientRow = {
  businessName?: string | null;
  individualFirstName?: string | null;
  individualLastName?: string | null;
  phone?: string | null;
  mobilePhone?: string | null;
  landlinePhone?: string | null;
  contactPeople?: unknown;
} | null;

function firstPerson(client: ClientRow): { name: string; phone: string } {
  const people = Array.isArray(client?.contactPeople) ? client.contactPeople : [];
  const first =
    people.find((person) => person && typeof person === "object") ?? null;
  const person = first as { name?: string | null; phone?: string | null } | null;
  const name =
    person?.name?.trim() ||
    `${client?.individualFirstName ?? ""} ${client?.individualLastName ?? ""}`.trim() ||
    client?.businessName?.trim() ||
    "";
  const phone =
    person?.phone?.trim() ||
    client?.mobilePhone?.trim() ||
    client?.phone?.trim() ||
    client?.landlinePhone?.trim() ||
    "";
  return { name, phone };
}

function productNamesFromTask(task: {
  offer_products?: unknown;
  sellProduct?: { name?: string | null } | { name?: string | null }[] | null;
}): { names: string[]; missingIds: number[] } {
  const names: string[] = [];
  const missingIds: number[] = [];
  if (Array.isArray(task.offer_products)) {
    for (const item of task.offer_products) {
      if (!item || typeof item !== "object") continue;
      const row = item as {
        productId?: number | null;
        productName?: string | null;
        description?: string | null;
      };
      const name = (row.productName || row.description || "").trim();
      if (name) {
        names.push(name);
      } else if (row.productId) {
        missingIds.push(Number(row.productId));
      }
    }
  }
  if (names.length === 0 && missingIds.length === 0) {
    const sellProduct = Array.isArray(task.sellProduct)
      ? task.sellProduct[0]
      : task.sellProduct;
    const fallback = sellProduct?.name?.trim();
    if (fallback) names.push(fallback);
  }
  return { names, missingIds };
}

export async function POST(req: NextRequest) {
  const userContext = await getUserContext();
  if (!userContext?.userId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const siteContext = await getSiteContext(req);
  if (!hasSiteId(siteContext)) {
    return NextResponse.json(
      { error: "Contesto sito non disponibile" },
      { status: 400 },
    );
  }

  const payload = await req.json().catch(() => null);
  const taskId = Number(payload?.taskId);
  if (!Number.isFinite(taskId) || taskId <= 0) {
    return NextResponse.json({ error: "taskId obbligatorio" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const selectWithContacts = `
      *,
      client:Client!clientId(
        businessName,
        individualFirstName,
        individualLastName,
        mobilePhone,
        landlinePhone,
        contactPeople
      ),
      sellProduct:SellProduct!sellProductId(name)
    `;
  const selectMinimal = `
      *,
      client:Client!clientId(
        businessName,
        individualFirstName,
        individualLastName,
        mobilePhone,
        landlinePhone
      ),
      sellProduct:SellProduct!sellProductId(name)
    `;

  let { data: task, error: taskError } = await supabase
    .from("Task")
    .select(selectWithContacts)
    .eq("id", taskId)
    .eq("site_id", siteContext.siteId)
    .maybeSingle();

  if (taskError) {
    ({ data: task, error: taskError } = await supabase
      .from("Task")
      .select(selectMinimal)
      .eq("id", taskId)
      .eq("site_id", siteContext.siteId)
      .maybeSingle());
  }

  if (taskError) {
    return NextResponse.json(
      { error: "Errore nel recupero del progetto", details: taskError.message },
      { status: 500 },
    );
  }

  if (!task) {
    return NextResponse.json({ error: "Progetto non trovato" }, { status: 404 });
  }

  const client = Array.isArray(task.client) ? task.client[0] : task.client;
  const contact = firstPerson(client);
  const uniqueCode = task.unique_code || `P${task.id}`;
  const projectName = task.name || task.title || uniqueCode;
  const comments = parseTypedComments({
    typed_comments: (task as { typed_comments?: unknown }).typed_comments,
    other: task.other,
  });

  let companyName = siteContext.siteData?.name || "FDM";
  let siteLogo = siteContext.siteData?.logo ?? null;
  if (!siteContext.siteData?.name || !siteLogo) {
    const { data: siteRow } = await supabase
      .from("sites")
      .select("name, logo")
      .eq("id", siteContext.siteId)
      .maybeSingle();
    companyName = siteRow?.name || companyName;
    siteLogo = siteRow?.logo ?? siteLogo;
  }

  const logoBuffer = await resolvePdfLogoBuffer({
    remoteUrl: siteLogo || siteContext.siteData?.image,
    subdomain:
      siteContext.siteData?.subdomain ||
      req.headers.get("x-site-domain") ||
      siteContext.domain,
    companyName,
  });

  const extractedProducts = productNamesFromTask(task);
  let products = extractedProducts.names;
  if (extractedProducts.missingIds.length > 0) {
    const { data: sellRows } = await supabase
      .from("SellProduct")
      .select("id, name")
      .eq("site_id", siteContext.siteId)
      .in("id", extractedProducts.missingIds);
    products = [
      ...products,
      ...(sellRows ?? [])
        .map((row) => row.name?.trim())
        .filter((name): name is string => Boolean(name)),
    ];
  }

  const pdfBytes = await buildProjectSummaryPdf({
    uniqueCode,
    projectName,
    companyName,
    products,
    productionDate: task.produzione_data_fine || task.produzione_data_inizio,
    installationDate:
      task.posa_data_fine || task.posa_data_inizio || task.deliveryDate,
    siteAddress: task.luogo || "",
    contactName: contact.name,
    contactPhone: contact.phone,
    productionComments: comments.produzione,
    installationComments: comments.posa,
    logoBytes: logoBuffer ? Uint8Array.from(logoBuffer) : null,
  });

  const filename = buildDocumentFilename({
    projectNumber: uniqueCode,
    documentType: "SchedaProgetto",
    clientName: projectName,
    generatedAt: new Date(),
    extension: "pdf",
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
