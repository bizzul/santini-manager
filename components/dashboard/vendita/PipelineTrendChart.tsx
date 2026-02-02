"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { TrendingUp } from "lucide-react";
import { VenditaDashboardStats } from "@/lib/server-data";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface PipelineTrendChartProps {
  data: VenditaDashboardStats["pipelineTrend"];
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return value.toFixed(0);
}

export default function PipelineTrendChart({ data }: PipelineTrendChartProps) {
  const chartOptions: ApexOptions = {
    chart: {
      type: "line",
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
      width: [3, 3],
    },
    markers: {
      size: 5,
      strokeWidth: 0,
      hover: {
        size: 7,
      },
    },
    xaxis: {
      categories: data.map((d) => d.month),
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
    yaxis: [
      {
        title: {
          text: "",
        },
        labels: {
          style: {
            colors: "#a1a1aa",
            fontSize: "12px",
          },
          formatter: (value) => value.toFixed(0),
        },
        min: 0,
      },
      {
        opposite: true,
        title: {
          text: "",
        },
        labels: {
          style: {
            colors: "#a1a1aa",
            fontSize: "12px",
          },
          formatter: (value) => formatCurrency(value),
        },
        min: 0,
      },
    ],
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
          if (seriesIndex === 1) {
            return `CHF ${formatCurrency(value)}`;
          }
          return value.toFixed(0);
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
        horizontal: 16,
      },
    },
    colors: ["#3b82f6", "#22c55e"],
  };

  const chartSeries = [
    {
      name: "Numero Offerte",
      type: "line",
      data: data.map((d) => d.numeroOfferte),
    },
    {
      name: "Valore Offerte",
      type: "line",
      data: data.map((d) => d.valoreOfferte),
    },
  ];

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-green-500" />
        </div>
        <h3 className="text-lg font-bold">Pipeline & Trend Offerte</h3>
      </div>

      <ReactApexChart
        options={chartOptions}
        series={chartSeries}
        type="line"
        height={280}
      />
    </div>
  );
}
