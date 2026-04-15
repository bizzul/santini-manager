"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ApexOptions } from "apexcharts";
import { BarChart3, Clock3, Factory, TrendingUp, Wallet } from "lucide-react";
import { DashboardStats } from "@/lib/server-data";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface ForecastInteractiveChartsProps {
  data: DashboardStats;
}

type ConversionPeriod = "month" | "q1" | "q2" | "q3" | "q4";
type CashFlowPeriod = 1 | 3 | 6 | 12;

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `CHF ${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `CHF ${(value / 1000).toFixed(0)}k`;
  }
  return `CHF ${value.toFixed(0)}`;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export default function ForecastInteractiveCharts({
  data,
}: ForecastInteractiveChartsProps) {
  const conversionData = useMemo(
    () => data.forecast?.conversion ?? [],
    [data.forecast?.conversion]
  );
  const occupancyCategories = useMemo(
    () => data.forecast?.occupancy?.categories ?? [],
    [data.forecast?.occupancy?.categories]
  );
  const plannedHoursData = data.forecast?.plannedHours;
  const cashFlowData = data.forecast?.cashFlow;

  const availableYears = useMemo(() => {
    const years = Array.from(new Set(conversionData.map((entry) => entry.year))).sort();
    if (years.length > 0) return years;
    const currentYear = new Date().getFullYear();
    return [currentYear - 2, currentYear - 1, currentYear];
  }, [conversionData]);

  const [conversionPeriod, setConversionPeriod] = useState<ConversionPeriod>("month");
  const [conversionYear, setConversionYear] = useState<number>(
    availableYears[availableYears.length - 1] || new Date().getFullYear()
  );
  const [cashFlowPeriod, setCashFlowPeriod] = useState<CashFlowPeriod>(3);

  const selectedConversion = useMemo(
    () =>
      conversionData.find(
        (entry) => entry.period === conversionPeriod && entry.year === conversionYear
      ) || {
        year: conversionYear,
        period: conversionPeriod,
        sentValue: 0,
        acquiredValue: 0,
        sentCount: 0,
        acquiredCount: 0,
        rate: 0,
      },
    [conversionData, conversionPeriod, conversionYear]
  );

  const occupancySeries = [
    {
      name: "Reparti",
      data: occupancyCategories.map((category) =>
        Number(clamp(category.departmentLoad, 0, 100).toFixed(1))
      ),
    },
    {
      name: "Macchinari",
      data: occupancyCategories.map((category) =>
        Number(clamp(category.machineLoad, 0, 100).toFixed(1))
      ),
    },
  ];

  const occupancyChartOptions: ApexOptions = {
    chart: {
      type: "bar",
      stacked: true,
      toolbar: { show: false },
      background: "transparent",
    },
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: "52%",
      },
    },
    colors: ["#3b82f6", "#22d3ee"],
    dataLabels: { enabled: false },
    xaxis: {
      categories: occupancyCategories.map((item) => item.name),
      labels: { style: { colors: "#a1a1aa", fontSize: "12px" } },
    },
    yaxis: {
      max: 100,
      title: { text: "% Carico", style: { color: "#94a3b8" } },
      labels: { style: { colors: "#a1a1aa", fontSize: "12px" } },
    },
    grid: { borderColor: "#3f3f46", strokeDashArray: 3 },
    legend: { labels: { colors: "#cbd5e1" } },
    tooltip: {
      theme: "dark",
      y: {
        formatter: (value, context) => {
          const index = context.dataPointIndex;
          const category = occupancyCategories[index];
          if (!category) return `${value.toFixed(1)}%`;
          return `${value.toFixed(1)}% (${Math.round(category.workHours)} h)`;
        },
      },
    },
  };

  const workHoursSeries = [
    {
      name: "Ore pianificate",
      data: (plannedHoursData?.byDepartment || []).map((item) => Math.round(item.hours)),
    },
  ];

  const workHoursChartOptions: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      background: "transparent",
      sparkline: { enabled: true },
    },
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.45, opacityTo: 0.15, stops: [0, 100] },
    },
    colors: ["#a78bfa"],
    dataLabels: { enabled: false },
    xaxis: {
      categories: (plannedHoursData?.byDepartment || []).map((item) => item.department),
    },
    tooltip: { theme: "dark", y: { formatter: (value) => `${value} h` } },
  };

  const selectedHorizon = useMemo(
    () =>
      cashFlowData?.horizons?.find((entry) => entry.months === cashFlowPeriod) || {
        months: cashFlowPeriod,
        value: 0,
        inflowInProgress: 0,
        inflowFuture: 0,
        outflowLabor: 0,
      },
    [cashFlowData, cashFlowPeriod]
  );

  const cashFlowTrendSeries = [
    {
      name: "Cash flow stimato",
      data: (cashFlowData?.monthlySeries || []).map((item) => Number(item.value.toFixed(0))),
    },
  ];

  const cashFlowTrendOptions: ApexOptions = {
    chart: {
      type: "line",
      toolbar: { show: false },
      background: "transparent",
    },
    stroke: { curve: "smooth", width: 2 },
    colors: [selectedHorizon.value >= 0 ? "#10b981" : "#ef4444"],
    xaxis: {
      categories: (cashFlowData?.monthlySeries || []).map((item) => item.label),
      labels: { style: { colors: "#a1a1aa", fontSize: "11px" } },
    },
    yaxis: {
      labels: {
        formatter: (value) => `CHF ${(value / 1000).toFixed(0)}k`,
        style: { colors: "#a1a1aa", fontSize: "11px" },
      },
    },
    grid: { borderColor: "#3f3f46", strokeDashArray: 3 },
    dataLabels: { enabled: false },
    tooltip: {
      theme: "dark",
      y: { formatter: (value) => formatCurrency(value) },
    },
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-100">
        KPI Forecast collegati ai dati reali del database, con calcolo periodale per
        conversione commerciale e cash flow previsionale.
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="dashboard-panel p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/20">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="dashboard-panel-title">KPI Tasso di conversione</h3>
              <p className="dashboard-panel-subtitle">
                Valore offerte inviate / commesse acquisite
              </p>
            </div>
          </div>
          <h4 className="mb-1 text-[1.85rem] font-bold leading-tight">
            {selectedConversion.rate.toFixed(1)}%
          </h4>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(selectedConversion.acquiredValue)} acquisito su{" "}
            {formatCurrency(selectedConversion.sentValue)} inviato
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {selectedConversion.acquiredCount}/{selectedConversion.sentCount} commesse
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { id: "month", label: "Mese" },
              { id: "q1", label: "Q1" },
              { id: "q2", label: "Q2" },
              { id: "q3", label: "Q3" },
              { id: "q4", label: "Q4" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setConversionPeriod(item.id as ConversionPeriod)}
                className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                  conversionPeriod === item.id
                    ? "border-blue-400 bg-blue-500/20 text-blue-200"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:border-blue-300/40"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {availableYears.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setConversionYear(year)}
                className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                  conversionYear === year
                    ? "border-cyan-400 bg-cyan-500/15 text-cyan-200"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:border-cyan-300/30"
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        <div className="dashboard-panel p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/20">
              <Factory className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="dashboard-panel-title">Occupazione reparti</h3>
              <p className="dashboard-panel-subtitle">
                Carico reparti e macchinari per prodotti/categorie
              </p>
            </div>
          </div>
          <h4 className="mb-2 text-[1.6rem] font-bold leading-tight">
            {(data.forecast?.occupancy?.averageLoad || 0).toFixed(0)}%
          </h4>
          <p className="mb-2 text-xs text-muted-foreground">
            Carico medio produttivo sulle commesse acquisite pianificate
          </p>
          <ReactApexChart
            options={occupancyChartOptions}
            series={occupancySeries}
            type="bar"
            height={190}
          />
        </div>

        <div className="dashboard-panel p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/20">
              <Clock3 className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h3 className="dashboard-panel-title">Ore lavoro pianificate</h3>
              <p className="dashboard-panel-subtitle">
                Personale necessario per commesse acquisite future
              </p>
            </div>
          </div>
          <h4 className="mb-1 text-[1.85rem] font-bold leading-tight">
            {Math.round(plannedHoursData?.totalHours || 0)} h
          </h4>
          <p className="text-xs text-muted-foreground">
            Fabbisogno medio: {(plannedHoursData?.fte || 0).toFixed(1)} FTE
          </p>
          <div className="mt-3">
            <ReactApexChart
              options={workHoursChartOptions}
              series={workHoursSeries}
              type="area"
              height={92}
            />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {(plannedHoursData?.byDepartment || []).slice(0, 4).map((item) => (
              <div
                key={item.department}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5"
              >
                <p className="text-muted-foreground">{item.department}</p>
                <p className="font-medium">{Math.round(item.hours)} h</p>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-panel p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20">
              <Wallet className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="dashboard-panel-title">KPI Cash flow stimato</h3>
              <p className="dashboard-panel-subtitle">
                In corso, commesse future e liquidita disponibile
              </p>
            </div>
          </div>
          <h4 className="mb-1 text-[1.8rem] font-bold leading-tight">
            {formatCurrency(selectedHorizon.value)}
          </h4>
          <p className="text-xs text-muted-foreground">
            Orizzonte a {cashFlowPeriod} {cashFlowPeriod === 1 ? "mese" : "mesi"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[1, 3, 6, 12].map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setCashFlowPeriod(period as CashFlowPeriod)}
                className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                  cashFlowPeriod === period
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:border-emerald-300/30"
                }`}
              >
                +{period}m
              </button>
            ))}
          </div>
          <div className="mt-3">
            <ReactApexChart
              options={cashFlowTrendOptions}
              series={cashFlowTrendSeries}
              type="line"
              height={130}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="dashboard-panel p-6">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-300" />
            <p className="text-sm font-semibold">Dettaglio occupazione categorie</p>
          </div>
          <ReactApexChart
            options={occupancyChartOptions}
            series={occupancySeries}
            type="bar"
            height={290}
          />
        </div>

        <div className="dashboard-panel p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-cyan-200">DNA Loop Centrale</p>
            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-200">
              video loop
            </span>
          </div>
          <div className="mx-auto w-full max-w-[340px]">
            <div className="aspect-square overflow-hidden rounded-2xl border border-cyan-400/30 bg-slate-950/70 shadow-[0_0_35px_rgba(56,189,248,0.18)]">
              <video
                src="/video/dna-loop.mp4"
                className="h-full w-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
              />
            </div>
          </div>
        </div>

        <div className="dashboard-panel p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-300" />
            <p className="text-sm font-semibold">Proiezione cash flow</p>
          </div>
          <ReactApexChart
            options={cashFlowTrendOptions}
            series={cashFlowTrendSeries}
            type="line"
            height={290}
          />
        </div>
      </div>
    </div>
  );
}
