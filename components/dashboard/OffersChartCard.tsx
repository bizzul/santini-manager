"use client";

import { FileText } from "lucide-react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function OffersChartCard() {
  // Dati mockup per offerte per reparto
  const departments = [
    {
      name: "Arredamento",
      color: "#3b82f6",
      offers: 8,
      value: 156000,
      bgLight: "bg-blue-500/20",
      textColor: "text-blue-500",
    },
    {
      name: "Serramenti",
      color: "#eab308",
      offers: 5,
      value: 89000,
      bgLight: "bg-yellow-500/20",
      textColor: "text-yellow-500",
    },
    {
      name: "Porte",
      color: "#f97316",
      offers: 12,
      value: 234000,
      bgLight: "bg-orange-500/20",
      textColor: "text-orange-500",
    },
    {
      name: "Service",
      color: "#22c55e",
      offers: 3,
      value: 45000,
      bgLight: "bg-green-500/20",
      textColor: "text-green-500",
    },
  ];

  const totalOffers = departments.reduce((sum, dept) => sum + dept.offers, 0);
  const totalValue = departments.reduce((sum, dept) => sum + dept.value, 0);

  const chartOptions: ApexOptions = {
    chart: {
      type: "bar",
      height: 280,
      animations: {
        enabled: true,
        speed: 1200,
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
        colors: ["#18181b"],
      },
      background: {
        enabled: true,
        foreColor: "#ffffff",
        borderRadius: 6,
        padding: 6,
        opacity: 0.95,
        borderWidth: 1,
        borderColor: "#d1d5db",
      },
      dropShadow: {
        enabled: false,
      },
    },
    xaxis: {
      categories: departments.map((d) => d.name),
      labels: {
        style: {
          colors: "#a1a1aa",
          fontSize: "11px",
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
        gradientToColors: departments.map((d) => d.color),
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
    colors: departments.map((d) => d.color),
  };

  const chartSeries = [
    {
      name: "Offerte",
      data: departments.map((d) => d.offers),
    },
  ];

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6 relative overflow-hidden">
      {/* Header */}
      <div className="space-y-2 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Offerte totali</h3>
            <div className="backdrop-blur-sm bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-1 mt-1 inline-block">
              <p className="text-xs font-semibold">
                <span className="text-blue-400">{totalOffers} offerte</span>
              </p>
            </div>
          </div>
        </div>
        <div className="text-right -mt-12">
          <p className="text-xs text-muted-foreground mb-1">Valore Totale</p>
          <p className="text-xl font-bold text-green-400">
            CHF {(totalValue / 1000).toFixed(0)}k
          </p>
        </div>
      </div>

      {/* ApexCharts Vertical Bar Chart */}
      <div>
        <ReactApexChart
          options={chartOptions}
          series={chartSeries}
          type="bar"
          height={280}
        />
      </div>

      {/* Value badges per department */}
      <div className="grid grid-cols-4 gap-2 mt-4">
        {departments.map((dept, index) => (
          <div
            key={index}
            className={`backdrop-blur-md ${dept.bgLight} border border-white/20 rounded-lg px-2 py-2 text-center`}
          >
            <p className={`text-[10px] font-medium ${dept.textColor}`}>
              CHF {(dept.value / 1000).toFixed(0)}k
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
