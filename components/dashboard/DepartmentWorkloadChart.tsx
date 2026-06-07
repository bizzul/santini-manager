"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { BarChart3 } from "lucide-react";
import {
  CHART_SERIES_COLORS,
  chartColorAt,
  getChartAxisColor,
  getChartGridColor,
} from "@/lib/charts/theme";
import { DashboardStats } from "@/lib/server-data";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface DepartmentWorkloadChartProps {
  data: DashboardStats;
}

const DEPARTMENT_COLORS: { [key: string]: string } = {
  Vendita: CHART_SERIES_COLORS[0],
  AVOR: CHART_SERIES_COLORS[2],
  Produzione: CHART_SERIES_COLORS[3],
  "Prod.": CHART_SERIES_COLORS[3],
  Install: CHART_SERIES_COLORS[4],
  "Install.": CHART_SERIES_COLORS[4],
  Service: CHART_SERIES_COLORS[5],
};

export default function DepartmentWorkloadChart({
  data,
}: DepartmentWorkloadChartProps) {
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
          colors: getChartAxisColor(),
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
          colors: getChartAxisColor(),
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
      borderColor: getChartGridColor(),
      strokeDashArray: 3,
    },
    tooltip: {
      theme: "dark",
      y: {
        formatter: (value) => `${value} commesse`,
      },
    },
    colors: sortedData.map(
      (d, i) => DEPARTMENT_COLORS[d.department] || chartColorAt(i)
    ),
  };

  const chartSeries = [
    {
      name: "Commesse",
      data: sortedData.map((d) => d.count),
    },
  ];

  return (
    <div className="dashboard-panel p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="dashboard-panel-title">Lavori per Reparto</h3>
            <p className="dashboard-panel-subtitle">
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
