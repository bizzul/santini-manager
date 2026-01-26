"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { BarChart3 } from "lucide-react";
import { DashboardStats } from "@/lib/server-data";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface DepartmentWorkloadChartProps {
  data: DashboardStats;
}

// Default colors for departments
const DEPARTMENT_COLORS: { [key: string]: string } = {
  Vendita: "#3b82f6",
  AVOR: "#f97316",
  Produzione: "#22c55e",
  "Prod.": "#22c55e",
  Install: "#8b5cf6",
  "Install.": "#8b5cf6",
  Service: "#ec4899",
  Altro: "#6b7280",
};

export default function DepartmentWorkloadChart({
  data,
}: DepartmentWorkloadChartProps) {
  // Sort departments by count descending
  const sortedData = [...data.departmentWorkload].sort(
    (a, b) => b.count - a.count
  );

  const chartOptions: ApexOptions = {
    chart: {
      type: "bar",
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
    plotOptions: {
      bar: {
        borderRadius: 8,
        borderRadiusApplication: "end",
        horizontal: true,
        dataLabels: {
          position: "right",
        },
      },
    },
    dataLabels: {
      enabled: true,
      offsetX: 10,
      style: {
        fontSize: "12px",
        fontWeight: "bold",
        colors: ["#18181b"],
      },
      background: {
        enabled: true,
        foreColor: "#ffffff",
        borderRadius: 4,
        padding: 4,
        opacity: 0.95,
        borderWidth: 1,
        borderColor: "#d1d5db",
      },
    },
    xaxis: {
      categories: sortedData.map((d) => d.department),
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
      type: "solid",
      opacity: 0.95,
    },
    grid: {
      show: true,
      borderColor: "#3f3f46",
      strokeDashArray: 3,
    },
    tooltip: {
      theme: "dark",
      y: {
        formatter: (value) => `${value} commesse`,
      },
    },
    colors: sortedData.map(
      (d) => DEPARTMENT_COLORS[d.department] || "#6b7280"
    ),
  };

  const chartSeries = [
    {
      name: "Commesse",
      data: sortedData.map((d) => d.count),
    },
  ];

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Lavori per Reparto</h3>
            <p className="text-sm text-muted-foreground">
              Carico attuale numero commesse
            </p>
          </div>
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
