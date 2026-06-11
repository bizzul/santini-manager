"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { cn } from "@/lib/utils";
import {
  chartColorAt,
  getChartAxisColor,
  getChartGridColor,
} from "@/lib/charts/theme";
import type { WbsColumnStat } from "@/lib/wbs-data";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="h-[380px] w-full animate-pulse rounded-md bg-muted" />
  ),
});

const CHART_HEIGHT = 380;
/** Bar grow animation length (ms). */
const ANIMATION_MS = 1000;
/** The per-column values legend appears in the following second. */
const VALUES_DELAY_MS = ANIMATION_MS + 200;

/**
 * Standard width (px) reserved for each kanban column, applied to every chart
 * regardless of the number of columns. Each value card below the chart is
 * exactly this wide so it lines up with its column of bars.
 */
const COLUMN_WIDTH = 150;
/** Horizontal space taken by the left (counts) and right (CHF) Y axes. */
const LEFT_AXIS_WIDTH = 64;
const RIGHT_AXIS_WIDTH = 64;

interface KanbanColumnsChartProps {
  /** One stat entry per kanban column, in board order. */
  data: WbsColumnStat[];
}

function formatChf(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toFixed(0);
}

const chfFull = new Intl.NumberFormat("it-CH", { maximumFractionDigits: 0 });

/**
 * Column histogram mirroring a kanban board on the X axis: for each kanban
 * column three bars — number of projects (cards), total pieces and total
 * commercial value (CHF, separate right axis).
 *
 * On mount the bars grow from zero (~1s); right after, a values legend per
 * column fades in below the chart.
 */
export function KanbanColumnsChart({ data }: KanbanColumnsChartProps) {
  const [showValues, setShowValues] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setShowValues(true),
      VALUES_DELAY_MS
    );
    return () => window.clearTimeout(timeout);
  }, []);

  const axisColor = getChartAxisColor();
  const gridColor = getChartGridColor();
  const labelStyle = {
    colors: axisColor,
    fontSize: "12px",
    fontWeight: 600,
  };

  const colors = [chartColorAt(0), chartColorAt(3), chartColorAt(1)];

  // Fixed plot width: one standard slot per column, plus the two Y axes.
  const plotWidth = data.length * COLUMN_WIDTH;
  const chartWidth = LEFT_AXIS_WIDTH + plotWidth + RIGHT_AXIS_WIDTH;

  const series = [
    { name: "Progetti", data: data.map((column) => column.tasks) },
    { name: "Pezzi", data: data.map((column) => column.pieces) },
    { name: "Valore CHF", data: data.map((column) => column.value) },
  ];

  const options: ApexOptions = {
    chart: {
      type: "bar",
      height: CHART_HEIGHT,
      toolbar: { show: false },
      background: "transparent",
      animations: {
        enabled: true,
        speed: ANIMATION_MS,
        animateGradually: { enabled: false },
      },
    },
    colors,
    plotOptions: {
      bar: {
        columnWidth: "70%",
        borderRadius: 4,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 1, colors: ["transparent"] },
    xaxis: {
      categories: data.map((column) => column.label),
      labels: { style: labelStyle, rotate: -25, trim: true },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: [
      {
        seriesName: "Progetti",
        title: {
          text: "Conteggi",
          style: { color: axisColor, fontSize: "12px" },
        },
        labels: {
          style: labelStyle,
          formatter: (value: number) => `${Math.round(value)}`,
        },
        min: 0,
        forceNiceScale: true,
      },
      { seriesName: "Progetti", show: false },
      {
        seriesName: "Valore CHF",
        opposite: true,
        title: {
          text: "CHF",
          style: { color: axisColor, fontSize: "12px" },
        },
        labels: {
          style: labelStyle,
          formatter: (value: number) => formatChf(value),
        },
        min: 0,
        forceNiceScale: true,
      },
    ],
    grid: {
      borderColor: gridColor,
      strokeDashArray: 4,
    },
    legend: {
      position: "top",
      horizontalAlign: "left",
      labels: { colors: axisColor },
      markers: { size: 6 },
    },
    tooltip: {
      shared: true,
      intersect: false,
      theme: "dark",
      y: {
        formatter: (value: number, { seriesIndex }) =>
          seriesIndex === 2
            ? `CHF ${chfFull.format(value)}`
            : `${Math.round(value)}`,
      },
    },
  };

  return (
    <div className="overflow-x-auto">
      {/* Fixed-width canvas so columns keep a standard size on every chart. */}
      <div className="space-y-3" style={{ width: chartWidth }}>
        <ReactApexChart
          options={options}
          series={series}
          type="bar"
          height={CHART_HEIGHT}
          width={chartWidth}
        />

        {/* Per-column value cards, aligned 1:1 with the columns of bars. */}
        <div
          aria-hidden={!showValues}
          className={cn(
            "flex transition-opacity duration-500",
            showValues ? "opacity-100" : "opacity-0"
          )}
          style={{
            paddingLeft: LEFT_AXIS_WIDTH,
            paddingRight: RIGHT_AXIS_WIDTH,
          }}
        >
          {data.map((column) => (
            <div
              key={column.label}
              className="shrink-0 px-1"
              style={{ width: COLUMN_WIDTH }}
            >
              <div className="h-full rounded-lg border bg-card/60 px-3 py-2">
                <p className="truncate text-xs font-semibold text-foreground">
                  {column.label}
                </p>
                <dl className="mt-1 space-y-0.5 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className="h-2 w-2 rounded-sm"
                        style={{ backgroundColor: colors[0] }}
                      />
                      Progetti
                    </dt>
                    <dd className="font-semibold text-foreground">
                      {column.tasks}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className="h-2 w-2 rounded-sm"
                        style={{ backgroundColor: colors[1] }}
                      />
                      Pezzi
                    </dt>
                    <dd className="font-semibold text-foreground">
                      {column.pieces}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className="h-2 w-2 rounded-sm"
                        style={{ backgroundColor: colors[2] }}
                      />
                      Valore
                    </dt>
                    <dd className="font-semibold text-foreground">
                      CHF {chfFull.format(column.value)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default KanbanColumnsChart;
