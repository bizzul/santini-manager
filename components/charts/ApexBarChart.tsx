"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface ApexBarChartProps {
  categories: string[];
  series: {
    name: string;
    data: number[];
    color?: string;
  }[];
  height?: number;
  horizontal?: boolean;
  stacked?: boolean;
  dataLabels?: boolean;
  theme?: "light" | "dark";
  gradient?: boolean;
}

export default function ApexBarChart({
  categories,
  series,
  height = 350,
  horizontal = false,
  stacked = false,
  dataLabels = true,
  theme = "dark",
  gradient = true,
}: ApexBarChartProps) {
  const options: ApexOptions = {
    chart: {
      type: "bar",
      height: height,
      stacked: stacked,
      animations: {
        enabled: true,
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150,
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350,
        },
      },
      toolbar: {
        show: false,
      },
      background: "transparent",
    },
    plotOptions: {
      bar: {
        horizontal: horizontal,
        borderRadius: 8,
        borderRadiusApplication: "end",
        columnWidth: "70%",
        dataLabels: {
          position: "top",
        },
      },
    },
    dataLabels: {
      enabled: dataLabels,
      offsetY: horizontal ? 0 : -20,
      offsetX: horizontal ? 10 : 0,
      style: {
        fontSize: "12px",
        fontWeight: "bold",
        colors: [theme === "dark" ? "#fff" : "#000"],
      },
    },
    xaxis: {
      categories: categories,
      labels: {
        style: {
          colors: theme === "dark" ? "#a1a1aa" : "#71717a",
          fontSize: "11px",
        },
        rotate: categories.length > 6 ? -45 : 0,
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
          colors: theme === "dark" ? "#a1a1aa" : "#71717a",
          fontSize: "11px",
        },
        formatter: (value) => {
          if (value >= 1000) {
            return (value / 1000).toFixed(0) + "k";
          }
          return value.toFixed(0);
        },
      },
    },
    fill: {
      type: gradient ? "gradient" : "solid",
      gradient: {
        shade: "dark",
        type: "vertical",
        shadeIntensity: 0.5,
        gradientToColors: undefined,
        inverseColors: true,
        opacityFrom: 0.85,
        opacityTo: 0.85,
        stops: [0, 100],
      },
    },
    grid: {
      borderColor: theme === "dark" ? "#27272a" : "#e4e4e7",
      strokeDashArray: 4,
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    legend: {
      position: "top",
      horizontalAlign: "left",
      labels: {
        colors: theme === "dark" ? "#a1a1aa" : "#71717a",
      },
    },
    tooltip: {
      theme: theme,
      y: {
        formatter: (value) => {
          return value.toLocaleString("it-CH");
        },
      },
    },
    colors: series.map((s) => s.color || "#3b82f6"),
  };

  return (
    <ReactApexChart
      options={options}
      series={series}
      type="bar"
      height={height}
    />
  );
}

