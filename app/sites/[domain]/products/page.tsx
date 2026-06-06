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
  fetchSiteVerticalProfile,
} from "@/lib/server-data";
import { PageLayout } from "@/components/page-layout";
import { ProductsPageClient } from "./products-page-client";

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

  const [
    verticalProfile,
    categoryCards,
    viewMode,
    categories,
    products,
    subcategoryImages,
  ] = await Promise.all([
    fetchSiteVerticalProfile(siteId),
    fetchSellProductCategoryCards(siteId),
    fetchSellProductCategoryViewMode(siteId),
    fetchSellProductCategories(siteId),
    fetchSellProducts(siteId),
    fetchSellProductSubcategoryImages(siteId),
  ]);

  return (
    <PageLayout>
      <ProductsPageClient
        pageTitle={verticalProfile.pageCopy.productsPageTitle}
        pageSubtitle={verticalProfile.pageCopy.productsPageSubtitle}
        categoryCards={categoryCards}
        categories={categories}
        products={products}
        domain={domain}
        siteId={siteId}
        initialViewMode={viewMode}
        subcategoryImages={subcategoryImages}
        isAdmin={isAdmin}
      />
    </PageLayout>
  );
}
