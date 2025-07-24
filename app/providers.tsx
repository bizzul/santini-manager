"use client";

import { ModalProvider } from "@/components/modal/provider";
import { Providers as ThemeProviders } from "../app/Theme/providers";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ModalProvider>
        <ThemeProviders>{children}</ThemeProviders>
      </ModalProvider>
    </>
  );
}
