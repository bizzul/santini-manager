import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext } from "@/lib/server-data";
import { getPmAccess } from "@/lib/personal-manager/queries";
import { PmProvider } from "@/components/personal-manager/pm-context";
import { MobileShell } from "@/components/personal-manager/MobileShell";
import { BetaGate } from "@/components/personal-manager/BetaGate";
import { AREA_SLUGS, type AreaSlug } from "@/lib/personal-manager/types";

export const dynamic = "force-dynamic";

export default async function PersonalManagerLayout({
  params,
  children,
}: {
  params: Promise<{ domain: string }>;
  children: ReactNode;
}) {
  const { domain } = await params;
  const userContext = await getUserContext();
  if (!userContext?.userId) {
    redirect("/login");
  }

  const { siteId } = await requireServerSiteContext(domain);
  const access = await getPmAccess(siteId, userContext.userId);

  // Gate Beta: senza abilitazione non si carica nessun dato personale.
  if (!access || !access.beta_app_enabled) {
    return (
      <div className="mx-auto min-h-full w-full max-w-[420px] bg-page">
        <BetaGate domain={domain} />
      </div>
    );
  }

  // Sanitizza le aree visibili contro la tassonomia nota.
  const areasVisible = (access.areas_visible ?? []).filter((slug): slug is AreaSlug =>
    AREA_SLUGS.includes(slug as AreaSlug),
  );

  return (
    <PmProvider
      value={{
        domain,
        siteId,
        userId: userContext.userId,
        areasVisible,
        permissions: access.permissions ?? {},
      }}
    >
      <MobileShell>{children}</MobileShell>
    </PmProvider>
  );
}
