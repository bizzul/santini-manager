import { notFound, redirect } from "next/navigation";
import { Calendar, FileText, Folder, Layers3, Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductDocuments } from "@/components/product/product-documents";
import { getUserContext } from "@/lib/auth-utils";
import { getServerT } from "@/lib/i18n/server";
import { requireServerSiteContext } from "@/lib/server-data";
import { getSellProductDisplayCode } from "@/lib/sell-product-code";
import type { File as ManagedFile } from "@/types/supabase";
import { createClient } from "@/utils/server";
import {
  DetailSheetLayout,
  DetailSheetSection,
} from "@/components/layout/detail-sheet-layout";
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
  const { t } = await getServerT(siteId);
  const data = await getProductSheetData(productId, siteId);

  if (!data) {
    notFound();
  }

  const { product, files, linkedProjectsCount } = data;
  const category = Array.isArray(product.category)
    ? product.category[0]
    : product.category;
  const categoryColor = category?.color || undefined;
  const code = getSellProductDisplayCode(product);

  const metaRow = (
    <>
      <Badge variant={product.active ? "default" : "secondary"} className="text-xs">
        {product.active ? "Attivo" : "Disattivo"}
      </Badge>
      {product.price_list && (
        <Badge variant="outline" className="text-xs">
          In listino
        </Badge>
      )}
      <span className="text-sm font-semibold tracking-wide text-muted-foreground">
        #{code}
      </span>
      {category?.name && categoryColor && (
        <div
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
          style={{
            backgroundColor: `${categoryColor}18`,
            border: `1px solid ${categoryColor}55`,
          }}
        >
          <Package
            className="h-4 w-4 shrink-0"
            style={{ color: categoryColor }}
          />
          <span
            className="text-xs font-semibold"
            style={{ color: categoryColor }}
          >
            {category.name}
          </span>
        </div>
      )}
    </>
  );

  return (
    <DetailSheetLayout
      backHref={`/sites/${domain}/products`}
      backLabel="Torna ai prodotti"
      title={product.name || "Prodotto senza nome"}
      subtitle={product.subcategory || product.type || "-"}
      meta={metaRow}
      accentColor={categoryColor}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_320px]">
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Tipo
              </p>
              <p className="text-lg font-semibold text-foreground">
                {product.tipo || product.product_type || "-"}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-card/95 p-4 shadow-sm">
              <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                Categoria
              </span>
              <span className="mt-2 block text-base font-semibold text-foreground">
                {category?.name || "-"}
              </span>
            </div>
            <div className="rounded-xl border bg-card/95 p-4 shadow-sm">
              <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                Progetti collegati
              </span>
              <span className="mt-2 block text-2xl font-bold text-foreground">
                {linkedProjectsCount}
              </span>
            </div>
            <div className="rounded-xl border bg-card/95 p-4 shadow-sm">
              <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                Documenti
              </span>
              <span className="mt-2 block text-2xl font-bold text-foreground">
                {files.length}
              </span>
            </div>
          </div>

          <DetailSheetSection
            title={
              <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <FileText className="h-4 w-4" />
                Descrizione
              </span>
            }
          >
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {product.description || "Nessuna descrizione disponibile."}
            </p>
          </DetailSheetSection>
        </div>

        <div className="space-y-4">
          <ProductImageCard
            productId={product.id}
            siteId={siteId}
            domain={domain}
            productName={product.name}
            currentImageUrl={product.image_url}
          />

          <DetailSheetSection
            title={
              <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Layers3 className="h-4 w-4" />
                Dettagli
              </span>
            }
          >
            <div className="space-y-3">
              {product.diameter_mm != null && (
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">
                    {t("products.diameterLabel")}
                  </span>
                  <span className="font-medium text-foreground">
                    {product.diameter_mm}
                  </span>
                </div>
              )}
              {product.length_mm != null && (
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">
                    {t("products.lengthLabel")}
                  </span>
                  <span className="font-medium text-foreground">
                    {product.length_mm}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Creato</span>
                <span className="font-medium text-foreground">
                  {formatDate(product.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Aggiornato</span>
                <span className="font-medium text-foreground">
                  {formatDate(product.updated_at)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Scheda tecnica</span>
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
                  <span className="font-medium text-foreground">-</span>
                )}
              </div>
            </div>
          </DetailSheetSection>

          <DetailSheetSection
            title={
              <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Stato rapido
              </span>
            }
          >
            <div className="flex flex-wrap gap-2">
              <Badge variant={product.active ? "default" : "secondary"}>
                {product.active ? "Prodotto attivo" : "Prodotto non attivo"}
              </Badge>
              <Badge variant="outline">
                {product.price_list ? "Visibile a listino" : "Fuori listino"}
              </Badge>
            </div>
          </DetailSheetSection>
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
          <ProductDocuments
            productId={product.id}
            siteId={siteId}
            initialFiles={files}
          />
        </CardContent>
      </Card>
    </DetailSheetLayout>
  );
}
