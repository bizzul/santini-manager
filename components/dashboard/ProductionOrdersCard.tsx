"use client";

import { Factory } from "lucide-react";
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

// Helper function to darken a hex color
function darkenColor(hex: string, percent: number): string {
  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Parse hex to RGB
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // Darken
  r = Math.floor(r * (1 - percent / 100));
  g = Math.floor(g * (1 - percent / 100));
  b = Math.floor(b * (1 - percent / 100));

  // Convert back to hex
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

interface CategoryData {
  name: string;
  color: string;
  projects: number;
  items: number;
  value: number;
}

interface ProductionOrdersData {
  totalProjects: number;
  totalItems: number;
  totalValue: number;
  byCategory: CategoryData[];
}

interface ProductionOrdersCardProps {
  data: ProductionOrdersData;
}

export default function ProductionOrdersCard({
  data,
}: ProductionOrdersCardProps) {
  // Map categories to department style with colors
  const departments = data.byCategory.map((cat, index) => ({
    name: cat.name,
    color: cat.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    projects: cat.projects,
    items: cat.items,
    value: cat.value,
  }));

  // If no data, show placeholder
  if (departments.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6 relative overflow-hidden h-full flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Factory className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Ordini</h3>
            <p className="text-sm text-muted-foreground">
              Nessun ordine attivo
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center flex-1 text-muted-foreground">
          Nessun dato disponibile
        </div>
      </div>
    );
  }

  // Create color arrays for both series
  // Progetti: original colors, Elementi: darker version
  const projectColors = departments.map((d) => d.color);
  const elementColors = departments.map((d) => darkenColor(d.color, 40));

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
        columnWidth: "70%",
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
      position: "bottom",
      horizontalAlign: "center",
      labels: {
        colors: "#a1a1aa",
      },
      markers: {
        size: 6,
        strokeWidth: 0,
      },
    },
    tooltip: {
      theme: "dark",
      y: {
        formatter: (value) => {
          return value.toString();
        },
      },
    },
    // Use function to return color based on dataPointIndex
    colors: [
      function ({ dataPointIndex }: { dataPointIndex: number }) {
        return projectColors[dataPointIndex] || "#3b82f6";
      },
      function ({ dataPointIndex }: { dataPointIndex: number }) {
        return elementColors[dataPointIndex] || "#1e40af";
      },
    ],
  };

  const chartSeries = [
    {
      name: "Progetti",
      data: departments.map((d) => d.projects),
    },
    {
      name: "Elementi",
      data: departments.map((d) => d.items),
    },
  ];

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6 relative overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Factory className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Ordini</h3>
            <div className="backdrop-blur-sm bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-1.5 mt-2 inline-block">
              <p className="text-sm font-semibold">
                <span className="text-blue-400">
                  {data.totalProjects} progetti
                </span>
                <span className="mx-2">•</span>
                <span className="text-green-400">
                  {data.totalItems} elementi
                </span>
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

      {/* ApexCharts Bar Chart */}
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
            <p
              className="text-xs font-bold"
              style={{ color: dept.color }}
            >
              CHF {(dept.value / 1000).toFixed(0)}k
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
