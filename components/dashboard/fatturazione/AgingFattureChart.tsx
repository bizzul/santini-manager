"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { BarChart3 } from "lucide-react";
import { FatturazioneDashboardStats } from "@/lib/server-data";
import Link from "next/link";
import { useParams } from "next/navigation";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface AgingFattureChartProps {
  data: FatturazioneDashboardStats["agingData"];
  invoiceKanbanId: number | null;
}

function formatCHF(value: number): string {
  return new Intl.NumberFormat("it-CH", {
    style: "currency",
    currency: "CHF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AgingFattureChart({
  data,
  invoiceKanbanId,
}: AgingFattureChartProps) {
  const params = useParams();
  const domain = params.domain as string;

  const hasData = data.some((d) => d.amount > 0 || d.count > 0);

  if (!hasData) {
    return (
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-amber-500" />
          </div>
          <h3 className="text-lg font-bold">Aging fatture</h3>
        </div>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          Nessuna fattura aperta
        </div>
      </div>
    );
  }

  const chartSeries = [
    {
      name: "Importo",
      data: data.map((d) => d.amount),
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
          if (invoiceKanbanId) {
            const bucket = data[config.dataPointIndex]?.bucket;
            if (bucket) {
              window.location.href = `/sites/${domain}/kanban?kanbanId=${invoiceKanbanId}&aging=${encodeURIComponent(
                bucket
              )}`;
            }
          }
        },
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 6,
        borderRadiusApplication: "end",
        columnWidth: "60%",
        distributed: true,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (value: number) => formatCHF(value),
      style: {
        fontSize: "11px",
        colors: ["#fff"],
      },
      offsetY: -20,
    },
    stroke: {
      show: true,
      width: 1,
      colors: ["transparent"],
    },
    xaxis: {
      categories: data.map((d) => `${d.bucket} giorni`),
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
        formatter: (value) => formatCHF(value),
      },
    },
    fill: {
      opacity: 1,
    },
    grid: {
      show: true,
      borderColor: "#3f3f46",
      strokeDashArray: 3,
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    tooltip: {
      theme: "dark",
      y: {
        formatter: (value, { dataPointIndex }) => {
          const count = data[dataPointIndex]?.count || 0;
          return `${formatCHF(value)} (${count} fatture)`;
        },
      },
    },
    legend: {
      show: false,
    },
    colors: ["#22c55e", "#eab308", "#f97316", "#ef4444"],
  };

  const kanbanHref = invoiceKanbanId
    ? `/sites/${domain}/kanban?kanbanId=${invoiceKanbanId}`
    : "#";

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Aging fatture</h3>
            <p className="text-xs text-muted-foreground">
              Fatture aperte per scadenza
            </p>
          </div>
        </div>
        {invoiceKanbanId && (
          <Link
            href={kanbanHref}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Apri Fatture →
          </Link>
        )}
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
