import React from "react";
import { createClient } from "@/utils/server";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";
import { requireServerSiteContext, fetchProjectFiles } from "@/lib/server-data";
import { ProjectDocuments } from "@/components/project/project-documents";
import { ProjectConsuntivoSummary } from "@/components/project/ProjectConsuntivoSummary";
import { ProjectStatusPanel } from "@/components/project/ProjectStatusPanel";
import { ProjectReportDownloadButton } from "@/components/project/ProjectReportDownloadButton";
import { buildCollaboratorTimeSummaries } from "@/lib/project-consuntivo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  PackageCheck,
  Package,
  Folder,
  MapPin,
  Phone,
  StickyNote,
  Truck,
  Link2,
  SquarePen,
  FileText,
} from "lucide-react";
import Link from "next/link";

function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("it-CH", {
    style: "currency",
    currency: "CHF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatCompactCurrency(value?: number | null): string {
  const safeValue = Number(value || 0);
  if (!safeValue) return "-";
  if (safeValue >= 1000) {
    return `${(safeValue / 1000).toFixed(1)}K CHF`;
  }
  return formatCurrency(safeValue);
}

function isImageFilename(name?: string | null): boolean {
  if (!name) return false;
  return /\.(png|jpe?g|webp|gif|svg)$/i.test(name);
}

function getControlStatusMeta(status?: string | null): {
  label: string;
  className: string;
} {
  switch (status) {
    case "DONE":
      return {
        label: "Completato",
        className:
          "bg-green-50 text-green-800 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800",
      };
    case "PARTIALLY_DONE":
      return {
        label: "Parziale",
        className:
          "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
      };
    default:
      return {
        label: "Da iniziare",
        className:
          "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
      };
  }
}

function getBorderColor(data: any): string {
  if (data.is_draft || data.isDraft) return "#f59e0b";
  const displayMode = data.display_mode || data.displayMode || "normal";
  if (displayMode === "small_green") return "#22c55e";
  if (displayMode === "small_red") return "#ef4444";

  if (data.deliveryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const delivery = new Date(data.deliveryDate);
    delivery.setHours(0, 0, 0, 0);
    if (
      today > delivery &&
      data.column?.identifier !== "SPEDITO"
    ) {
      return "#ef4444";
    }
  }

  const showCategoryColors =
    data.kanban?.show_category_colors || data.kanban?.showCategoryColors;
  const category = Array.isArray(data.sellProduct?.category)
    ? data.sellProduct.category[0]
    : data.sellProduct?.category;
  if (showCategoryColors && category?.color) {
    return category.color;
  }

  return "#64748b";
}

async function getData(id: number, siteId: string): Promise<any> {
  const supabase = await createClient();
  const { data: task, error: taskError } = await supabase
    .from("Task")
    .select(
      `
      *,
      sellProduct:SellProduct!sellProductId(id, name, type, category_id, category:sellproduct_categories(id, name, color)),
      client:Client!clientId(id, businessName, individualFirstName, individualLastName, address, city, zipCode),
      column:KanbanColumn!kanbanColumnId(id, title, identifier, position),
      kanban:Kanban!kanbanId(id, title, show_category_colors)
    `
    )
    .eq("id", id)
    .eq("site_id", siteId)
    .single();

  if (taskError) {
    logger.error("Error fetching task:", taskError);
    throw new Error("Failed to fetch task");
  }

  let clientFull = null;
  if (task.clientId) {
    const { data: cd } = await supabase
      .from("Client")
      .select("*")
      .eq("id", task.clientId)
      .single();
    clientFull = cd;
  }

  const [
    { data: suppliers },
    { data: timeEntries },
    { data: errorEntries },
    { data: qualityControls },
    { data: packingControls },
  ] = await Promise.all([
    supabase
      .from("TaskSupplier")
      .select(
        `
        id, supplierId, deliveryDate, notes,
        supplier:Supplier(id, name, short_name)
      `
      )
      .eq("taskId", id),
    supabase
      .from("Timetracking")
      .select(
        `
        id,
        employee_id,
        hours,
        minutes,
        totalTime,
        created_at,
        description,
        user:employee_id(id, given_name, family_name, picture, initials, color)
      `
      )
      .eq("site_id", siteId)
      .eq("task_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("Errortracking")
      .select(
        `
        id,
        material_cost,
        time_spent_hours,
        transfer_km,
        created_at
      `
      )
      .eq("task_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("QualityControl")
      .select(
        `
        id,
        passed,
        positionNr,
        position_nr,
        created_at
      `
      )
      .eq("site_id", siteId)
      .eq("taskId", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("PackingControl")
      .select(
        `
        id,
        passed,
        created_at
      `
      )
      .eq("site_id", siteId)
      .eq("taskId", id)
      .order("created_at", { ascending: false }),
  ]);

  return {
    ...task,
    clientFull,
    taskSuppliers: suppliers || [],
    timeEntries: timeEntries || [],
    errorEntries: errorEntries || [],
    qualityControls: qualityControls || [],
    packingControls: packingControls || [],
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: number; domain: string }>;
}) {
  const { id, domain } = await params;

  const session = await getUserContext();
  if (!session || !session.user || !session.user.id) {
    return redirect("/login");
  }

  if (session.role !== "admin" && session.role !== "superadmin") {
    return redirect(`/sites/${domain}/projects?edit=${id}`);
  }

  const siteContext = await requireServerSiteContext(domain);
  const { siteId } = siteContext;

  const [data, files] = await Promise.all([
    getData(id, siteId),
    fetchProjectFiles(id, siteId),
  ]);

  const borderColor = getBorderColor(data);
  const deliveryDate = data.deliveryDate ? new Date(data.deliveryDate) : null;
  const isValidDelivery = deliveryDate && !isNaN(deliveryDate.getTime());
  const weekNumber = isValidDelivery ? getWeekNumber(deliveryDate) : null;
  const update = new Date(data.updated_at);
  const created = new Date(data.created_at);
  const percentStatus = data.percentStatus || data.percent_status || 0;

  const clientName =
    data.client?.businessName ||
    `${data.client?.individualLastName || ""} ${data.client?.individualFirstName || ""}`.trim() ||
    "-";
  const cf = data.clientFull;
  const contactPhone =
    cf?.mobilePhone || cf?.phone || cf?.landlinePhone || null;
  const clientAddress = data.client?.address
    ? `${data.client.address}${data.client.city ? `, ${data.client.city}` : ""}${data.client.zipCode ? ` ${data.client.zipCode}` : ""}`
    : null;

  const showCategoryColors =
    data.kanban?.show_category_colors || data.kanban?.showCategoryColors;
  const rawCategory = data.sellProduct?.category;
  const category = Array.isArray(rawCategory) ? rawCategory[0] : rawCategory;
  const categoryColor = category?.color;
  const categoryName = category?.name;
  const productName = data.sellProduct?.name;
  const productType = data.sellProduct?.type;

  const piecesDisplay = (() => {
    if (data.numero_pezzi && data.numero_pezzi > 0)
      return `${data.numero_pezzi} pz`;
    if (data.positions && Array.isArray(data.positions)) {
      const filled = data.positions.filter(
        (p: string) => p && p.trim() !== ""
      ).length;
      if (filled > 0) return `${filled} pos.`;
    }
    return "-";
  })();
  const projectImageUrl =
    (files || []).find((file: any) => isImageFilename(file?.name))?.url || null;
  const projectProductLabels = (() => {
    const labels = new Set<string>();
    const offerProducts = Array.isArray(data.offer_products) ? data.offer_products : [];
    offerProducts.forEach((line: any) => {
      const row = line && typeof line === "object" ? line : null;
      if (!row) return;
      const resolvedName =
        row.productName ||
        row.product_name ||
        row.name ||
        row.sellProductName ||
        row?.product?.name ||
        row?.sellProduct?.name ||
        null;
      const resolvedType =
        row.productType ||
        row.product_type ||
        row.type ||
        row?.product?.type ||
        row?.sellProduct?.type ||
        null;
      const label = [resolvedName, resolvedType].filter(Boolean).join(" ").trim();
      if (label) labels.add(label);
    });
    if (labels.size === 0 && productName) {
      labels.add([productName, productType].filter(Boolean).join(" ").trim());
    }
    return Array.from(labels);
  })();

  const taskSuppliers = data.taskSuppliers || [];
  const timeEntries = data.timeEntries || [];
  const errorEntries = data.errorEntries || [];
  const qualityControls = data.qualityControls || [];
  const packingControls = data.packingControls || [];

  const collaboratorTotals = buildCollaboratorTimeSummaries(timeEntries);
  const latestTimeEntry = timeEntries[0]?.created_at
    ? new Date(timeEntries[0].created_at)
    : null;

  const materialCostTotal = errorEntries.reduce(
    (sum: number, entry: any) => sum + Number(entry.material_cost || 0),
    0
  );
  const projectValue = Number(data.sellPrice || 0);

  const requestedWorks = (() => {
    const positionsCount = Array.isArray(data.positions)
      ? data.positions.filter((position: string) => position && position.trim() !== "").length
      : 0;

    if (positionsCount > 0) return positionsCount;
    if (Number(data.numero_pezzi || 0) > 0) return Number(data.numero_pezzi);
    return qualityControls.length;
  })();

  const completedWorks = qualityControls.filter(
    (control: any) => control.passed === "DONE"
  ).length;
  const partialWorks = qualityControls.filter(
    (control: any) => control.passed === "PARTIALLY_DONE"
  ).length;
  const pendingWorks = Math.max(requestedWorks - completedWorks - partialWorks, 0);

  const packingStatus = packingControls[0]?.passed || null;
  const packingStatusMeta = getControlStatusMeta(packingStatus);
  const hasCollaboratorData = collaboratorTotals.length > 0;
  const hasSupplierData = taskSuppliers.length > 0;
  const hasMaterialData =
    materialCostTotal > 0 || Number(data.consuntivo_material_cost || 0) > 0;
  const hasDocumentsData = files.length > 0;
  const canBuildExtendedReport =
    hasCollaboratorData && hasSupplierData && hasMaterialData && hasDocumentsData;
  const metricPanelClass =
    "rounded-xl border border-border/80 bg-card/95 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80";
  const subtlePanelClass =
    "rounded-xl border border-border bg-background/90 p-4 dark:border-slate-700 dark:bg-slate-800/50";
  const showInfoSections =
    Boolean(contactPhone || clientAddress) || Boolean(data.other) || taskSuppliers.length > 0;

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container max-w-6xl mx-auto py-6 px-4">
        {/* Back link */}
        <div className="mb-6">
          <Link
            href={`/sites/${domain}/projects`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna ai progetti
          </Link>
        </div>

        {/* Main project card – kanban style */}
        <div
          className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-md dark:border-slate-700 dark:bg-slate-900"
          style={{
            borderLeftWidth: "6px",
            borderLeftStyle: "solid",
            borderLeftColor: borderColor,
          }}
        >
          <div className="absolute left-0 right-0 top-0 h-1 bg-slate-200/80 dark:bg-slate-700/80">
            <div
              style={{ width: `${percentStatus}%` }}
              className="h-full bg-green-500 transition-all duration-300"
            />
          </div>
          <div className="absolute right-4 top-1.5 z-10 text-xs font-semibold text-slate-200">
            {percentStatus}%
          </div>
          <div className="p-5 lg:p-6 space-y-5">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_320px]">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4 dark:border-slate-700">
                  <Badge
                    variant={data.archived ? "secondary" : "default"}
                    className="text-xs"
                  >
                    {data.archived ? "Archiviato" : "Attivo"}
                  </Badge>
                  <span className="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                    #{data.unique_code}
                  </span>
                  {showCategoryColors && (categoryName || productName) && (
                    <div
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
                      style={{
                        backgroundColor: categoryColor ? `${categoryColor}18` : "#F3F4F6",
                        border: `1px solid ${categoryColor ? `${categoryColor}55` : "#CBD5E1"}`,
                      }}
                    >
                      <Package
                        className="h-4 w-4 shrink-0"
                        style={{ color: categoryColor || "#6B7280" }}
                      />
                      <span
                        className="text-xs font-semibold"
                        style={{ color: categoryColor || "#374151" }}
                      >
                        {categoryName || productName || "Prodotto"}
                      </span>
                      {categoryName && productName && categoryName !== productName && (
                        <span
                          className="text-[11px] opacity-80"
                          style={{ color: categoryColor || "#374151" }}
                        >
                          {productName} {productType || ""}
                        </span>
                      )}
                    </div>
                  )}
                  {!showCategoryColors && productName && (
                    <Badge variant="outline" className="text-xs">
                      {productName} {productType || ""}
                    </Badge>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className={`${metricPanelClass} sm:col-span-2`}>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Dati progetto
                    </p>
                    <div className="mt-2 space-y-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Cliente
                        </p>
                        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {clientName}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Commessa / oggetto
                        </p>
                        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {data.name || data.title || "-"}
                        </p>
                      </div>
                      {data.luogo && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span>{data.luogo}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/80 bg-card/95 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                    <div className="h-[148px] overflow-hidden rounded-lg border border-border/70 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
                      {projectImageUrl ? (
                        <img
                          src={projectImageUrl}
                          alt={`Progetto ${data.unique_code || id}`}
                          className="h-full w-full object-cover object-center"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs text-slate-500 dark:text-slate-400">
                          Nessuna immagine progetto caricata
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className={metricPanelClass}>
                    <span className="block text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Pezzi
                    </span>
                    <span className="mt-2 block text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {piecesDisplay}
                    </span>
                    {projectProductLabels.length > 0 && (
                      <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {projectProductLabels.slice(0, 3).join(" · ")}
                        {projectProductLabels.length > 3
                          ? ` +${projectProductLabels.length - 3}`
                          : ""}
                      </p>
                    )}
                  </div>
                  <div className={metricPanelClass}>
                    <span className="block text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Valore
                    </span>
                    <span className="mt-2 block text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {formatCompactCurrency(data.sellPrice)}
                    </span>
                  </div>
                  <div className={metricPanelClass}>
                    <span className="block text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Fase
                    </span>
                    <span className="mt-2 block text-base font-semibold text-slate-900 dark:text-slate-100">
                      {data.column?.title || "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="xl:pt-[104px]">
                <ProjectStatusPanel
                  taskId={id}
                  domain={domain}
                  deliveryDateValue={isValidDelivery ? deliveryDate.toISOString() : null}
                  weekNumber={weekNumber}
                  createdAtLabel={created.toLocaleDateString("it-IT")}
                  updatedAtLabel={update.toLocaleDateString("it-IT")}
                  hasMaterial={Boolean(data.material)}
                  kanbanTitle={data.kanban?.title || null}
                />
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,0.95fr)_minmax(0,0.85fr)]">
              <ProjectConsuntivoSummary
                domain={domain}
                taskId={id}
                projectValue={projectValue}
                registeredMaterialCost={materialCostTotal}
                initialManualMaterialCost={data.consuntivo_material_cost}
                initialDefaultHourlyRate={data.consuntivo_default_hourly_rate}
                initialCollaboratorRates={data.consuntivo_collaborator_rates}
                collaborators={collaboratorTotals}
                timeEntriesCount={timeEntries.length}
                latestTimeEntryLabel={
                  latestTimeEntry
                    ? latestTimeEntry.toLocaleDateString("it-IT")
                    : null
                }
              />

              <div className="rounded-2xl border border-border bg-background/90 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Riassunto opere
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-border/80 bg-card/95 px-3 py-3 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Richieste
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {requestedWorks}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-card/95 px-3 py-3 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Effettuate
                    </p>
                    <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
                      {completedWorks}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-card/95 px-3 py-3 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Mancanti
                    </p>
                    <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {pendingWorks + partialWorks}
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between rounded-lg border border-border/80 bg-card/95 px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      QC completati
                    </span>
                    <span className="font-semibold">{completedWorks}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/80 bg-card/95 px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <CircleDashed className="h-4 w-4 text-amber-500" />
                      QC parziali / da fare
                    </span>
                    <span className="font-semibold">
                      {partialWorks} / {Math.max(requestedWorks - completedWorks - partialWorks, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/80 bg-card/95 px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <PackageCheck className="h-4 w-4 text-slate-400" />
                      Imballaggio
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${packingStatusMeta.className}`}
                    >
                      {packingStatusMeta.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background/90 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Report progetto
                    </span>
                  </div>
                  <ProjectReportDownloadButton domain={domain} taskId={id} />
                </div>

                {!canBuildExtendedReport ? (
                  <div className="space-y-2 rounded-lg border border-dashed border-slate-300 p-3 text-sm dark:border-slate-700">
                    <p className="text-slate-600 dark:text-slate-300">
                      Alcuni dati necessari non sono ancora presenti per un report progetto completo
                      (offerta, immagini, costi e performance reparti/collaboratori).
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/sites/${domain}/projects?edit=${id}`}>
                          <Link2 className="mr-2 h-4 w-4" />
                          Collega dato
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/sites/${domain}/projects?edit=${id}`}>
                          <SquarePen className="mr-2 h-4 w-4" />
                          Inserisci manualmente
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Dati completi disponibili: puoi scaricare il report progetto con sintesi
                    economica e consuntivo.
                  </p>
                )}
              </div>
            </div>

            {showInfoSections && (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <div className="space-y-4">
                  {!hasCollaboratorData && (
                    <div className={subtlePanelClass}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Ore collaboratori mancanti
                        </span>
                        <div className="flex gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/sites/${domain}/projects?edit=${id}`}>
                              <Link2 className="mr-2 h-4 w-4" />
                              Collega dato
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/sites/${domain}/timetracking/create?taskId=${id}`}>
                              <SquarePen className="mr-2 h-4 w-4" />
                              Inserisci manualmente
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!hasMaterialData && (
                    <div className={subtlePanelClass}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Costi materiale mancanti
                        </span>
                        <div className="flex gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/sites/${domain}/projects?edit=${id}`}>
                              <Link2 className="mr-2 h-4 w-4" />
                              Collega dato
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/sites/${domain}/projects?edit=${id}`}>
                              <SquarePen className="mr-2 h-4 w-4" />
                              Inserisci manualmente
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {(contactPhone || clientAddress) && (
                    <div className={subtlePanelClass}>
                      <div className="flex items-center gap-2 mb-3">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Contatti e indirizzo
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {contactPhone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-slate-400" />
                            <a
                              href={`tel:${contactPhone}`}
                              className="text-primary hover:underline"
                            >
                              {contactPhone}
                            </a>
                          </div>
                        )}
                        {clientAddress && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clientAddress)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {clientAddress}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {data.other && (
                    <div className={subtlePanelClass}>
                      <div className="flex items-center gap-2 mb-2">
                        <StickyNote className="h-4 w-4 text-slate-400" />
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Note operative
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                        {data.other}
                      </p>
                    </div>
                  )}
                </div>

                {taskSuppliers.length > 0 ? (
                  <div className={subtlePanelClass}>
                    <div className="flex items-center gap-2 mb-3">
                      <Truck className="h-4 w-4 text-slate-400" />
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Fornitori collegati
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {taskSuppliers.map((ts: any) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const supDelivery = ts.deliveryDate ? new Date(ts.deliveryDate) : null;
                        if (supDelivery) supDelivery.setHours(0, 0, 0, 0);
                        const isToday =
                          supDelivery && supDelivery.getTime() === today.getTime();
                        const isLate = supDelivery && supDelivery < today && !isToday;
                        const supplierObj = Array.isArray(ts.supplier)
                          ? ts.supplier[0]
                          : ts.supplier;

                        return (
                          <div
                            key={ts.id}
                            className={`rounded-lg border px-3 py-2 text-sm ${
                              isToday
                                ? "bg-green-50 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800"
                                : isLate
                                  ? "bg-red-50 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800"
                                  : "bg-white/90 text-slate-700 border-slate-200 dark:bg-slate-900/70 dark:text-slate-300 dark:border-slate-700"
                            }`}
                          >
                            <span className="font-medium">
                              {supplierObj?.short_name || supplierObj?.name || "?"}
                            </span>
                            {supDelivery && (
                              <span className="ml-1.5 opacity-75" suppressHydrationWarning>
                                {supDelivery.toLocaleDateString("it-IT", {
                                  day: "2-digit",
                                  month: "2-digit",
                                })}
                              </span>
                            )}
                            {ts.notes && (
                              <span className="ml-1.5 text-xs opacity-60">
                                · {ts.notes}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className={subtlePanelClass}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Fornitori non collegati
                      </span>
                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/sites/${domain}/projects?edit=${id}`}>
                            <Link2 className="mr-2 h-4 w-4" />
                            Collega dato
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/sites/${domain}/projects?edit=${id}`}>
                            <SquarePen className="mr-2 h-4 w-4" />
                            Inserisci manualmente
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Documents */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Documenti di Progetto
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasDocumentsData && (
              <div className="mb-4 rounded-lg border border-dashed border-slate-300 p-3 text-sm dark:border-slate-700">
                <p className="mb-2 text-slate-600 dark:text-slate-300">
                  Nessun documento collegato al progetto.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/sites/${domain}/projects?edit=${id}`}>
                      <Link2 className="mr-2 h-4 w-4" />
                      Collega dato
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/sites/${domain}/projects?edit=${id}`}>
                      <SquarePen className="mr-2 h-4 w-4" />
                      Inserisci manualmente
                    </Link>
                  </Button>
                </div>
              </div>
            )}
            <ProjectDocuments
              projectId={id}
              siteId={siteId}
              initialFiles={files}
            />
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
