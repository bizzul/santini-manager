import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext } from "@/lib/server-data";
import { canAccessModule, isAdminOrSuperadmin } from "@/lib/permissions";
import { fetchTreemapPageData } from "@/lib/treemap-data";
import { PageLayout, PageContent } from "@/components/page-layout";
import TreemapPageClient from "@/components/treemap/TreemapPageClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  try {
    const siteContext = await requireServerSiteContext(domain);
    return {
      title: `${siteContext.siteData?.name || "Site"} - Treemap`,
    };
  } catch {
    return { title: "Treemap" };
  }
}

export default async function TreemapPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const userContext = await getUserContext();
  if (!userContext?.user) return redirect("/login");

  const siteContext = await requireServerSiteContext(domain);

  if (!isAdminOrSuperadmin(userContext.role)) {
    const hasAccess = await canAccessModule(
      userContext.userId || userContext.user.id,
      siteContext.siteId,
      "treemap",
      userContext.role,
    );
    if (!hasAccess) {
      redirect(`/sites/${domain}`);
    }
  }

  const data = await fetchTreemapPageData(siteContext.siteId);

  return (
    <PageLayout>
      <PageContent>
        <TreemapPageClient data={data} domain={domain} />
      </PageContent>
    </PageLayout>
  );
}
