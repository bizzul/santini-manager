import type { ReactNode } from "react";
import { requirePersonalContext } from "@/lib/personal-manager/server-context";
import { PmProvider } from "@/components/personal-manager/pm-context";
import { MobileShell } from "@/components/personal-manager/MobileShell";
import { PhoneFrame } from "@/components/personale/phone-frame";

export const dynamic = "force-dynamic";

/**
 * Le schermate del Manager Personale sono mobile-first: su desktop vengono
 * renderizzate dentro un frame ~420px centrato ("telefono"), mai riadattate.
 */
export default async function PersonalManagerScreensLayout({
  children,
}: {
  children: ReactNode;
}) {
  const ctx = await requirePersonalContext();

  return (
    <PmProvider
      value={{
        base: "/personale",
        userId: ctx.userId,
        areasVisible: ctx.areasVisible,
        permissions: ctx.permissions,
      }}
    >
      <PhoneFrame>
        <MobileShell>{children}</MobileShell>
      </PhoneFrame>
    </PmProvider>
  );
}
