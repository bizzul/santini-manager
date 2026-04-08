import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Calendar, FileText, Folder, Layers3, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductDocuments } from "@/components/product/product-documents";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext } from "@/lib/server-data";
import { getSellProductDisplayCode } from "@/lib/sell-product-code";
import type { File as ManagedFile } from "@/types/supabase";
import { createClient } from "@/utils/server";
import { ProductImageCard } from "./product-image-card";

async function getProductSheetData(productId: number, siteId: string) {
  const supabase = await createClient();

  const [productResult, filesResult, tasksCountResult] = await Promise.all([
    supabase
      .from("SellProduct")
      .select("*, category:category_id(id, name, color)")
      .eq("id", productId)
      .eq("site_id", siteId)
      .single(),
    supabase
      .from("File")
      .select("*")
      .eq("sellProductId", productId)
      .order("id", { ascending: false }),
    supabase
      .from("Task")
      .select("id", { count: "exact", head: true })
      .eq("site_id", siteId)
      .eq("sellProductId", productId),
  ]);

  if (productResult.error || !productResult.data) {
    return null;
  }

  return {
    product: productResult.data,
    files: (filesResult.data || []) as ManagedFile[],
    linkedProjectsCount: tasksCountResult.count || 0,
  };
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("it-IT");
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ domain: string; id: string }>;
}) {
  const { domain, id } = await params;
  const productId = Number(id);

  if (!Number.isInteger(productId) || productId <= 0) {
    notFound();
  }

  const userContext = await getUserContext();
  if (!userContext?.user) {
    return redirect("/login");
  }

  const { siteId } = await requireServerSiteContext(domain);
  const data = await getProductSheetData(productId, siteId);

  if (!data) {
    notFound();
  }

  const { product, files, linkedProjectsCount } = data;
  const category = Array.isArray(product.category) ? product.category[0] : product.category;
  const categoryColor = category?.color || "#64748b";
  const code = getSellProductDisplayCode(product);
  const metricPanelClass =
    "rounded-xl border border-border/80 bg-card/95 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80";
  const subtlePanelClass =
    "rounded-xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-800/50";

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6">
          <Link
            href={`/sites/${domain}/products`}
            className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna ai prodotti
          </Link>
        </div>

        <div
          className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-md dark:border-slate-700 dark:bg-slate-900"
          style={{
            borderLeftWidth: "6px",
            borderLeftStyle: "solid",
            borderLeftColor: categoryColor,
          }}
        >
          <div className="space-y-6 p-5 lg:p-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_320px]">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4 dark:border-slate-700">
                  <Badge variant={product.active ? "default" : "secondary"} className="text-xs">
                    {product.active ? "Attivo" : "Disattivo"}
                  </Badge>
                  {product.price_list && (
                    <Badge variant="outline" className="text-xs">
                      In listino
                    </Badge>
                  )}
                  <span className="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                    #{code}
                  </span>
                  {category?.name && (
                    <div
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
                      style={{
                        backgroundColor: `${categoryColor}18`,
                        border: `1px solid ${categoryColor}55`,
                      }}
                    >
                      <Package className="h-4 w-4 shrink-0" style={{ color: categoryColor }} />
                      <span className="text-xs font-semibold" style={{ color: categoryColor }}>
                        {category.name}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Prodotto
                    </p>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      {product.name || "Prodotto senza nome"}
                    </h1>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Sottocategoria
                    </p>
                    <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                      {product.subcategory || product.type || "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Tipo
                    </p>
                    <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                      {product.tipo || product.product_type || "-"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className={metricPanelClass}>
                    <span className="block text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Categoria
                    </span>
                    <span className="mt-2 block text-base font-semibold text-slate-900 dark:text-slate-100">
                      {category?.name || "-"}
                    </span>
                  </div>
                  <div className={metricPanelClass}>
                    <span className="block text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Progetti collegati
                    </span>
                    <span className="mt-2 block text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {linkedProjectsCount}
                    </span>
                  </div>
                  <div className={metricPanelClass}>
                    <span className="block text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Documenti
                    </span>
                    <span className="mt-2 block text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {files.length}
                    </span>
                  </div>
                </div>

                <div className={subtlePanelClass}>
                  <div className="mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Descrizione
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                    {product.description || "Nessuna descrizione disponibile."}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <ProductImageCard
                  productId={product.id}
                  siteId={siteId}
                  domain={domain}
                  productName={product.name}
                  currentImageUrl={product.image_url}
                />

                <div className={subtlePanelClass}>
                  <div className="mb-3 flex items-center gap-2">
                    <Layers3 className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Dettagli
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Creato</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {formatDate(product.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Aggiornato</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {formatDate(product.updated_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Scheda tecnica</span>
                      {product.doc_url ? (
                        <a
                          href={product.doc_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline"
                        >
                          Apri
                        </a>
                      ) : (
                        <span className="font-medium text-slate-900 dark:text-slate-100">-</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className={subtlePanelClass}>
                  <div className="mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Stato rapido
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={product.active ? "default" : "secondary"}>
                      {product.active ? "Prodotto attivo" : "Prodotto non attivo"}
                    </Badge>
                    <Badge variant="outline">
                      {product.price_list ? "Visibile a listino" : "Fuori listino"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Folder className="h-5 w-5" />
              Documenti prodotto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProductDocuments productId={product.id} siteId={siteId} initialFiles={files} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
