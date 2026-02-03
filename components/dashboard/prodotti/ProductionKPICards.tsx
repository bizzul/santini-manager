"use client";

import { Factory, Calculator } from "lucide-react";
import { ProductsDashboardStats } from "@/lib/server-data";
import Link from "next/link";
import { useParams } from "next/navigation";

interface ProductionKPICardsProps {
  data: ProductsDashboardStats["production"];
}

function formatNumber(value: number): string {
  return value.toLocaleString("it-CH");
}

interface KPICardProps {
  title: string;
  value: string;
  unit?: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgClass: string;
  href?: string;
}

function KPICard({
  title,
  value,
  unit,
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
      <div className="flex items-baseline gap-1">
        <h3 className="text-2xl font-bold">{value}</h3>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export default function ProductionKPICards({ data }: ProductionKPICardsProps) {
  const params = useParams();
  const domain = params.domain as string;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Elementi prodotti nel periodo */}
      <KPICard
        title="Elementi prodotti nel periodo"
        value={formatNumber(data.totalElementsProduced)}
        unit="pz"
        subtitle="Totale pezzi/elementi prodotti"
        icon={<Factory className="w-5 h-5 text-blue-500" />}
        iconBgClass="bg-blue-500/20"
        href={`/sites/${domain}/projects?type=LAVORO`}
      />

      {/* Media elementi / settimana */}
      <KPICard
        title="Media elementi / settimana"
        value={formatNumber(data.avgElementsPerWeek)}
        unit="pz/sett"
        subtitle="Media settimanale produzione"
        icon={<Calculator className="w-5 h-5 text-green-500" />}
        iconBgClass="bg-green-500/20"
        href={`/sites/${domain}/projects?type=LAVORO`}
      />
    </div>
  );
}
