"use client";

import type { FactoryMachineIcon, FactoryMachineStatus } from "@/lib/factory/types";
import {
  Bot,
  Cpu,
  Droplets,
  Hammer,
  Package,
  ScanLine,
  ShieldCheck,
  Truck,
  type LucideIcon,
  Warehouse,
} from "lucide-react";

const machineIconMap: Record<FactoryMachineIcon, LucideIcon> = {
  laser: ScanLine,
  cnc: Cpu,
  assembly: Hammer,
  paint: Droplets,
  warehouse: Warehouse,
  quality: ShieldCheck,
  packaging: Package,
  logistics: Truck,
  robot: Bot,
};

export function getFactoryMachineIcon(icon: FactoryMachineIcon): LucideIcon {
  return machineIconMap[icon] || Cpu;
}

export function getFactoryMachineStatusLabel(status: FactoryMachineStatus): string {
  switch (status) {
    case "operativa":
      return "Operativa";
    case "setup":
      return "Setup";
    case "manutenzione":
      return "Manutenzione";
    case "standby":
      return "Stand-by";
    default:
      return "Operativa";
  }
}

export function getFactoryMachineStatusClasses(status: FactoryMachineStatus): string {
  switch (status) {
    case "operativa":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
    case "setup":
      return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300";
    case "manutenzione":
      return "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300";
    case "standby":
      return "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300";
    default:
      return "border-primary/20 bg-primary/10 text-primary";
  }
}

export function formatFactoryCurrency(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatFactoryDate(value: string | null): string {
  if (!value) {
    return "N/D";
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
