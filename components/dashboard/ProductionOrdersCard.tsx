"use client";

import { Factory } from "lucide-react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function ProductionOrdersCard() {
  // Dati mockup per reparto
  const departments = [
    {
      name: "Arredamento",
      color: "#3b82f6",
      projects: 12,
      items: 20,
      value: 345000,
      bgGradient: "from-blue-500 to-blue-400",
      bgLight: "bg-blue-500/20",
      textColor: "text-blue-500",
    },
    {
      name: "Serramenti",
      color: "#eab308",
      projects: 8,
      items: 20,
      value: 178000,
      bgGradient: "from-yellow-500 to-yellow-400",
      bgLight: "bg-yellow-500/20",
      textColor: "text-yellow-500",
    },
    {
      name: "Porte",
      color: "#f97316",
      projects: 15,
      items: 30,
      value: 412000,
      bgGradient: "from-orange-500 to-orange-400",
      bgLight: "bg-orange-500/20",
      textColor: "text-orange-500",
    },
    {
      name: "Service",
      color: "#22c55e",
      projects: 6,
      items: 34,
      value: 89000,
      bgGradient: "from-green-500 to-green-400",
      bgLight: "bg-green-500/20",
      textColor: "text-green-500",
    },
  ];

  const totalProjects = departments.reduce(
    (sum, dept) => sum + dept.projects,
    0
  );
  const totalItems = departments.reduce((sum, dept) => sum + dept.items, 0);
  const totalValue = departments.reduce((sum, dept) => sum + dept.value, 0);

  // Prepara i dati per ApexCharts
  const chartOptions: ApexOptions = {
    chart: {
      type: "bar",
      height: 400,
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
        columnWidth: "65%",
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
      position: "bottom",
      horizontalAlign: "center",
      labels: {
        colors: "#a1a1aa",
      },
      markers: {
        size: 6,
        strokeWidth: 0,
      },
    },
    tooltip: {
      theme: "dark",
      y: {
        formatter: (value) => {
          return value.toString();
        },
      },
    },
    colors: departments.map((d) => d.color),
  };

  const chartSeries = [
    {
      name: "Progetti",
      data: departments.map((d) => d.projects),
    },
    {
      name: "Elementi",
      data: departments.map((d) => d.items),
    },
  ];

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Factory className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Ordini</h3>
            <div className="backdrop-blur-sm bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-1.5 mt-2 inline-block">
              <p className="text-sm font-semibold">
                <span className="text-blue-400">{totalProjects} progetti</span>
                <span className="mx-2">•</span>
                <span className="text-green-400">{totalItems} elementi</span>
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-1">Valore Totale</p>
          <p className="text-2xl font-bold text-green-400">
            CHF {(totalValue / 1000).toFixed(0)}k
          </p>
        </div>
      </div>

      {/* ApexCharts Bar Chart */}
      <div className="mb-4">
        <ReactApexChart
          options={chartOptions}
          series={chartSeries}
          type="bar"
          height={400}
        />
      </div>

      {/* Value badges per department */}
      <div className="grid grid-cols-4 gap-3 mt-4">
        {departments.map((dept, index) => (
          <div
            key={index}
            className={`backdrop-blur-md ${dept.bgLight} border border-white/20 rounded-lg px-3 py-2 text-center`}
          >
            <p className={`text-xs font-medium ${dept.textColor} mb-1`}>
              {dept.name}
            </p>
            <p className={`text-sm font-bold ${dept.textColor}`}>
              CHF {(dept.value / 1000).toFixed(0)}k
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
