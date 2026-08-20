"use client";

import { BarChart3 } from "lucide-react";
import { getKanbanIcon } from "@/lib/kanban-icons";
import { CHART_SERIES_COLORS, chartColorAt } from "@/lib/charts/theme";
import { DashboardStats } from "@/lib/server-data";

interface DepartmentWorkloadChartProps {
  data: DashboardStats;
}

const FALLBACK_BAR_COLORS: { [key: string]: string } = {
  Vendita: CHART_SERIES_COLORS[0],
  AVOR: CHART_SERIES_COLORS[2],
  Produzione: CHART_SERIES_COLORS[3],
  "Prod.": CHART_SERIES_COLORS[3],
  Install: CHART_SERIES_COLORS[4],
  "Install.": CHART_SERIES_COLORS[4],
  Service: CHART_SERIES_COLORS[5],
};

/** Chart-only: "5. Posa" → "Posa". Does not change kanban titles elsewhere. */
function departmentChartLabel(department: string): string {
  return department.replace(/^\d+\.\s*/, "").trim() || department;
}

export default function DepartmentWorkloadChart({
  data,
}: DepartmentWorkloadChartProps) {
  const sortedData = [...data.departmentWorkload].sort(
    (a, b) => b.count - a.count
  );
  const maxCount = Math.max(...sortedData.map((row) => row.count), 1);

  return (
    <div className="dashboard-panel p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="dashboard-panel-title">Lavori per Reparto</h3>
            <p className="dashboard-panel-subtitle">
              Carico attuale numero commesse (solo stato attivo)
            </p>
          </div>
        </div>
      </div>

      {sortedData.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessuna commessa attiva</p>
      ) : (
        <div className="space-y-2.5">
          {sortedData.map((row, index) => {
            const Icon = getKanbanIcon(row.icon);
            const label = departmentChartLabel(row.department);
            const barColor =
              FALLBACK_BAR_COLORS[row.department] || chartColorAt(index);
            const width = `${Math.max((row.count / maxCount) * 100, 4)}%`;

            return (
              <div
                key={row.department}
                className="flex items-center gap-2.5"
                title={`${label}: ${row.count} commesse attive`}
              >
                <div
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                  style={{ backgroundColor: row.color || "#3B82F6" }}
                >
                  <Icon className="h-3 w-3 text-white" />
                </div>
                <span className="w-40 shrink-0 truncate text-xs text-muted-foreground">
                  {label}
                </span>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <div className="relative h-6 min-w-0 flex-1 overflow-hidden rounded-md bg-muted/35">
                    <div
                      className="absolute inset-y-0 left-0 rounded-md"
                      style={{ width, backgroundColor: barColor }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-[11px] font-bold text-foreground">
                    {row.count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
