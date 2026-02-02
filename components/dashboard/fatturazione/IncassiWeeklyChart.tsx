"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { TrendingUp } from "lucide-react";
import { FatturazioneDashboardStats } from "@/lib/server-data";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface IncassiWeeklyChartProps {
  data: FatturazioneDashboardStats["weeklyTrend"];
}

function formatCHF(value: number): string {
  return new Intl.NumberFormat("it-CH", {
    style: "currency",
    currency: "CHF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function IncassiWeeklyChart({ data }: IncassiWeeklyChartProps) {
  const hasData = data.some((d) => d.incassi > 0 || d.emesso > 0);

  if (!hasData) {
    return (
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold">Incassi per settimana</h3>
        </div>
        <div className="h-[280px] flex items-center justify-center text-muted-foreground">
          Nessun dato disponibile
        </div>
      </div>
    );
  }

  const chartSeries = [
    {
      name: "Incassi",
      data: data.map((d) => d.incassi),
    },
    {
      name: "Fatturato emesso",
      data: data.map((d) => d.emesso),
    },
  ];

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
        formatter: (value) => formatCHF(value),
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
        formatter: (value) => formatCHF(value),
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

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Incassi per settimana</h3>
          <p className="text-xs text-muted-foreground">
            Trend incassi e fatturato emesso
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
