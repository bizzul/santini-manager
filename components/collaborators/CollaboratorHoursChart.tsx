"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { cn } from "@/lib/utils";
import {
  chartColorAt,
  getChartAxisColor,
  getChartGridColor,
} from "@/lib/charts/theme";
import type { HoursBucket } from "@/lib/collaborator-dashboard.server";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full animate-pulse rounded-md bg-muted" />
  ),
});

interface CollaboratorHoursChartProps {
  perMonth: HoursBucket[];
  perWeek: HoursBucket[];
}

type Mode = "month" | "week";

/** Worked-hours bar chart with a month/week toggle. */
export function CollaboratorHoursChart({
  perMonth,
  perWeek,
}: CollaboratorHoursChartProps) {
  const [mode, setMode] = useState<Mode>("month");
  const data = mode === "month" ? perMonth : perWeek;

  const axisColor = getChartAxisColor();
  const gridColor = getChartGridColor();
  const labelStyle = { colors: axisColor, fontSize: "11px", fontWeight: 600 };

  const options: ApexOptions = {
    chart: {
      type: "bar",
      height: 300,
      toolbar: { show: false },
      background: "transparent",
      animations: { enabled: true, speed: 600 },
    },
    colors: [chartColorAt(0)],
    plotOptions: {
      bar: { columnWidth: "55%", borderRadius: 4, borderRadiusApplication: "end" },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: data.map((bucket) => bucket.label),
      labels: { style: labelStyle, rotate: -25, trim: true },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: labelStyle,
        formatter: (value: number) => `${Math.round(value)}h`,
      },
      min: 0,
      forceNiceScale: true,
    },
    grid: { borderColor: gridColor, strokeDashArray: 4 },
    tooltip: {
      theme: "dark",
      y: { formatter: (value: number) => `${value.toFixed(2)} ore` },
    },
  };

  const series = [
    { name: "Ore lavorate", data: data.map((bucket) => bucket.hours) },
  ];

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label="Periodo del grafico ore"
        className="inline-flex items-center gap-1 rounded-lg border bg-muted p-1"
      >
        {(
          [
            { value: "month", label: "Per mese" },
            { value: "week", label: "Per settimana" },
          ] as Array<{ value: Mode; label: string }>
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={mode === option.value}
            onClick={() => setMode(option.value)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              mode === option.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <ReactApexChart
        key={mode}
        options={options}
        series={series}
        type="bar"
        height={300}
        width="100%"
      />
    </div>
  );
}

export default CollaboratorHoursChart;
