"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import {
  getChartAxisColor,
  getChartGridColor,
  CHART_SERIES_COLORS,
} from "@/lib/charts/theme";
import type { TreemapLetturaRow } from "@/lib/treemap-data";
import { Skeleton } from "@/components/ui/skeleton";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface SensorReadingChartProps {
  label: string;
  unit: string;
  readings: TreemapLetturaRow[];
  loading?: boolean;
  color?: string;
}

export default function SensorReadingChart({
  label,
  unit,
  readings,
  loading = false,
  color = CHART_SERIES_COLORS[0],
}: SensorReadingChartProps) {
  if (loading) {
    return <Skeleton className="h-[220px] w-full rounded-lg" />;
  }

  if (readings.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
        Nessuna lettura negli ultimi 30 giorni
      </div>
    );
  }

  const chartOptions: ApexOptions = {
    chart: {
      type: "area",
      height: 220,
      toolbar: { show: false },
      background: "transparent",
      animations: { enabled: true, speed: 400 },
    },
    stroke: { curve: "smooth", width: 2, colors: [color] },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.05,
        stops: [0, 100],
      },
    },
    colors: [color],
    dataLabels: { enabled: false },
    xaxis: {
      type: "datetime",
      labels: {
        style: { colors: getChartAxisColor(), fontSize: "11px" },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: getChartAxisColor(), fontSize: "11px" },
        formatter: (v) => `${Number(v).toFixed(1)}`,
      },
    },
    grid: {
      borderColor: getChartGridColor(),
      strokeDashArray: 4,
    },
    tooltip: {
      x: { format: "dd MMM yyyy HH:mm" },
      y: { formatter: (v) => `${Number(v).toFixed(2)} ${unit}` },
    },
    markers: { size: 0, hover: { size: 4 } },
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <ReactApexChart
        type="area"
        height={220}
        options={chartOptions}
        series={[
          {
            name: label,
            data: readings.map((r) => ({
              x: new Date(r.misurato_at).getTime(),
              y: r.valore,
            })),
          },
        ]}
      />
    </div>
  );
}
