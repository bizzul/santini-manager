"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { BarChart3 } from "lucide-react";
import { InterniDashboardStats } from "@/lib/server-data";
import Link from "next/link";
import { useParams } from "next/navigation";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface OreInterneChartProps {
  data: InterniDashboardStats["categoriaData"];
}

export default function OreInterneChart({ data }: OreInterneChartProps) {
  const params = useParams();
  const domain = params.domain as string;

  if (data.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-purple-500" />
          </div>
          <h3 className="text-lg font-bold">Ore interne per categoria</h3>
        </div>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          Nessun dato disponibile
        </div>
      </div>
    );
  }

  const chartSeries = [
    {
      name: "Ore",
      data: data.map((d) => d.ore),
    },
  ];

  const chartOptions: ApexOptions = {
    chart: {
      type: "bar",
      height: 300,
      animations: {
        enabled: true,
        speed: 800,
      },
      toolbar: {
        show: false,
      },
      background: "transparent",
      events: {
        dataPointSelection: (_event, _chartContext, config) => {
          const categoria = data[config.dataPointIndex]?.categoria;
          if (categoria) {
            window.location.href = `/sites/${domain}/timetracking?activity=${encodeURIComponent(
              categoria
            )}`;
          }
        },
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        borderRadiusApplication: "end",
        barHeight: "70%",
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (value: number) => `${value}h`,
      style: {
        fontSize: "11px",
        colors: ["#fff"],
      },
    },
    stroke: {
      show: true,
      width: 1,
      colors: ["transparent"],
    },
    xaxis: {
      categories: data.map((d) => d.categoria),
      labels: {
        style: {
          colors: "#a1a1aa",
          fontSize: "12px",
        },
        formatter: (value) => `${value}h`,
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
          colors: "#a1a1aa",
          fontSize: "12px",
        },
      },
    },
    fill: {
      opacity: 1,
      type: "gradient",
      gradient: {
        shade: "dark",
        type: "horizontal",
        shadeIntensity: 0.5,
        gradientToColors: ["#818cf8"],
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 100],
      },
    },
    grid: {
      show: true,
      borderColor: "#3f3f46",
      strokeDashArray: 3,
      xaxis: {
        lines: {
          show: true,
        },
      },
      yaxis: {
        lines: {
          show: false,
        },
      },
    },
    tooltip: {
      theme: "dark",
      y: {
        formatter: (value) => `${value} ore`,
      },
    },
    legend: {
      show: false,
    },
    colors: ["#a855f7"],
  };

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Ore interne per categoria</h3>
            <p className="text-xs text-muted-foreground">
              Distribuzione ore lavori interni
            </p>
          </div>
        </div>
        <Link
          href={`/sites/${domain}/timetracking`}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Apri Report →
        </Link>
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
