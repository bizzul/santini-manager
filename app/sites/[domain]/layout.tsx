import { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getSiteData } from "@/lib/fetchers";
import { Metadata } from "next";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cookies } from "next/headers";
import { getUserContext } from "@/lib/auth-utils";

// Force dynamic rendering to prevent static/dynamic conflicts
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      creator: "@vercel",
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
      console.log("Site data not found for domain:", domain);
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

    const isImpersonating = userContext?.isImpersonating;
    const impersonatedUser = userContext?.impersonatedUser;
    const originalSuperadminId = userContext?.originalSuperadminId;

    const cookieStore = await cookies();
    const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

    return (
      <SidebarProvider defaultOpen={defaultOpen}>
        {isImpersonating && impersonatedUser && originalSuperadminId && (
          <ImpersonationBanner
            impersonatedUser={impersonatedUser}
            originalSuperadminId={originalSuperadminId}
          />
        )}

        <AppSidebar />
        <main className="w-full h-full">
          <SidebarTrigger />
          {children}
        </main>
      </SidebarProvider>
    );
  } catch (error) {
    console.error("Error in site layout:", error);
    // Redirect to login instead of throwing 500 error
    redirect("/login");
  }
}
