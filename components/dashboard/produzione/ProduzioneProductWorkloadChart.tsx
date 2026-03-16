"use client";

import { BarChart3 } from "lucide-react";
import { ProduzioneDashboardStats } from "@/lib/server-data";
import { getProductCategoryIcon } from "@/lib/calendar-product-styling";

interface ProduzioneProductWorkloadChartProps {
  data: ProduzioneDashboardStats["productWorkload"];
}

export default function ProduzioneProductWorkloadChart({
  data,
}: ProduzioneProductWorkloadChartProps) {
  const globalMax = Math.max(
    ...data.flatMap((item) => [item.pratiche, item.elementi]),
    1
  );

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Carico per tipologia prodotto</h3>
          <p className="text-xs text-muted-foreground">
            Pratiche ed elementi attivi per famiglia prodotto
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-[120px] flex items-center justify-center text-muted-foreground">
          Nessun dato disponibile
        </div>
      ) : (
        <div className="space-y-2.5">
          {data.map((category) => {
            const Icon = getProductCategoryIcon(category.category);
            const pratichePct = (category.pratiche / globalMax) * 100;
            const elementiPct = (category.elementi / globalMax) * 100;

            return (
              <div key={category.category} className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <Icon
                    className="w-3.5 h-3.5"
                    style={{ color: category.color }}
                  />
                </div>
                <span className="text-xs font-medium w-24 truncate shrink-0">
                  {category.category}
                </span>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3.5 bg-slate-800/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(pratichePct, 3)}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold w-6 text-right tabular-nums">
                      {category.pratiche}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3.5 bg-slate-800/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 opacity-60"
                        style={{
                          width: `${Math.max(elementiPct, 3)}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold w-6 text-right tabular-nums">
                      {category.elementi}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-4 pt-1 pl-[122px]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-slate-500" />
              <span className="text-[10px] text-muted-foreground">Pratiche</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-slate-500 opacity-60" />
              <span className="text-[10px] text-muted-foreground">Elementi</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
