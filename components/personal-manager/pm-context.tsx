"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  resolveAreaPermissions,
  type AreaPermissions,
  type AreaSlug,
  type PermissionsMatrix,
} from "@/lib/personal-manager/types";

interface PmContextValue {
  /** Base URL delle schermate PM (es. "/personale"). */
  base: string;
  userId: string;
  areasVisible: AreaSlug[];
  permissions: PermissionsMatrix;
}

const PmContext = createContext<PmContextValue | null>(null);

export function PmProvider({
  value,
  children,
}: {
  value: PmContextValue;
  children: ReactNode;
}) {
  return <PmContext.Provider value={value}>{children}</PmContext.Provider>;
}

export function usePmContext(): PmContextValue {
  const ctx = useContext(PmContext);
  if (!ctx) {
    throw new Error("usePmContext deve essere usato dentro <PmProvider>");
  }
  return ctx;
}

export function useAreaVisible(slug: AreaSlug): boolean {
  const { areasVisible } = usePmContext();
  return areasVisible.includes(slug);
}

export function useAreaPermissions(slug: AreaSlug): AreaPermissions {
  const { areasVisible, permissions } = usePmContext();
  return resolveAreaPermissions({ areas_visible: areasVisible, permissions }, slug);
}
