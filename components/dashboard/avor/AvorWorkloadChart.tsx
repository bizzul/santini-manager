"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { BarChart3 } from "lucide-react";
import { AvorDashboardStats } from "@/lib/server-data";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface AvorWorkloadChartProps {
  data: AvorDashboardStats["workloadData"];
  columnNames: string[];
}

export default function AvorWorkloadChart({
  data,
  columnNames,
}: AvorWorkloadChartProps) {
  if (data.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-blue-500" />
          </div>
          <h3 className="text-lg font-bold">Carico di lavoro per tipologia</h3>
        </div>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          Nessun dato disponibile
        </div>
      </div>
    );
  }

  // Create series for stacked bar chart
  // Each series is a column, data points are categories
  const chartSeries = columnNames.map((colName) => ({
    name: colName,
    data: data.map((cat) => {
      const colData = cat.columns.find((c) => c.columnName === colName);
      return colData?.count || 0;
    }),
  }));

  const chartOptions: ApexOptions = {
    chart: {
      type: "bar",
      height: 300,
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
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        borderRadiusApplication: "end",
        borderRadiusWhenStacked: "last",
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
      y: {
        formatter: (value) => `${value} pratiche`,
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
    // Generate colors for columns - use a gradient of blues/oranges
    colors: [
      "#3b82f6", // blue
      "#f97316", // orange
      "#22c55e", // green
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
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Carico di lavoro per tipologia</h3>
          <p className="text-xs text-muted-foreground">
            Pratiche per categoria e colonna
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
