"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { BarChart3 } from "lucide-react";
import { ProduzioneDashboardStats } from "@/lib/server-data";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface CaricoRepartoChartProps {
  data: ProduzioneDashboardStats["kanbanStatus"];
  domain: string;
}

export default function CaricoRepartoChart({
  data,
  domain,
}: CaricoRepartoChartProps) {
  if (data.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-green-500" />
          </div>
          <h3 className="text-lg font-bold">Carico per reparto</h3>
        </div>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          Nessun dato disponibile
        </div>
      </div>
    );
  }

  const chartSeries = [
    {
      name: "Aperti",
      data: data.map((d) => d.lavori),
    },
    {
      name: "In ritardo",
      data: data.map((d) => d.ritardo),
    },
  ];

  const chartOptions: ApexOptions = {
    chart: {
      type: "bar",
      height: 300,
      stacked: false,
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
          const kanban = data[config.dataPointIndex];
          if (kanban?.kanbanIdentifier) {
            window.location.href = `/sites/${domain}/kanban?name=${kanban.kanbanIdentifier}`;
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
      enabled: false,
    },
    stroke: {
      show: true,
      width: 1,
      colors: ["transparent"],
    },
    xaxis: {
      categories: data.map((d) => d.kanbanName),
      labels: {
        style: {
          colors: "#a1a1aa",
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
          colors: "#a1a1aa",
          fontSize: "12px",
        },
      },
    },
    fill: {
      opacity: 1,
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
      shared: true,
      intersect: false,
      y: {
        formatter: (value) => `${value} lavori`,
      },
    },
    legend: {
      position: "bottom",
      horizontalAlign: "center",
      markers: {
        size: 8,
        shape: "circle",
      },
      labels: {
        colors: "#a1a1aa",
      },
      itemMargin: {
        horizontal: 8,
      },
    },
    colors: ["#22c55e", "#ef4444"],
  };

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-green-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Carico per reparto</h3>
          <p className="text-xs text-muted-foreground">
            Lavori aperti e in ritardo per reparto produzione
          </p>
        </div>
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
