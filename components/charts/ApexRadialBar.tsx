"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import {
  BRAND_DEFAULT_COLOR,
  getChartAxisColor,
} from "@/lib/charts/theme";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface ApexRadialBarProps {
  value: number;
  label: string;
  color?: string;
  height?: number;
  theme?: "light" | "dark";
}

export default function ApexRadialBar({
  value,
  label,
  color = BRAND_DEFAULT_COLOR,
  height = 250,
  theme = "dark",
}: ApexRadialBarProps) {
  const options: ApexOptions = {
    chart: {
      height: height,
      type: "radialBar",
      animations: {
        enabled: true,
        speed: 1500,
        animateGradually: {
          enabled: true,
          delay: 200,
        },
        dynamicAnimation: {
          enabled: true,
          speed: 500,
        },
      },
    },
    plotOptions: {
      radialBar: {
        hollow: {
          size: "60%",
        },
        dataLabels: {
          name: {
            show: true,
            fontSize: "16px",
            fontWeight: 600,
            color: getChartAxisColor(),
            offsetY: -10,
          },
          value: {
            show: true,
            fontSize: "28px",
            fontWeight: 700,
            color: theme === "dark" ? "#fff" : "#000",
            offsetY: 5,
            formatter: (val) => {
              return val.toFixed(0) + "%";
            },
          },
        },
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: "dark",
        type: "horizontal",
        shadeIntensity: 0.5,
        gradientToColors: [color],
        inverseColors: true,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 100],
      },
    },
    colors: [color],
    labels: [label],
    stroke: {
      lineCap: "round",
    },
  };

  return (
    <ReactApexChart
      options={options}
      series={[value]}
      type="radialBar"
      height={height}
    />
  );
}
