"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { TrendingUp } from "lucide-react";
import {
  chartColorAt,
  getChartAxisColor,
  getChartGridColor,
} from "@/lib/charts/theme";
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
  const points = data.pipelineData;
  const hasPartialMonth = points.some((point) => point.isPartial);
  const categories = points.map((point) =>
    point.isPartial ? `${point.month} · in corso` : point.month,
  );

  const completeSeries = points.map((point) => {
    if (point.isPartial) return null;
    return point.value;
  });
  const partialSeries = points.map((point, index) => {
    if (point.isPartial) return point.value;
    if (points[index + 1]?.isPartial) return point.value;
    return null;
  });

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
      width: hasPartialMonth ? [2, 2] : 2,
      dashArray: hasPartialMonth ? [0, 6] : 0,
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
      categories,
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
        formatter: (value) => `${formatCurrency(value)}`,
      },
    },
    legend: {
      show: hasPartialMonth,
      labels: {
        colors: getChartAxisColor(),
      },
    },
    grid: {
      show: true,
      borderColor: getChartGridColor(),
      strokeDashArray: 3,
    },
    tooltip: {
      theme: "dark",
      y: {
        formatter: (value, opts) => {
          const point = points[opts.dataPointIndex];
          const amount = `CHF ${formatCurrency(value)}`;
          return point?.isPartial ? `${amount} (mese parziale)` : amount;
        },
      },
    },
    colors: [chartColorAt(0), "#93c5fd"],
  };

  const chartSeries = hasPartialMonth
    ? [
        {
          name: "Valore Offerte",
          data: completeSeries,
        },
        {
          name: "Mese in corso",
          data: partialSeries,
        },
      ]
    : [
        {
          name: "Valore Offerte",
          data: points.map((point) => point.value),
        },
      ];

  return (
    <div className="dashboard-panel p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="dashboard-panel-title">Pipeline Globale</h3>
            <p className="dashboard-panel-subtitle">
              {hasPartialMonth
                ? "Andamento valori offerti negli ultimi 6 mesi · mese in corso parziale"
                : "Andamento valori offerti negli ultimi 6 mesi"}
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
