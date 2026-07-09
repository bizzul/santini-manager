"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { getChartAxisColor, getChartGridColor } from "@/lib/charts/theme";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface BalanceRadarProps {
  categories: string[];
  scores: number[];
  accent?: string;
}

/** Radar chart del bilanciamento vita (punteggi 0-10 per area visibile). */
export function BalanceRadar({ categories, scores, accent = "#6366f1" }: BalanceRadarProps) {
  const options: ApexOptions = {
    chart: {
      type: "radar",
      toolbar: { show: false },
      background: "transparent",
    },
    xaxis: {
      categories,
      labels: {
        style: {
          colors: categories.map(() => getChartAxisColor()),
          fontSize: "10px",
        },
      },
    },
    yaxis: {
      min: 0,
      max: 10,
      tickAmount: 5,
      labels: { show: false },
    },
    fill: { opacity: 0.25, colors: [accent] },
    stroke: { width: 2, colors: [accent] },
    markers: { size: 3, colors: [accent] },
    colors: [accent],
    plotOptions: {
      radar: {
        polygons: {
          strokeColors: getChartGridColor(),
          connectorColors: getChartGridColor(),
        },
      },
    },
    tooltip: { theme: "dark", y: { formatter: (v) => `${v}/10` } },
  };

  return (
    <ReactApexChart
      options={options}
      series={[{ name: "Punteggio", data: scores }]}
      type="radar"
      height={320}
    />
  );
}
