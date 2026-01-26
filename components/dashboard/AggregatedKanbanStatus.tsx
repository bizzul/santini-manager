"use client";

import { DashboardStats } from "@/lib/server-data";

interface AggregatedKanbanStatusProps {
  data: DashboardStats;
}

const DEPARTMENT_CONFIG: {
  [key: string]: { color: string; defaultStatus: string };
} = {
  Vendita: { color: "blue", defaultStatus: "In trattativa" },
  AVOR: { color: "orange", defaultStatus: "In lavorazione" },
  Produzione: { color: "green", defaultStatus: "In corso" },
  Fatturazione: { color: "gray", defaultStatus: "Da emettere" },
};

const COLOR_CLASSES = {
  blue: "bg-blue-500",
  orange: "bg-orange-500",
  green: "bg-green-500",
  gray: "bg-gray-500",
};

export default function AggregatedKanbanStatus({
  data,
}: AggregatedKanbanStatusProps) {
  // Get status for each department
  const getDepartmentStatus = (department: string) => {
    const status = data.kanbanStatus.find((k) => k.department === department);
    return status || { department, status: DEPARTMENT_CONFIG[department]?.defaultStatus || "Sconosciuto", count: 0 };
  };

  const departments = ["Vendita", "AVOR", "Produzione", "Fatturazione"];

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-1">Stato Kanban Aggregato</h3>
        <p className="text-sm text-muted-foreground">
          Panoramica rapida reparti
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {departments.map((dept) => {
          const deptStatus = getDepartmentStatus(dept);
          const config = DEPARTMENT_CONFIG[dept] || { color: "gray", defaultStatus: "Sconosciuto" };
          const dotColor = COLOR_CLASSES[config.color as keyof typeof COLOR_CLASSES] || "bg-gray-500";

          return (
            <div
              key={dept}
              className="backdrop-blur-sm bg-white/5 rounded-xl p-4 border border-white/10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1">{dept}</p>
                  <p className="text-xs text-muted-foreground">
                    {deptStatus.status}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{deptStatus.count}</span>
                  <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
