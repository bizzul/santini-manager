import React from "react";
import { createClient } from "@/utils/server";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";
import { requireServerSiteContext, fetchProjectFiles } from "@/lib/server-data";
import { ProjectDocuments } from "@/components/project/project-documents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  Package,
  Folder,
  MapPin,
  Phone,
  StickyNote,
  Truck,
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

  // Fetch full client data separately (column names may vary)
  let clientFull = null;
  if (task.clientId) {
    const { data: cd } = await supabase
      .from("Client")
      .select("*")
      .eq("id", task.clientId)
      .single();
    clientFull = cd;
  }

  const { data: suppliers } = await supabase
    .from("TaskSupplier")
    .select(
      `
      id, supplierId, deliveryDate, notes,
      supplier:Supplier(id, name, short_name)
    `
    )
    .eq("taskId", id);

  return { ...task, clientFull, taskSuppliers: suppliers || [] };
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

  const siteContext = await requireServerSiteContext(domain);
  const { siteId } = siteContext;

  const [data, files] = await Promise.all([
    getData(id, siteId),
    fetchProjectFiles(id, siteId),
  ]);

  const borderColor = getBorderColor(data);
  const isDraft = data.is_draft || data.isDraft;
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

  const taskSuppliers = data.taskSuppliers || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto py-6 px-4">
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
          className="relative rounded-r-xl rounded-l-sm bg-white dark:bg-slate-900 border-y border-r border-slate-200 dark:border-slate-700 shadow-md overflow-hidden"
          style={{
            borderLeftWidth: "5px",
            borderLeftStyle: "solid",
            borderLeftColor: borderColor,
          }}
        >
          {isDraft && (
            <div className="absolute top-3 right-3 z-10">
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
                Bozza
              </Badge>
            </div>
          )}

          <div className="p-5 space-y-4">
            {/* Header: Code + Status | Date + Week */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-3">
                <span className="font-bold text-xl">
                  #{data.unique_code}
                </span>
                <Badge
                  variant={data.archived ? "secondary" : "default"}
                  className="text-xs"
                >
                  {data.archived ? "Archiviato" : "Attivo"}
                </Badge>
              </div>
              {isValidDelivery && (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Calendar className="h-4 w-4" />
                  <span suppressHydrationWarning>
                    {deliveryDate.toLocaleDateString("it-IT")}
                  </span>
                  <span className="font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">
                    S.{weekNumber}
                  </span>
                </div>
              )}
            </div>

            {/* Category badge (when category colors enabled) */}
            {showCategoryColors && (categoryName || productName) && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-md w-fit"
                style={{
                  backgroundColor: categoryColor
                    ? `${categoryColor}20`
                    : "#F3F4F6",
                  borderLeft: `3px solid ${categoryColor || "#6B7280"}`,
                }}
              >
                <Package
                  className="h-4 w-4 shrink-0"
                  style={{ color: categoryColor || "#6B7280" }}
                />
                <span
                  className="font-semibold text-sm"
                  style={{ color: categoryColor || "#374151" }}
                >
                  {categoryName || productName || "Prodotto"}
                </span>
                {categoryName &&
                  productName &&
                  categoryName !== productName && (
                    <span
                      className="text-xs opacity-75"
                      style={{ color: categoryColor || "#374151" }}
                    >
                      · {productName} {productType || ""}
                    </span>
                  )}
              </div>
            )}

            {/* Product badge (when category colors disabled) */}
            {!showCategoryColors && productName && (
              <Badge variant="outline" className="text-sm">
                {productName} {productType || ""}
              </Badge>
            )}

            {/* Client name */}
            <div className="font-semibold text-2xl text-slate-800 dark:text-slate-100">
              {clientName}
            </div>

            {/* Location · Object name */}
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              {data.luogo && (
                <>
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{data.luogo}</span>
                  <span className="mx-1">·</span>
                </>
              )}
              <span>{data.name || data.title || "-"}</span>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-px bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 text-center">
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">
                  Pezzi
                </span>
                <span className="font-bold text-lg">{piecesDisplay}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 text-center">
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">
                  Valore
                </span>
                <span className="font-bold text-lg">
                  {data.sellPrice
                    ? `${(data.sellPrice / 1000).toFixed(1)}K CHF`
                    : "-"}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 text-center">
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">
                  Fase
                </span>
                <span className="font-bold text-sm">
                  {data.column?.title || "-"}
                </span>
              </div>
            </div>

            {/* Contact info */}
            {(contactPhone || clientAddress) && (
              <div className="flex flex-wrap gap-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
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
            )}

            {/* Notes */}
            {data.other && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <StickyNote className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Note
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                  {data.other}
                </p>
              </div>
            )}

            {/* Suppliers */}
            {taskSuppliers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Fornitori
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {taskSuppliers.map((ts: any) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const supDelivery = ts.deliveryDate
                      ? new Date(ts.deliveryDate)
                      : null;
                    if (supDelivery) supDelivery.setHours(0, 0, 0, 0);
                    const isToday =
                      supDelivery &&
                      supDelivery.getTime() === today.getTime();
                    const isLate =
                      supDelivery &&
                      supDelivery < today &&
                      !isToday;
                    const supplierObj = Array.isArray(ts.supplier)
                      ? ts.supplier[0]
                      : ts.supplier;

                    return (
                      <div
                        key={ts.id}
                        className={`text-sm px-2.5 py-1 rounded-md border ${
                          isToday
                            ? "bg-green-50 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800"
                            : isLate
                              ? "bg-red-50 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800"
                              : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        }`}
                      >
                        <span className="font-medium">
                          {supplierObj?.short_name ||
                            supplierObj?.name ||
                            "?"}
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
            )}

            {/* Progress bar */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Avanzamento
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {percentStatus}%
                </span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  style={{ width: `${percentStatus}%` }}
                  className="h-full bg-green-500 rounded-full transition-all duration-300"
                />
              </div>
            </div>
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
            <ProjectDocuments
              projectId={id}
              siteId={siteId}
              initialFiles={files}
            />
          </CardContent>
        </Card>

        {/* Dates & metadata */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-card border rounded-lg p-3 text-center">
            <span className="text-xs text-muted-foreground block mb-0.5">
              Creazione
            </span>
            <span className="text-sm font-medium" suppressHydrationWarning>
              {created.toLocaleDateString("it-IT")}
            </span>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <span className="text-xs text-muted-foreground block mb-0.5">
              Aggiornamento
            </span>
            <span className="text-sm font-medium" suppressHydrationWarning>
              {update.toLocaleDateString("it-IT")}
            </span>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <span className="text-xs text-muted-foreground block mb-0.5">
              Materiale
            </span>
            <span className="text-sm font-medium">
              {data.material ? "Sì" : "No"}
            </span>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <span className="text-xs text-muted-foreground block mb-0.5">
              Kanban
            </span>
            <span className="text-sm font-medium">
              {data.kanban?.title || "-"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
