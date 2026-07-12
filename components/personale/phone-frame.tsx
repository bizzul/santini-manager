import type { ReactNode } from "react";

/**
 * Frame "telefono" per le schermate mobile del Manager Personale su desktop.
 * Le schermate sono progettate per il pollice e per una colonna: non vanno
 * riadattate a layout desktop. Il frame e' una scelta, non un ripiego.
 *
 * Il transform sul wrapper esterno (non scrollabile) crea un containing
 * block: la bottom-bar `fixed` del MobileShell resta ancorata al frame,
 * non al viewport, mentre il contenuto scorre nel div interno.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full justify-center bg-page-soft md:px-4 md:py-8">
      <div className="relative h-[calc(100dvh-3rem)] w-full max-w-[420px] overflow-hidden bg-page [transform:translateZ(0)] md:h-[calc(100dvh-8rem)] md:rounded-[2rem] md:border md:border-border md:shadow-2xl">
        <div className="h-full overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
