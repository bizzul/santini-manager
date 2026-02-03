"use client";

import { Box, Boxes, Package, AlertTriangle } from "lucide-react";
import { InventoryDashboardStats } from "@/lib/server-data";
import Link from "next/link";
import { useParams } from "next/navigation";

interface InventarioKPICardsProps {
  data: InventoryDashboardStats;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `CHF ${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `CHF ${(value / 1000).toFixed(0)}k`;
  }
  return `CHF ${value.toFixed(0)}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("it-CH");
}

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgClass: string;
  href?: string;
}

function KPICard({
  title,
  value,
  subtitle,
  icon,
  iconBgClass,
  href,
}: KPICardProps) {
  const content = (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-5 relative overflow-hidden hover:bg-white/15 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-lg ${iconBgClass} flex items-center justify-center`}
        >
          {icon}
        </div>
      </div>
      <p className="text-xs text-muted-foreground font-medium mb-2">{title}</p>
      <h3 className="text-2xl font-bold mb-1">{value}</h3>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export default function InventarioKPICards({ data }: InventarioKPICardsProps) {
  const params = useParams();
  const domain = params.domain as string;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Valore totale inventario */}
      <KPICard
        title="Valore totale inventario"
        value={formatCurrency(data.totalInventoryValue)}
        subtitle={`${formatNumber(data.activeItemsCount)} articoli attivi`}
        icon={<Box className="w-5 h-5 text-blue-500" />}
        iconBgClass="bg-blue-500/20"
        href={`/sites/${domain}/inventory`}
      />

      {/* Valore disponibile */}
      <KPICard
        title="Valore disponibile"
        value={formatCurrency(data.availableValue)}
        subtitle="Totale disponibile per uso"
        icon={<Boxes className="w-5 h-5 text-green-500" />}
        iconBgClass="bg-green-500/20"
        href={`/sites/${domain}/inventory`}
      />

      {/* Articoli attivi */}
      <KPICard
        title="Articoli attivi"
        value={formatNumber(data.activeItemsCount)}
        subtitle="Con giacenza > 0"
        icon={<Package className="w-5 h-5 text-purple-500" />}
        iconBgClass="bg-purple-500/20"
        href={`/sites/${domain}/inventory`}
      />

      {/* Sotto scorta minima */}
      <KPICard
        title="Sotto scorta minima"
        value={formatNumber(data.lowStockCount)}
        subtitle={
          data.lowStockCount > 0
            ? "Articoli da riordinare"
            : "Nessun articolo critico"
        }
        icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
        iconBgClass="bg-orange-500/20"
        href={`/sites/${domain}/inventory?filter=low_stock`}
      />
    </div>
  );
}
