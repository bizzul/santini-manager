"use client";

import { TrendingUp, AlertCircle } from "lucide-react";
import { VenditaDashboardStats } from "@/lib/server-data";

interface VenditaKPICardsProps {
  data: VenditaDashboardStats["kpis"];
}

interface KPICardProps {
  title: string;
  value: string;
  change: number;
  changeUnit?: string;
  icon: React.ReactNode;
  iconBgClass: string;
  invertChangeColor?: boolean;
}

function KPICard({
  title,
  value,
  change,
  changeUnit = "%",
  icon,
  iconBgClass,
  invertChangeColor = false,
}: KPICardProps) {
  const isPositive = change > 0;
  // For most KPIs, positive = green. But for "Offerte Scadute", more = bad (red)
  let changeColor: string;
  if (invertChangeColor) {
    changeColor = isPositive ? "text-red-500" : "text-green-500";
  } else {
    changeColor = isPositive ? "text-green-500" : "text-red-500";
  }

  // Don't show change color if change is 0
  if (change === 0) {
    changeColor = "text-muted-foreground";
  }

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">
          {title}
        </span>
        <div
          className={`w-10 h-10 rounded-xl ${iconBgClass} flex items-center justify-center`}
        >
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold mb-2">{value}</div>
      <div className={`text-sm font-medium ${changeColor}`}>
        {isPositive ? "+" : ""}
        {change}
        {changeUnit}
      </div>
    </div>
  );
}

export default function VenditaKPICards({ data }: VenditaKPICardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <KPICard
        title="Tasso Conversione"
        value={`${data.tassoConversione.value}%`}
        change={data.tassoConversione.change}
        changeUnit="%"
        icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
        iconBgClass="bg-blue-500/20"
      />
      <KPICard
        title="Offerte Scadute"
        value={data.offerteScadute.value.toString()}
        change={data.offerteScadute.change}
        changeUnit=""
        icon={<AlertCircle className="w-5 h-5 text-orange-500" />}
        iconBgClass="bg-orange-500/20"
        invertChangeColor={true}
      />
    </div>
  );
}
