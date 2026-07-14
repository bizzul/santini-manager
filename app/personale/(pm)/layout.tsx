import type { ReactNode } from "react";
import { requirePersonalContext } from "@/lib/personal-manager/server-context";
import { PmProvider } from "@/components/personal-manager/pm-context";
import { MobileShell } from "@/components/personal-manager/MobileShell";
import { PmVoiceButton } from "@/components/personal-manager/PmVoiceButton";
import { PhoneFrame } from "@/components/personale/phone-frame";

export const dynamic = "force-dynamic";

/**
 * Le schermate del Manager Personale sono mobile-first: su desktop vengono
 * renderizzate dentro un frame ~420px centrato ("telefono"), mai riadattate.
 * Bottone vocale Voice-First: angolo basso-destra (non duplicare fuori).
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
        <div className="relative min-h-full">
          <MobileShell>{children}</MobileShell>
          <PmVoiceButton />
        </div>
      </PhoneFrame>
    </PmProvider>
  );
}
