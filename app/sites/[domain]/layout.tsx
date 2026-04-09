import { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
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
import { ManagerGuideButton, ManagerGuideProvider } from "@/components/manager-guide";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import {
  resolveSiteThemeSettings,
  SITE_THEME_SETTING_KEY,
} from "@/lib/site-theme";
import { SiteThemeStyle } from "@/components/site-theme-style";

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
    const supabase = await createClient();
    const { data: themeSetting } = await supabase
      .from("site_settings")
      .select("setting_value")
      .eq("site_id", data.id)
      .eq("setting_key", SITE_THEME_SETTING_KEY)
      .maybeSingle();
    const siteThemeSettings = resolveSiteThemeSettings(themeSetting?.setting_value);

    return (
      <KanbanModalProvider>
        <QuickActionsProvider>
          <SidebarProvider defaultOpen={defaultOpen}>
            <SiteThemeStyle themeSettings={siteThemeSettings} />
            {/* Hydrate React Query cache with server-side data to avoid duplicate fetches */}
            <QueryHydration
              data={{
                userContext,
                siteData: {
                  id: data.id,
                  name: data.name || domain,
                  image: data.image || null,
                  verticalProfile: data.verticalProfile || null,
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

            <ManagerGuideProvider
              userId={userContext.userId || userContext.user.id}
            >
              <AppSidebar />
              <SidebarInset className="flex h-screen flex-col overflow-hidden bg-[hsl(var(--page))]">
                <header className="flex h-12 shrink-0 items-center justify-between border-b bg-[hsl(var(--page)/0.96)] px-4 backdrop-blur supports-backdrop-filter:bg-[hsl(var(--page)/0.82)]">
                  <SidebarTrigger className="-ml-1" />
                  <ManagerGuideButton
                    label="Apri guida manager"
                    className="h-8 shrink-0"
                  />
                </header>
                <div className="flex-1 overflow-auto bg-[hsl(var(--page))]">{children}</div>
              </SidebarInset>

              {/* Global Kanban Modal */}
              <GlobalKanbanModal />
            </ManagerGuideProvider>
          </SidebarProvider>
        </QuickActionsProvider>
      </KanbanModalProvider>
    );
  } catch (error) {
    // Re-throw redirect/notFound errors so Next.js can handle them properly
    // notFound() throws an error with digest starting with "NEXT_NOT_FOUND"
    const isNotFoundError = error instanceof Error && 
      'digest' in error && 
      typeof error.digest === 'string' && 
      error.digest.startsWith('NEXT_NOT_FOUND');
    
    if (isRedirectError(error) || isNotFoundError) {
      throw error;
    }
    
    logger.error("Error in site layout:", error);
    // Log more details for debugging
    console.error("Site layout error details:", {
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorStack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.name : undefined,
    });
    // Redirect to select page with error instead of login
    // This way we know it's an error and not a session issue
    redirect("/sites/select?error=site_error");
  }
}
