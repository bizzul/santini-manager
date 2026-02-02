"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { TrendingUp } from "lucide-react";
import { ProduzioneDashboardStats } from "@/lib/server-data";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface ProduzioneWeeklyChartProps {
  data: ProduzioneDashboardStats["weeklyTrend"];
  columnNames: string[];
}

export default function ProduzioneWeeklyChart({
  data,
  columnNames,
}: ProduzioneWeeklyChartProps) {
  if (data.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <h3 className="text-lg font-bold">Andamento settimanale</h3>
        </div>
        <div className="h-[280px] flex items-center justify-center text-muted-foreground">
          Nessun dato disponibile
        </div>
      </div>
    );
  }

  // Create series for each column
  const chartSeries = columnNames.map((colName) => ({
    name: colName,
    data: data.map((week) => {
      const colData = week.columns.find((c) => c.columnName === colName);
      return colData?.count || 0;
    }),
  }));

  const chartOptions: ApexOptions = {
    chart: {
      type: "area",
      height: 280,
      stacked: true,
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
        formatter: (value) => `${value} nuovi lavori`,
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
    colors: [
      "#22c55e", // green
      "#3b82f6", // blue
      "#f97316", // orange
      "#a855f7", // purple
      "#ec4899", // pink
      "#14b8a6", // teal
      "#eab308", // yellow
      "#6366f1", // indigo
    ].slice(0, columnNames.length),
  };

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-green-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Andamento settimanale</h3>
          <p className="text-xs text-muted-foreground">
            Nuovi lavori per settimana
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
