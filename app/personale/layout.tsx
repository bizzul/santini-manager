import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUserContext } from "@/lib/auth-utils";
import { hasPersonalManagerCapability } from "@/lib/personal-manager/server-context";
import { PersonaleSidebar } from "@/components/personale/personale-sidebar";
import { ViewSwitcher } from "@/components/personale/view-switcher";
import { LAST_SPACE_COOKIE } from "@/lib/personale/vista";

export const dynamic = "force-dynamic";

/**
 * Area /personale: la vista della persona, non di uno spazio.
 * Gate sulla capability `personal_manager_abilitato`; il flag NON allarga
 * il perimetro dati (le viste aggregate passano dalle RLS spazio per spazio).
 */
export default async function PersonaleLayout({
  children,
}: {
  children: ReactNode;
}) {
  const userContext = await getUserContext();
  if (!userContext?.userId) {
    redirect("/login");
  }

  const enabled = await hasPersonalManagerCapability(userContext.userId);
  if (!enabled) {
    redirect("/sites/select");
  }

  const cookieStore = await cookies();
  const lastSpace = cookieStore.get(LAST_SPACE_COOKIE)?.value;
  const lastSpaceHref = lastSpace
    ? `/sites/${lastSpace}/dashboard`
    : "/sites/select";

  const displayName =
    [userContext.user?.user_metadata?.given_name]
      .filter(Boolean)
      .join(" ") ||
    userContext.user?.email ||
    "Personale";

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <PersonaleSidebar userName={displayName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card/60 px-4">
          <span className="text-sm font-semibold text-foreground">
            Manager Personale
          </span>
          <ViewSwitcher current="personale" lastSpaceHref={lastSpaceHref} />
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
