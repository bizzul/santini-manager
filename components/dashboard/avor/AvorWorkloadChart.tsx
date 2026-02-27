"use client";

import {
  Sofa,
  DoorOpen,
  LayoutGrid,
  Wrench,
  HardHat,
  Tag,
  BarChart3,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AvorDashboardStats } from "@/lib/server-data";

interface AvorWorkloadChartProps {
  data: AvorDashboardStats["workloadData"];
  columnNames: string[];
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  arredamento: Sofa,
  porte: DoorOpen,
  serramenti: LayoutGrid,
  accessori: Wrench,
  posa: HardHat,
};

function getCategoryIcon(name: string): LucideIcon {
  return CATEGORY_ICONS[name.toLowerCase().trim()] || Tag;
}

export default function AvorWorkloadChart({
  data,
  columnNames,
}: AvorWorkloadChartProps) {
  const globalMax = Math.max(
    ...data.flatMap((d) => d.columns.map((c) => c.count)),
    1
  );

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">
            Carico di lavoro per tipologia
          </h3>
          <p className="text-xs text-muted-foreground">
            Pratiche per categoria e colonna
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-[120px] flex items-center justify-center text-muted-foreground">
          Nessun dato disponibile
        </div>
      ) : (
        <div className="space-y-2.5">
          {data.map((cat) => {
            const Icon = getCategoryIcon(cat.category);
            const total = cat.columns.reduce((sum, c) => sum + c.count, 0);
            return (
              <div key={cat.category} className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${cat.color}20` }}
                >
                  <Icon
                    className="w-3.5 h-3.5"
                    style={{ color: cat.color }}
                  />
                </div>
                <span className="text-xs font-medium w-24 truncate shrink-0">
                  {cat.category}
                </span>
                <div className="flex-1 flex items-center gap-1.5">
                  <div className="flex-1 h-5 bg-slate-800/50 rounded-full overflow-hidden flex">
                    {cat.columns.map((col) => {
                      if (col.count === 0) return null;
                      const pct = (col.count / globalMax) * 100;
                      return (
                        <div
                          key={col.columnName}
                          className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500"
                          style={{
                            width: `${Math.max(pct, 2)}%`,
                            backgroundColor: cat.color,
                            opacity:
                              0.4 +
                              0.6 *
                                (1 -
                                  columnNames.indexOf(col.columnName) /
                                    Math.max(columnNames.length - 1, 1)),
                          }}
                          title={`${col.columnName}: ${col.count}`}
                        />
                      );
                    })}
                  </div>
                  <span className="text-xs font-semibold w-6 text-right tabular-nums">
                    {total}
                  </span>
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-3 pt-1 pl-[122px] flex-wrap">
            {columnNames.map((name, i) => (
              <div key={name} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-2 rounded-sm"
                  style={{
                    backgroundColor: "#64748b",
                    opacity:
                      0.4 +
                      0.6 * (1 - i / Math.max(columnNames.length - 1, 1)),
                  }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
