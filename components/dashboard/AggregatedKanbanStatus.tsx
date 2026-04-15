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
    <div className="dashboard-panel p-6">
      <div className="mb-6">
        <h3 className="dashboard-panel-title mb-1">Stato Kanban Aggregato</h3>
        <p className="dashboard-panel-subtitle">
          Panoramica rapida reparti
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {departments.map((dept) => {
          const deptStatus = getDepartmentStatus(dept);
          const config = DEPARTMENT_CONFIG[dept] || { color: "gray", defaultStatus: "Sconosciuto" };
          const dotColor = COLOR_CLASSES[config.color as keyof typeof COLOR_CLASSES] || "bg-gray-500";

          return (
            <div
              key={dept}
              className="dashboard-panel-inner p-3.5"
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
