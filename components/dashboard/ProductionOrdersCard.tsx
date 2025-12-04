"use client";

import { Factory } from "lucide-react";

export default function ProductionOrdersCard() {
  // Dati mockup per reparto
  const departments = [
    {
      name: "Arredamento",
      color: "blue",
      projects: 12,
      items: 20,
      value: 345000,
      bgGradient: "from-blue-500 to-blue-400",
      bgLight: "bg-blue-500/20",
      textColor: "text-blue-500",
    },
    {
      name: "Serramenti",
      color: "yellow",
      projects: 8,
      items: 20,
      value: 178000,
      bgGradient: "from-yellow-500 to-yellow-400",
      bgLight: "bg-yellow-500/20",
      textColor: "text-yellow-500",
    },
    {
      name: "Porte",
      color: "orange",
      projects: 15,
      items: 30,
      value: 412000,
      bgGradient: "from-orange-500 to-orange-400",
      bgLight: "bg-orange-500/20",
      textColor: "text-orange-500",
    },
    {
      name: "Service",
      color: "green",
      projects: 6,
      items: 34,
      value: 89000,
      bgGradient: "from-green-500 to-green-400",
      bgLight: "bg-green-500/20",
      textColor: "text-green-500",
    },
  ];

  const totalProjects = departments.reduce(
    (sum, dept) => sum + dept.projects,
    0
  );
  const totalItems = departments.reduce((sum, dept) => sum + dept.items, 0);
  const totalValue = departments.reduce((sum, dept) => sum + dept.value, 0);
  const maxValue = Math.max(...departments.map((d) => d.value));

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Factory className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Ordini totali in produzione</h3>
            <div className="backdrop-blur-sm bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-1.5 mt-2 inline-block">
              <p className="text-sm font-semibold">
                <span className="text-blue-400">{totalProjects} progetti</span>
                <span className="mx-2">•</span>
                <span className="text-green-400">{totalItems} elementi</span>
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-1">Valore Totale</p>
          <p className="text-2xl font-bold text-green-400">
            CHF {(totalValue / 1000).toFixed(0)}k
          </p>
        </div>
      </div>

      {/* Vertical Bar Chart */}
      <div className="mb-4">
        <div
          className="flex items-end justify-around gap-4"
          style={{ height: "400px" }}
        >
          {departments.map((dept, index) => {
            const maxProjects = Math.max(...departments.map((d) => d.projects));
            const maxItems = Math.max(...departments.map((d) => d.items));

            return (
              <div key={index} className="flex flex-col items-center flex-1">
                {/* Bars Container */}
                <div
                  className="w-full flex flex-col items-center gap-2 mb-3"
                  style={{ height: "340px" }}
                >
                  {/* Value Badge - Attached to bars */}
                  <div
                    className={`backdrop-blur-md ${dept.bgLight} border border-white/20 rounded px-1.5 py-0.5`}
                  >
                    <p className={`text-[10px] font-medium ${dept.textColor}`}>
                      CHF {(dept.value / 1000).toFixed(0)}k
                    </p>
                  </div>

                  {/* Bars */}
                  <div className="w-full flex justify-center items-end gap-2 flex-1">
                    {/* Projects Bar */}
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-full flex flex-col justify-end h-full relative">
                        <div
                          className={`w-full bg-gradient-to-t ${dept.bgGradient} rounded-t-lg transition-all duration-700 ease-out relative group`}
                          style={{
                            height: `${(dept.projects / maxProjects) * 95}%`,
                            minHeight: "100px",
                          }}
                        >
                          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg" />
                          {/* Number inside bar */}
                          <span className="absolute top-3 left-1/2 -translate-x-1/2 font-bold text-white text-base drop-shadow-lg">
                            {dept.projects}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Elements Bar */}
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-full flex flex-col justify-end h-full relative">
                        <div
                          className={`w-full bg-gradient-to-t ${dept.bgGradient} rounded-t-lg transition-all duration-700 ease-out relative group opacity-70`}
                          style={{
                            height: `${(dept.items / maxItems) * 95}%`,
                            minHeight: "100px",
                          }}
                        >
                          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg" />
                          {/* Number inside bar */}
                          <span className="absolute top-3 left-1/2 -translate-x-1/2 font-bold text-white text-base drop-shadow-lg">
                            {dept.items}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Department Info */}
                <div
                  className={`w-full ${dept.bgLight} rounded-xl p-2 text-center`}
                >
                  <h4
                    className={`font-semibold text-sm ${dept.textColor} mb-1`}
                  >
                    {dept.name}
                  </h4>
                  <div className="flex justify-around text-xs text-muted-foreground">
                    <span>P</span>
                    <span>E</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-xs text-muted-foreground">Progetti (P)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500/70 rounded"></div>
            <span className="text-xs text-muted-foreground">Elementi (E)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
