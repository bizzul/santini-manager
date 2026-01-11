"use client";

import { FileText } from "lucide-react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

// Default colors for categories
const DEFAULT_COLORS = [
  "#3b82f6", // blue
  "#eab308", // yellow
  "#f97316", // orange
  "#22c55e", // green
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f43f5e", // rose
];

interface CategoryData {
  name: string;
  color: string;
  count: number;
  value: number;
}

interface OffersData {
  todo: number;
  inProgress: number;
  sent: number;
  won: number;
  lost: number;
  totalValue: number;
  byCategory: CategoryData[];
}

interface OffersChartCardProps {
  data: OffersData;
}

export default function OffersChartCard({ data }: OffersChartCardProps) {
  // Map categories with colors
  const departments = data.byCategory.map((cat, index) => ({
    name: cat.name,
    color: cat.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    offers: cat.count,
    value: cat.value,
  }));

  const totalOffers =
    data.todo + data.inProgress + data.sent + data.won + data.lost;

  // If no data, show placeholder
  if (departments.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6 relative overflow-hidden h-full flex flex-col">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Offerte totali</h3>
            <p className="text-sm text-muted-foreground">
              Nessuna offerta attiva
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center flex-1 text-muted-foreground">
          Nessun dato disponibile
        </div>
      </div>
    );
  }

  // Get colors array for distributed chart
  const chartColors = departments.map((d) => d.color);

  const chartOptions: ApexOptions = {
    chart: {
      type: "bar",
      height: 350,
      animations: {
        enabled: true,
        speed: 1200,
        animateGradually: {
          enabled: true,
          delay: 200,
        },
        dynamicAnimation: {
          enabled: true,
          speed: 400,
        },
      },
      toolbar: {
        show: false,
      },
      background: "transparent",
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        borderRadiusApplication: "end",
        columnWidth: "60%",
        distributed: true, // Enable different colors for each bar
        dataLabels: {
          position: "top",
        },
      },
    },
    dataLabels: {
      enabled: true,
      offsetY: -20,
      style: {
        fontSize: "12px",
        fontWeight: "bold",
        colors: ["#18181b"],
      },
      background: {
        enabled: true,
        foreColor: "#ffffff",
        borderRadius: 4,
        padding: 4,
        opacity: 0.95,
        borderWidth: 1,
        borderColor: "#d1d5db",
      },
      dropShadow: {
        enabled: false,
      },
    },
    xaxis: {
      categories: departments.map((d) => d.name),
      labels: {
        style: {
          colors: "#a1a1aa",
          fontSize: "11px",
          fontWeight: 600,
        },
        rotate: -45,
        rotateAlways: departments.length > 4,
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      show: false,
    },
    fill: {
      type: "solid",
      opacity: 0.95,
    },
    grid: {
      show: false,
    },
    legend: {
      show: false,
    },
    tooltip: {
      theme: "dark",
      y: {
        formatter: (value) => {
          return value + " offerte";
        },
      },
    },
    colors: chartColors,
  };

  const chartSeries = [
    {
      name: "Offerte",
      data: departments.map((d) => d.offers),
    },
  ];

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6 relative overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Offerte totali</h3>
            <div className="backdrop-blur-sm bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-1.5 mt-2 inline-block">
              <p className="text-sm font-semibold">
                <span className="text-blue-400">{totalOffers} offerte</span>
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-1">Valore Totale</p>
          <p className="text-2xl font-bold text-green-400">
            CHF {(data.totalValue / 1000).toFixed(0)}k
          </p>
        </div>
      </div>

      {/* ApexCharts Vertical Bar Chart */}
      <div className="flex-1 min-h-[300px]">
        <ReactApexChart
          options={chartOptions}
          series={chartSeries}
          type="bar"
          height="100%"
        />
      </div>

      {/* Value badges per department */}
      <div className="grid grid-cols-4 gap-2 mt-4">
        {departments.slice(0, 4).map((dept, index) => (
          <div
            key={index}
            className="backdrop-blur-md border border-white/20 rounded-lg px-2 py-2 text-center"
            style={{ backgroundColor: `${dept.color}20` }}
          >
            <p
              className="text-[10px] font-medium mb-0.5 truncate"
              style={{ color: dept.color }}
            >
              {dept.name}
            </p>
            <p className="text-xs font-bold" style={{ color: dept.color }}>
              CHF {(dept.value / 1000).toFixed(0)}k
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
