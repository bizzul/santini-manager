"use client";

import { useState } from "react";
import { FileText, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function OffersCard() {
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  // Dati mockup
  const offersData = {
    week: {
      todo: 2,
      inProgress: 3,
      sent: 8,
      won: 4,
      lost: 5,
      totalValue: 45000,
    },
    month: {
      todo: 5,
      inProgress: 8,
      sent: 18,
      won: 12,
      lost: 8,
      totalValue: 187000,
    },
    year: {
      todo: 15,
      inProgress: 25,
      sent: 156,
      won: 98,
      lost: 72,
      totalValue: 2340000,
    },
  };

  const data = offersData[period];

  const chartOptions: ApexOptions = {
    chart: {
      type: "bar",
      height: 250,
      animations: {
        enabled: true,
        speed: 1000,
        animateGradually: {
          enabled: true,
          delay: 150,
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
        borderRadius: 12,
        borderRadiusApplication: "end",
        columnWidth: "70%",
        dataLabels: {
          position: "top",
        },
      },
    },
    dataLabels: {
      enabled: true,
      offsetY: -25,
      style: {
        fontSize: "16px",
        fontWeight: "bold",
        colors: ["#18181b"],
      },
      background: {
        enabled: true,
        foreColor: "#ffffff",
        borderRadius: 8,
        padding: 8,
        opacity: 0.95,
        borderWidth: 1,
        borderColor: "#d1d5db",
      },
      dropShadow: {
        enabled: false,
      },
    },
    xaxis: {
      categories: ["To do", "In elaborazione", "Inviate"],
      labels: {
        style: {
          colors: "#a1a1aa",
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
      type: "gradient",
      gradient: {
        shade: "dark",
        type: "vertical",
        shadeIntensity: 0.3,
        inverseColors: false,
        opacityFrom: 0.95,
        opacityTo: 0.95,
        stops: [0, 100],
      },
    },
    grid: {
      show: false,
    },
    legend: {
      show: false,
    },
    tooltip: {
      theme: "dark",
      y: {
        formatter: (value) => {
          return value + " offerte";
        },
      },
    },
    colors: ["#eab308", "#3b82f6", "#22c55e"],
  };

  const chartSeries = [
    {
      name: "Offerte",
      data: [data.todo, data.inProgress, data.sent],
    },
  ];

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6 col-span-2 lg:col-span-3">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Offerte</h3>
            <p className="text-sm text-muted-foreground">Gestione offerte</p>
          </div>
        </div>

        <Select
          value={period}
          onValueChange={(value: "week" | "month" | "year") => setPeriod(value)}
        >
          <SelectTrigger className="w-[140px] bg-white/10 border-white/20 backdrop-blur-sm">
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Settimana</SelectItem>
            <SelectItem value="month">Mese</SelectItem>
            <SelectItem value="year">Anno</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ApexCharts Column Chart */}
      <div className="mb-6">
        <ReactApexChart
          options={chartOptions}
          series={chartSeries}
          type="bar"
          height={250}
        />
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
        {/* Totale Valore */}
        <div className="backdrop-blur-sm bg-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <p className="text-xs text-muted-foreground font-medium">
              Valore Totale
            </p>
          </div>
          <p className="text-2xl font-bold">
            CHF {(data.totalValue / 1000).toFixed(0)}k
          </p>
        </div>

        {/* Vinte */}
        <div className="backdrop-blur-sm bg-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <p className="text-xs text-muted-foreground font-medium">Vinte</p>
          </div>
          <p className="text-2xl font-bold text-green-500">{data.won}</p>
        </div>

        {/* Perse */}
        <div className="backdrop-blur-sm bg-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-400" />
            <p className="text-xs text-muted-foreground font-medium">Perse</p>
          </div>
          <p className="text-2xl font-bold text-red-500">{data.lost}</p>
        </div>
      </div>
    </div>
  );
}
