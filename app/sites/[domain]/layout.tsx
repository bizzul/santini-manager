import { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getSiteData } from "@/lib/fetchers";
import { Metadata } from "next";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { cookies } from "next/headers";
import { getUserContext, type UserContext } from "@/lib/auth-utils";
import { KanbanModalProvider } from "@/components/kanbans/KanbanModalContext";
import { GlobalKanbanModal } from "@/components/kanbans/GlobalKanbanModal";
import { createClient } from "@/utils/supabase/server";
import { QuickActionsProvider } from "@/components/quick-actions";
import { logger } from "@/lib/logger";
import { QueryHydration } from "@/components/QueryHydration";

/**
 * Check if user has access to a specific site
 * OPTIMIZED: Takes site data directly to avoid extra query
 * Only queries user_sites if organization check fails
 */
async function checkSiteAccess(
  siteId: string,
  siteOrganizationId: string | null,
  userContext: UserContext
): Promise<boolean> {
  // Superadmin can access all sites
  if (userContext.canAccessAllOrganizations) {
    return true;
  }

  // Check if user belongs to the site's organization (no query needed!)
  if (
    siteOrganizationId &&
    userContext.organizationIds?.includes(siteOrganizationId)
  ) {
    return true;
  }

  // Only query user_sites if organization check fails
  const supabase = await createClient();
  const { data: userSite, error: userSiteError } = await supabase
    .from("user_sites")
    .select("site_id")
    .eq("user_id", userContext.userId || userContext.user.id)
    .eq("site_id", siteId)
    .maybeSingle();

  if (userSiteError) {
    console.error("Error checking user_sites:", userSiteError);
    return false;
  }

  return !!userSite;
}

async function ImpersonationBanner({
  impersonatedUser,
  originalSuperadminId,
}: {
  impersonatedUser: any;
  originalSuperadminId: string;
}) {
  const handleLeave = async () => {
    await fetch("/api/auth/stop-impersonation", { method: "POST" });
    window.location.reload();
  };
  return (
    <div className="fixed top-0 left-0 w-full z-50 bg-yellow-200 text-yellow-900 flex items-center justify-center py-3 shadow-sm">
      <span className="font-semibold mr-4">
        You are impersonating: {impersonatedUser?.email || impersonatedUser?.id}
      </span>
      <button
        className="bg-red-600 text-white px-3 py-1 rounded-sm"
        onClick={handleLeave}
      >
        Leave impersonation
      </button>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata | null> {
  const { domain } = await params;
  const response = await getSiteData(domain);
  if (!response?.data) {
    return null;
  }
  const data = response.data;
  const { name: title, description, image, logo, subdomain } = data;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      creator: "@MatrisPro",
    },
    icons: [logo],
    metadataBase: new URL(`https://${domain}`),
  };
}

export default async function SiteLayout({
  params,
  children,
}: {
  params: Promise<{ domain: string }>;
  children: ReactNode;
}) {
  try {
    const { domain } = await params;
    const response = await getSiteData(domain);

    if (!response?.data) {
      logger.debug("Site data not found for domain:", domain);
      notFound();
    }

    const data = response.data;

    // Optional: Redirect to custom domain if it exists
    if (
      domain.endsWith(`.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`) &&
      data.custom_domain &&
      process.env.REDIRECT_TO_CUSTOM_DOMAIN_IF_EXISTS === "true"
    ) {
      return redirect(`https://${data.custom_domain}`);
    }

    // Add authentication check
    const userContext = await getUserContext();
    if (!userContext) {
      console.log("User context not found, redirecting to login");
      redirect("/login");
    }

    // Check if user has access to this site
    // OPTIMIZED: Pass organization_id directly to avoid extra query
    const hasAccess = await checkSiteAccess(
      data.id,
      data.organization_id,
      userContext
    );
    if (!hasAccess) {
      logger.debug(
        "User does not have access to site:",
        data.name,
        "Site org:",
        data.organization_id,
        "User orgs:",
        userContext.organizationIds
      );
      redirect("/sites/select?error=no_access");
    }

    const isImpersonating = userContext?.isImpersonating;
    const impersonatedUser = userContext?.impersonatedUser;
    const originalSuperadminId = userContext?.originalSuperadminId;

    const cookieStore = await cookies();
    const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

    return (
      <KanbanModalProvider>
        <QuickActionsProvider>
          <SidebarProvider defaultOpen={defaultOpen}>
            {/* Hydrate React Query cache with server-side data to avoid duplicate fetches */}
            <QueryHydration
              data={{
                userContext,
                siteData: {
                  name: data.name || domain,
                  image: data.image || null,
                  organization: { name: data.organization?.name || "" },
                },
                domain,
              }}
            />

            {isImpersonating && impersonatedUser && originalSuperadminId && (
              <ImpersonationBanner
                impersonatedUser={impersonatedUser}
                originalSuperadminId={originalSuperadminId}
              />
            )}

            <AppSidebar />
            <SidebarInset className="flex flex-col h-screen overflow-hidden">
              <header className="flex h-12 shrink-0 items-center border-b px-4">
                <SidebarTrigger className="-ml-1" />
              </header>
              <div className="flex-1 overflow-auto">{children}</div>
            </SidebarInset>

            {/* Global Kanban Modal */}
            <GlobalKanbanModal />
          </SidebarProvider>
        </QuickActionsProvider>
      </KanbanModalProvider>
    );
  } catch (error) {
    logger.error("Error in site layout:", error);
    // Redirect to login instead of throwing 500 error
    redirect("/login");
  }
}
