"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { BarChart3 } from "lucide-react";
import { InventoryDashboardStats } from "@/lib/server-data";
import Link from "next/link";
import { useParams } from "next/navigation";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface ValueByCategoryChartProps {
  data: InventoryDashboardStats["valueByCategory"];
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return value.toFixed(0);
}

export default function ValueByCategoryChart({
  data,
}: ValueByCategoryChartProps) {
  const params = useParams();
  const domain = params.domain as string;

  if (data.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-blue-500" />
          </div>
          <h3 className="text-lg font-bold">Valore inventario per categoria</h3>
        </div>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          Nessun dato disponibile
        </div>
      </div>
    );
  }

  // Take top 10 categories
  const topCategories = data.slice(0, 10);

  const chartOptions: ApexOptions = {
    chart: {
      type: "bar",
      height: 300,
      animations: {
        enabled: true,
        speed: 800,
      },
      toolbar: {
        show: false,
      },
      background: "transparent",
      events: {
        dataPointSelection: (event, chartContext, config) => {
          const categoryIndex = config.dataPointIndex;
          const category = topCategories[categoryIndex];
          if (category?.categoryId) {
            window.location.href = `/sites/${domain}/inventory?categoryId=${category.categoryId}`;
          }
        },
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        borderRadiusApplication: "end",
        barHeight: "70%",
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
      categories: topCategories.map((d) => d.category),
      labels: {
        style: {
          colors: "#a1a1aa",
          fontSize: "12px",
        },
        formatter: (value) => `CHF ${formatCurrency(Number(value))}`,
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
      y: {
        formatter: (value) => `CHF ${formatCurrency(value)}`,
      },
    },
    colors: ["#3b82f6"],
  };

  const chartSeries = [
    {
      name: "Valore",
      data: topCategories.map((d) => d.value),
    },
  ];

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Valore inventario per categoria</h3>
          <p className="text-xs text-muted-foreground">
            Top 10 categorie per valore in CHF
          </p>
        </div>
      </div>

      <ReactApexChart
        options={chartOptions}
        series={chartSeries}
        type="bar"
        height={300}
      />
    </div>
  );
}
