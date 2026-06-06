import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { isAdminOrSuperadmin } from "@/lib/permissions";
import {
  requireServerSiteContext,
  fetchSellProductCategoryCards,
  fetchSellProductCategoryViewMode,
  fetchSellProductCategories,
  fetchSellProducts,
  fetchSellProductSubcategoryImages,
} from "@/lib/server-data";
import { PageLayout } from "@/components/page-layout";
import { CategoriesPageClient } from "./categories-page-client";

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
  const isAdmin = isAdminOrSuperadmin(userContext.role);

  const [categoryCards, viewMode, categories, products, subcategoryImages] =
    await Promise.all([
      fetchSellProductCategoryCards(siteId),
      fetchSellProductCategoryViewMode(siteId),
      fetchSellProductCategories(siteId),
      fetchSellProducts(siteId),
      fetchSellProductSubcategoryImages(siteId),
    ]);

  return (
    <PageLayout>
      <CategoriesPageClient
        categoryCards={categoryCards}
        categories={categories}
        products={products}
        domain={domain}
        initialViewMode={viewMode}
        subcategoryImages={subcategoryImages}
        isAdmin={isAdmin}
      />
    </PageLayout>
  );
}
