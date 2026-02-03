"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { TrendingUp } from "lucide-react";
import { InventoryDashboardStats } from "@/lib/server-data";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface ValueTrendChartProps {
  data: InventoryDashboardStats["valueTrend"];
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return value.toFixed(0);
}

export default function ValueTrendChart({ data }: ValueTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <h3 className="text-lg font-bold">Movimenti settimanali</h3>
        </div>
        <div className="h-[280px] flex items-center justify-center text-muted-foreground">
          Nessun dato disponibile
        </div>
      </div>
    );
  }

  const chartOptions: ApexOptions = {
    chart: {
      type: "area",
      height: 280,
      animations: {
        enabled: true,
        speed: 800,
      },
      toolbar: {
        show: false,
      },
      background: "transparent",
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.5,
        opacityTo: 0.1,
        stops: [0, 100],
      },
    },
    markers: {
      size: 4,
      strokeWidth: 0,
      hover: {
        size: 6,
      },
    },
    xaxis: {
      categories: data.map((d) => d.week),
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
        formatter: (value) => Math.round(value).toString(),
      },
      min: 0,
    },
    grid: {
      show: true,
      borderColor: "#3f3f46",
      strokeDashArray: 3,
    },
    tooltip: {
      theme: "dark",
      shared: true,
      intersect: false,
      y: {
        formatter: (value, { seriesIndex }) => {
          if (seriesIndex === 0) {
            return `${Math.round(value)} movimenti`;
          }
          return `CHF ${formatCurrency(value)}`;
        },
      },
    },
    legend: {
      position: "bottom",
      horizontalAlign: "center",
      markers: {
        size: 8,
        shape: "circle",
      },
      labels: {
        colors: "#a1a1aa",
      },
      itemMargin: {
        horizontal: 8,
      },
    },
    colors: ["#22c55e", "#3b82f6"],
  };

  const chartSeries = [
    {
      name: "Movimenti",
      data: data.map((d) => d.movementCount),
    },
  ];

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-green-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Movimenti settimanali</h3>
          <p className="text-xs text-muted-foreground">
            Trend movimenti inventario per settimana
          </p>
        </div>
      </div>

      <ReactApexChart
        options={chartOptions}
        series={chartSeries}
        type="area"
        height={280}
      />
    </div>
  );
}
