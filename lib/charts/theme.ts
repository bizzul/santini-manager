import type { ApexOptions } from "apexcharts";

/** Fallback hex values matching globals.css chart tokens (for SSR / Apex). */
export const CHART_SERIES_COLORS = [
  "#3b82f6",
  "#eab308",
  "#f97316",
  "#22c55e",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f43f5e",
  "#6366f1",
  "#84cc16",
] as const;

export const CHART_AXIS_COLOR = "#a1a1aa";
export const CHART_GRID_COLOR = "#3f3f46";
export const BRAND_DEFAULT_COLOR = "#3b82f6";

function readCssHslVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  if (!raw) return fallback;
  return `hsl(${raw})`;
}

/** Resolve chart series colors from CSS variables at runtime. */
export function getChartSeriesColors(): string[] {
  if (typeof document === "undefined") {
    return [...CHART_SERIES_COLORS];
  }
  return Array.from({ length: 10 }, (_, i) =>
    readCssHslVar(`--chart-${i + 1}`, CHART_SERIES_COLORS[i] ?? CHART_SERIES_COLORS[0])
  );
}

export function getChartAxisColor(): string {
  return readCssHslVar("--chart-axis", CHART_AXIS_COLOR);
}

export function getChartGridColor(): string {
  return readCssHslVar("--chart-grid", CHART_GRID_COLOR);
}

export function getBrandDefaultColor(): string {
  return readCssHslVar("--brand-default", BRAND_DEFAULT_COLOR);
}

/** Pick a series color by index (wraps around the palette). */
export function chartColorAt(index: number): string {
  const colors = getChartSeriesColors();
  return colors[index % colors.length] ?? BRAND_DEFAULT_COLOR;
}

/** Shared Apex axis / grid styling from design tokens. */
export function apexAxisTheme(): Pick<ApexOptions, "xaxis" | "yaxis" | "grid"> {
  const axisColor = getChartAxisColor();
  const gridColor = getChartGridColor();
  const labelStyle = {
    colors: axisColor,
    fontSize: "11px",
    fontWeight: 600,
  };

  return {
    xaxis: {
      labels: { style: labelStyle },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: labelStyle },
    },
    grid: {
      borderColor: gridColor,
      strokeDashArray: 4,
    },
  };
}
