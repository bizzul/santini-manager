"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface ApexColumnChartProps {
  categories: string[];
  series: {
    name: string;
    data: number[];
    color?: string;
  }[];
  height?: number;
  theme?: "light" | "dark";
  gradient?: boolean;
  showGrid?: boolean;
}

export default function ApexColumnChart({
  categories,
  series,
  height = 300,
  theme = "dark",
  gradient = true,
  showGrid = true,
}: ApexColumnChartProps) {
  const options: ApexOptions = {
    chart: {
      type: "bar",
      height: height,
      animations: {
        enabled: true,
        speed: 1000,
        animateGradually: {
          enabled: true,
          delay: 200,
        },
        dynamicAnimation: {
          enabled: true,
          speed: 400,
        },
      },
      toolbar: {
        show: false,
      },
      background: "transparent",
    },
    plotOptions: {
      bar: {
        borderRadius: 10,
        borderRadiusApplication: "end",
        columnWidth: "60%",
        dataLabels: {
          position: "top",
        },
      },
    },
    dataLabels: {
      enabled: true,
      offsetY: -25,
      style: {
        fontSize: "14px",
        fontWeight: "bold",
        colors: [theme === "dark" ? "#fff" : "#000"],
      },
      background: {
        enabled: true,
        foreColor: theme === "dark" ? "#fff" : "#000",
        borderRadius: 6,
        padding: 6,
        opacity: 0.8,
        borderWidth: 0,
      },
    },
    xaxis: {
      categories: categories,
      labels: {
        style: {
          colors: theme === "dark" ? "#a1a1aa" : "#71717a",
          fontSize: "12px",
          fontWeight: 600,
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
      show: false,
    },
    fill: {
      type: gradient ? "gradient" : "solid",
      gradient: {
        shade: "dark",
        type: "vertical",
        shadeIntensity: 0.3,
        gradientToColors: undefined,
        inverseColors: true,
        opacityFrom: 0.95,
        opacityTo: 0.95,
        stops: [0, 100],
      },
    },
    grid: {
      show: showGrid,
      borderColor: theme === "dark" ? "#27272a" : "#e4e4e7",
      strokeDashArray: 4,
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: showGrid,
        },
      },
    },
    legend: {
      show: false,
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

