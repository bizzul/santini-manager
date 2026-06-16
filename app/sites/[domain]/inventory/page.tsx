import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { isAdminOrSuperadmin } from "@/lib/permissions";
import {
  requireServerSiteContext,
  fetchInventoryCategoryCards,
  fetchInventoryCategoryViewMode,
  fetchInventoryData,
  fetchInventorySubcategoryImages,
  fetchSiteVerticalProfile,
} from "@/lib/server-data";
import { PageLayout } from "@/components/page-layout";
import { InventoryPageClient } from "./inventory-page-client";

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
    inventoryData,
    subcategoryImages,
  ] = await Promise.all([
    fetchSiteVerticalProfile(siteId),
    fetchInventoryCategoryCards(siteId),
    fetchInventoryCategoryViewMode(siteId),
    fetchInventoryData(siteId),
    fetchInventorySubcategoryImages(siteId),
  ]);

  return (
    <PageLayout>
      <InventoryPageClient
        pageTitle={verticalProfile.pageCopy.inventoryPageTitle}
        pageSubtitle={verticalProfile.pageCopy.inventoryPageSubtitle}
        categoryCards={categoryCards}
        categories={inventoryData.categories}
        inventory={inventoryData.inventory}
        suppliers={inventoryData.suppliers}
        domain={domain}
        siteId={siteId}
        initialViewMode={viewMode}
        subcategoryImages={subcategoryImages}
        isAdmin={isAdmin}
        inventoryData={inventoryData}
      />
    </PageLayout>
  );
}
