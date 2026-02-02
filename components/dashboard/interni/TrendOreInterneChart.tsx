"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { TrendingUp } from "lucide-react";
import { InterniDashboardStats } from "@/lib/server-data";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface TrendOreInterneChartProps {
  data: InterniDashboardStats["weeklyTrend"];
}

export default function TrendOreInterneChart({
  data,
}: TrendOreInterneChartProps) {
  const hasData = data.some((d) => d.oreInterne > 0);

  if (!hasData) {
    return (
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <h3 className="text-lg font-bold">Trend ore interne</h3>
        </div>
        <div className="h-[280px] flex items-center justify-center text-muted-foreground">
          Nessun dato disponibile
        </div>
      </div>
    );
  }

  const chartSeries = [
    {
      name: "Ore interne",
      data: data.map((d) => d.oreInterne),
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
      width: 3,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.6,
        opacityTo: 0.1,
        stops: [0, 100],
      },
    },
    markers: {
      size: 5,
      strokeWidth: 0,
      hover: {
        size: 7,
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
        formatter: (value) => `${Math.round(value)}h`,
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
      y: {
        formatter: (value) => `${value} ore`,
      },
    },
    legend: {
      show: false,
    },
    colors: ["#a855f7"],
  };

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-purple-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Trend ore interne</h3>
          <p className="text-xs text-muted-foreground">
            Ore settimanali lavori interni
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
