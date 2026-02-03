"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { BarChart3 } from "lucide-react";
import { ProductsDashboardStats } from "@/lib/server-data";
import { useParams } from "next/navigation";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface ProductionCategoryChartProps {
  data: ProductsDashboardStats["production"]["elementsByCategory"];
}

export default function ProductionCategoryChart({
  data,
}: ProductionCategoryChartProps) {
  const params = useParams();
  const domain = params.domain as string;

  if (data.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-purple-500" />
          </div>
          <h3 className="text-lg font-bold">Elementi prodotti per categoria</h3>
        </div>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          Nessun dato disponibile
        </div>
      </div>
    );
  }

  // Take top 10 categories
  const topCategories = data.slice(0, 10);

  // Use category colors if available, otherwise use default palette
  const defaultColors = [
    "#a855f7",
    "#3b82f6",
    "#22c55e",
    "#f97316",
    "#ec4899",
    "#14b8a6",
    "#eab308",
    "#6366f1",
    "#ef4444",
    "#84cc16",
  ];

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
            window.location.href = `/sites/${domain}/projects?type=LAVORO&categoryId=${category.categoryId}`;
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
        distributed: true,
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
        formatter: (value) => `${value} elementi`,
      },
    },
    legend: {
      show: false,
    },
    colors: topCategories.map(
      (cat, i) => cat.color || defaultColors[i % defaultColors.length]
    ),
  };

  const chartSeries = [
    {
      name: "Elementi",
      data: topCategories.map((d) => d.elements),
    },
  ];

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-purple-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Elementi prodotti per categoria</h3>
          <p className="text-xs text-muted-foreground">
            Distribuzione produzione per famiglia prodotto
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
