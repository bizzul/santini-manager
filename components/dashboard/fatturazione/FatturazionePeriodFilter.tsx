"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";

const PERIODS = [
  { id: "week", label: "Settimana" },
  { id: "month", label: "Mese" },
  { id: "quarter", label: "Trimestre" },
  { id: "year", label: "Anno" },
  { id: "all", label: "Tutto" },
];

interface FatturazionePeriodFilterProps {
  currentPeriod: string;
}

export default function FatturazionePeriodFilter({
  currentPeriod,
}: FatturazionePeriodFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePeriodChange = (period: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (period === "all") {
      params.delete("period");
    } else {
      params.set("period", period);
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-muted-foreground" />
      <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
        {PERIODS.map((period) => (
          <button
            key={period.id}
            onClick={() => handlePeriodChange(period.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              currentPeriod === period.id
                ? "bg-amber-500 text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-slate-700/50"
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>
    </div>
  );
}
