"use client";

import { FileText } from "lucide-react";

export default function OffersChartCard() {
  // Dati mockup per offerte per reparto
  const departments = [
    {
      name: "Arredamento",
      color: "blue",
      offers: 8,
      value: 156000,
      bgGradient: "from-blue-500 to-blue-400",
      bgLight: "bg-blue-500/20",
      textColor: "text-blue-500",
    },
    {
      name: "Serramenti",
      color: "yellow",
      offers: 5,
      value: 89000,
      bgGradient: "from-yellow-500 to-yellow-400",
      bgLight: "bg-yellow-500/20",
      textColor: "text-yellow-500",
    },
    {
      name: "Porte",
      color: "orange",
      offers: 12,
      value: 234000,
      bgGradient: "from-orange-500 to-orange-400",
      bgLight: "bg-orange-500/20",
      textColor: "text-orange-500",
    },
    {
      name: "Service",
      color: "green",
      offers: 3,
      value: 45000,
      bgGradient: "from-green-500 to-green-400",
      bgLight: "bg-green-500/20",
      textColor: "text-green-500",
    },
  ];

  const totalOffers = departments.reduce((sum, dept) => sum + dept.offers, 0);
  const totalValue = departments.reduce((sum, dept) => sum + dept.value, 0);
  const maxOffers = Math.max(...departments.map((d) => d.offers));

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6 relative overflow-hidden">
      {/* Header */}
      <div className="space-y-2 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Offerte totali</h3>
            <div className="backdrop-blur-sm bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-1 mt-1 inline-block">
              <p className="text-xs font-semibold">
                <span className="text-blue-400">{totalOffers} offerte</span>
              </p>
            </div>
          </div>
        </div>
        <div className="text-right -mt-12">
          <p className="text-xs text-muted-foreground mb-1">Valore Totale</p>
          <p className="text-xl font-bold text-green-400">
            CHF {(totalValue / 1000).toFixed(0)}k
          </p>
        </div>
      </div>

      {/* Vertical Bar Chart */}
      <div>
        <div
          className="flex items-end justify-around gap-3"
          style={{ height: "280px" }}
        >
          {departments.map((dept, index) => {
            return (
              <div key={index} className="flex flex-col items-center flex-1">
                {/* Bars Container */}
                <div
                  className="w-full flex flex-col items-center gap-2"
                  style={{ height: "240px" }}
                >
                  {/* Value Badge - Attached to bars */}
                  <div
                    className={`backdrop-blur-md ${dept.bgLight} border border-white/20 rounded px-1.5 py-0.5`}
                  >
                    <p className={`text-[10px] font-medium ${dept.textColor}`}>
                      CHF {(dept.value / 1000).toFixed(0)}k
                    </p>
                  </div>

                  {/* Bar */}
                  <div className="w-full flex justify-center items-end flex-1">
                    <div className="flex flex-col items-center w-3/4">
                      <div className="w-full flex flex-col justify-end h-full relative">
                        <div
                          className={`w-full bg-gradient-to-t ${dept.bgGradient} rounded-t-lg transition-all duration-700 ease-out relative group`}
                          style={{
                            height: `${(dept.offers / maxOffers) * 95}%`,
                            minHeight: "80px",
                          }}
                        >
                          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg" />
                          {/* Number inside bar */}
                          <span className="absolute top-3 left-1/2 -translate-x-1/2 font-bold text-white text-base drop-shadow-lg">
                            {dept.offers}
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
                    className={`font-semibold text-xs ${dept.textColor}`}
                  >
                    {dept.name}
                  </h4>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

