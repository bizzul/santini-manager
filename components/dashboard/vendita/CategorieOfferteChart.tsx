"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { Clock } from "lucide-react";
import { VenditaDashboardStats } from "@/lib/server-data";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface CategorieOfferteChartProps {
  data: VenditaDashboardStats["categoriesData"];
}

// Function to lighten a hex color
function lightenColor(hex: string, percent: number): string {
  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Parse the hex color
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // Lighten
  r = Math.min(255, Math.floor(r + (255 - r) * percent));
  g = Math.min(255, Math.floor(g + (255 - g) * percent));
  b = Math.min(255, Math.floor(b + (255 - b) * percent));

  // Convert back to hex
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export default function CategorieOfferteChart({
  data,
}: CategorieOfferteChartProps) {
  // Handle empty data
  if (data.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-500/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold">Categorie Offerte</h3>
        </div>
        <div className="h-[280px] flex items-center justify-center text-muted-foreground">
          Nessuna categoria disponibile
        </div>
      </div>
    );
  }

  // Get colors from data - main color and lighter version
  const mainColors = data.map((d) => d.color);
  const lightColors = data.map((d) => lightenColor(d.color, 0.4));

  const chartOptions: ApexOptions = {
    chart: {
      type: "bar",
      height: 280,
      stacked: false,
      animations: {
        enabled: true,
        speed: 800,
      },
      toolbar: {
        show: false,
      },
      background: "transparent",
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        borderRadiusApplication: "end",
        barHeight: "70%",
        dataLabels: {
          position: "center",
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 1,
      colors: ["transparent"],
    },
    xaxis: {
      categories: data.map((d) => d.category),
      labels: {
        style: {
          colors: "#a1a1aa",
          fontSize: "12px",
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#a1a1aa",
          fontSize: "12px",
        },
      },
    },
    fill: {
      opacity: 1,
    },
    grid: {
      show: true,
      borderColor: "#3f3f46",
      strokeDashArray: 3,
      xaxis: {
        lines: {
          show: true,
        },
      },
      yaxis: {
        lines: {
          show: false,
        },
      },
    },
    tooltip: {
      theme: "dark",
      shared: true,
      intersect: false,
    },
    legend: {
      position: "bottom",
      horizontalAlign: "left",
      markers: {
        size: 8,
        shape: "circle",
      },
      labels: {
        colors: "#a1a1aa",
      },
      itemMargin: {
        horizontal: 12,
      },
    },
    // Note: ApexCharts grouped bars use series colors, not per-bar colors
    // We'll use the first category's colors for the legend
    colors: [mainColors[0] || "#3b82f6", lightColors[0] || "#93c5fd"],
  };

  // For per-bar colors, we need to use data point colors
  const chartSeries = [
    {
      name: "Numero Offerte",
      data: data.map((d, i) => ({
        x: d.category,
        y: d.offerte,
        fillColor: mainColors[i],
      })),
    },
    {
      name: "Numero Elementi",
      data: data.map((d, i) => ({
        x: d.category,
        y: d.elementi,
        fillColor: lightColors[i],
      })),
    },
  ];

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-500/20 flex items-center justify-center">
          <Clock className="w-5 h-5 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold">Categorie Offerte</h3>
      </div>

      <ReactApexChart
        options={chartOptions}
        series={chartSeries}
        type="bar"
        height={280}
      />
    </div>
  );
}
