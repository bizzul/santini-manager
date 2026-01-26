"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { TrendingUp } from "lucide-react";
import { DashboardStats } from "@/lib/server-data";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface PipelineChartProps {
  data: DashboardStats;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return value.toFixed(0);
}

export default function PipelineChart({ data }: PipelineChartProps) {
  const chartOptions: ApexOptions = {
    chart: {
      type: "area",
      height: 300,
      animations: {
        enabled: true,
        speed: 1000,
        animateGradually: {
          enabled: true,
          delay: 150,
        },
      },
      toolbar: {
        show: false,
      },
      background: "transparent",
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
        stops: [0, 100],
      },
    },
    xaxis: {
      categories: data.pipelineData.map((d) => d.month),
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
        formatter: (value) => `${formatCurrency(value)}`,
      },
    },
    grid: {
      show: true,
      borderColor: "#3f3f46",
      strokeDashArray: 3,
    },
    tooltip: {
      theme: "dark",
      y: {
        formatter: (value) => `CHF ${formatCurrency(value)}`,
      },
    },
    colors: ["#3b82f6"],
  };

  const chartSeries = [
    {
      name: "Valore Offerte",
      data: data.pipelineData.map((d) => d.value),
    },
  ];

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Pipeline Globale</h3>
            <p className="text-sm text-muted-foreground">
              Andamento valori offerti negli ultimi 6 mesi
            </p>
          </div>
        </div>
      </div>

      <ReactApexChart
        options={chartOptions}
        series={chartSeries}
        type="area"
        height={300}
      />
    </div>
  );
}
