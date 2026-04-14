"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ApexOptions } from "apexcharts";
import { BarChart3, BrainCircuit, Link2, TrendingUp, Users } from "lucide-react";
import { DashboardStats } from "@/lib/server-data";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface ForecastInteractiveChartsProps {
  data: DashboardStats;
}

type ForecastIntegration = {
  name: string;
  type: "Dati" | "Automazione" | "Controllo" | "Human-in-the-loop";
  impact: number;
  note: string;
};

type ForecastFunction = {
  id: string;
  label: string;
  source: "pipeline" | "department";
  pointLabel: string;
  pointValue: number;
  accuracy: number;
  integrations: ForecastIntegration[];
  usesVirtualAgents: boolean;
  usesHumanResources: boolean;
};

const DEPARTMENT_COLORS: { [key: string]: string } = {
  Vendita: "#3b82f6",
  AVOR: "#f97316",
  Produzione: "#22c55e",
  "Prod.": "#22c55e",
  Install: "#8b5cf6",
  "Install.": "#8b5cf6",
  Service: "#ec4899",
  Altro: "#6b7280",
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function buildForecastFunctions(data: DashboardStats): ForecastFunction[] {
  const pipelineFunctions = data.pipelineData.map((entry, index) => {
    const normalizedValue = data.pipelineData.length
      ? entry.value / Math.max(...data.pipelineData.map((item) => item.value || 1))
      : 0;

    const accuracy = clamp(74 + normalizedValue * 21 + (index % 3), 60, 98);
    const usesVirtualAgents = true;
    const usesHumanResources = index % 2 === 0;

    return {
      id: `pipeline-${index}`,
      label: `Forecast Pipeline ${entry.month}`,
      source: "pipeline" as const,
      pointLabel: entry.month,
      pointValue: entry.value,
      accuracy: Number(accuracy.toFixed(1)),
      usesVirtualAgents,
      usesHumanResources,
      integrations: [
        {
          name: "CRM commerciale",
          type: "Dati" as const,
          impact: 30,
          note: "Aggiorna lo storico offerte e la qualità del trend.",
        },
        {
          name: "ERP ordini",
          type: "Automazione" as const,
          impact: 25,
          note: "Allinea priorita ordini e disponibilita materiali.",
        },
        {
          name: "Workflow agent virtuale",
          type: "Controllo" as const,
          impact: 20,
          note: "Valida anomalie e outlier di previsione.",
        },
        {
          name: "Revisione PM",
          type: "Human-in-the-loop" as const,
          impact: 25,
          note: "Conferma eccezioni e override previsivi.",
        },
      ],
    };
  });

  const maxDepartmentCount = Math.max(
    ...data.departmentWorkload.map((d) => d.count || 1),
    1
  );

  const departmentFunctions = data.departmentWorkload.map((entry, index) => {
    const normalizedCount = entry.count / maxDepartmentCount;
    const accuracy = clamp(70 + normalizedCount * 24 + ((index + 1) % 4), 58, 97);
    const usesVirtualAgents = normalizedCount >= 0.35;
    const usesHumanResources = true;

    return {
      id: `department-${index}`,
      label: `Forecast Capacita ${entry.department}`,
      source: "department" as const,
      pointLabel: entry.department,
      pointValue: entry.count,
      accuracy: Number(accuracy.toFixed(1)),
      usesVirtualAgents,
      usesHumanResources,
      integrations: [
        {
          name: "Time Tracking",
          type: "Dati" as const,
          impact: 28,
          note: "Contribuisce ai tempi medi e lead time effettivo.",
        },
        {
          name: "Kanban realtime",
          type: "Automazione" as const,
          impact: 24,
          note: "Aggiorna il carico commesse in tempo quasi reale.",
        },
        {
          name: "Agent routing",
          type: "Controllo" as const,
          impact: 22,
          note: "Ribilancia il carico su reparti e finestre operative.",
        },
        {
          name: "Conferma responsabile reparto",
          type: "Human-in-the-loop" as const,
          impact: 26,
          note: "Valida colli di bottiglia e disponibilita risorse.",
        },
      ],
    };
  });

  return [...pipelineFunctions, ...departmentFunctions];
}

function NeuralDna3DCard({ selected }: { selected: ForecastFunction }) {
  const helixNodes = Array.from({ length: 10 }, (_, idx) => {
    const offset = (idx % 2) * 32;
    return {
      id: idx,
      top: idx * 22 + 8,
      leftA: 18 + offset,
      leftB: 130 - offset,
    };
  });

  return (
    <div className="rounded-2xl border border-cyan-400/30 bg-slate-950/70 p-4 shadow-[0_0_35px_rgba(56,189,248,0.2)]">
      <div className="mb-3 flex items-center gap-2 text-cyan-300">
        <BrainCircuit className="h-4 w-4" />
        <p className="text-sm font-semibold">Rete neurale 3D / DNA</p>
      </div>
      <div className="[perspective:1400px]">
        <div className="relative h-[240px] overflow-hidden rounded-xl border border-cyan-400/20 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 [transform:rotateX(16deg)_rotateY(-10deg)]">
          {helixNodes.map((node) => (
            <div key={`left-${node.id}`}>
              <span
                className="absolute h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.9)]"
                style={{ top: `${node.top}px`, left: `${node.leftA}px` }}
              />
              <span
                className="absolute h-3 w-3 rounded-full bg-fuchsia-400 shadow-[0_0_12px_rgba(232,121,249,0.9)]"
                style={{ top: `${node.top}px`, left: `${node.leftB}px` }}
              />
              <span
                className="absolute h-[2px] bg-gradient-to-r from-cyan-400/80 to-fuchsia-400/80"
                style={{
                  top: `${node.top + 5}px`,
                  left: `${Math.min(node.leftA, node.leftB) + 5}px`,
                  width: `${Math.abs(node.leftA - node.leftB) - 2}px`,
                }}
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.2),transparent_60%)]" />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-300">
        Funzione ibrida rilevata: <span className="font-semibold">{selected.label}</span>
      </p>
    </div>
  );
}

export default function ForecastInteractiveCharts({
  data,
}: ForecastInteractiveChartsProps) {
  const forecastFunctions = useMemo(() => buildForecastFunctions(data), [data]);
  const [selectedFunctionId, setSelectedFunctionId] = useState<string | null>(
    null
  );

  const selectedFunction = useMemo(
    () =>
      forecastFunctions.find((item) => item.id === selectedFunctionId) ||
      forecastFunctions[0],
    [forecastFunctions, selectedFunctionId]
  );

  const pipelineFunctions = useMemo(
    () => forecastFunctions.filter((item) => item.source === "pipeline"),
    [forecastFunctions]
  );

  const departmentFunctions = useMemo(
    () => forecastFunctions.filter((item) => item.source === "department"),
    [forecastFunctions]
  );

  const pipelineChartOptions: ApexOptions = {
    chart: {
      type: "area",
      height: 300,
      toolbar: { show: false },
      background: "transparent",
      events: {
        dataPointSelection: (_, __, config) => {
          const target = pipelineFunctions[config.dataPointIndex];
          if (target) {
            setSelectedFunctionId(target.id);
          }
        },
      },
    },
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.72, opacityTo: 0.2, stops: [0, 100] },
    },
    colors: ["#3b82f6"],
    xaxis: {
      categories: pipelineFunctions.map((item) => item.pointLabel),
      labels: { style: { colors: "#a1a1aa", fontSize: "12px" } },
    },
    yaxis: {
      labels: { style: { colors: "#a1a1aa", fontSize: "12px" } },
    },
    grid: { borderColor: "#3f3f46", strokeDashArray: 3 },
    tooltip: {
      theme: "dark",
      custom: ({ dataPointIndex }) => {
        const current = pipelineFunctions[dataPointIndex];
        if (!current) return "";
        return `<div style="padding:8px 10px">
          <strong>${current.label}</strong><br/>
          Accuratezza: ${current.accuracy}%
        </div>`;
      },
    },
  };

  const departmentChartOptions: ApexOptions = {
    chart: {
      type: "bar",
      height: 300,
      toolbar: { show: false },
      background: "transparent",
      events: {
        dataPointSelection: (_, __, config) => {
          const target = departmentFunctions[config.dataPointIndex];
          if (target) {
            setSelectedFunctionId(target.id);
          }
        },
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 8,
        borderRadiusApplication: "end",
      },
    },
    colors: departmentFunctions.map(
      (item) => DEPARTMENT_COLORS[item.pointLabel] || "#6b7280"
    ),
    xaxis: {
      categories: departmentFunctions.map((item) => item.pointLabel),
      labels: { style: { colors: "#a1a1aa", fontSize: "12px" } },
    },
    yaxis: { labels: { style: { colors: "#a1a1aa", fontSize: "12px" } } },
    grid: { borderColor: "#3f3f46", strokeDashArray: 3 },
    tooltip: {
      theme: "dark",
      custom: ({ dataPointIndex }) => {
        const current = departmentFunctions[dataPointIndex];
        if (!current) return "";
        return `<div style="padding:8px 10px">
          <strong>${current.label}</strong><br/>
          Accuratezza: ${current.accuracy}%
        </div>`;
      },
    },
  };

  const pipelineSeries = [
    {
      name: "Accuratezza Forecast",
      data: pipelineFunctions.map((item) => item.accuracy),
    },
  ];

  const departmentSeries = [
    {
      name: "Accuratezza Forecast",
      data: departmentFunctions.map((item) => item.accuracy),
    },
  ];

  const isHybridMode =
    selectedFunction?.usesVirtualAgents && selectedFunction?.usesHumanResources;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-100">
        Clicca su un punto dei grafici Forecast per aprire le integrazioni che
        influenzano l accuratezza della funzione selezionata.
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/20">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Forecast Pipeline</h3>
              <p className="text-sm text-muted-foreground">
                Accuratezza funzioni previsionali nel tempo
              </p>
            </div>
          </div>
          <ReactApexChart
            options={pipelineChartOptions}
            series={pipelineSeries}
            type="area"
            height={300}
          />
        </div>

        <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/20">
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Forecast Capacita Reparti</h3>
              <p className="text-sm text-muted-foreground">
                Accuratezza forecast per funzioni operative
              </p>
            </div>
          </div>
          <ReactApexChart
            options={departmentChartOptions}
            series={departmentSeries}
            type="bar"
            height={300}
          />
        </div>
      </div>

      {selectedFunction && (
        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Funzione selezionata
                </p>
                <h4 className="text-lg font-semibold">{selectedFunction.label}</h4>
              </div>
              <span className="rounded-full bg-blue-500/15 px-3 py-1 text-sm font-semibold text-blue-300">
                Accuratezza {selectedFunction.accuracy}%
              </span>
            </div>

            <div className="mb-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-cyan-400/40 px-2 py-1 text-cyan-300">
                Agenti virtuali:{" "}
                {selectedFunction.usesVirtualAgents ? "attivi" : "non attivi"}
              </span>
              <span className="rounded-full border border-fuchsia-400/40 px-2 py-1 text-fuchsia-300">
                Risorse umane:{" "}
                {selectedFunction.usesHumanResources ? "attive" : "non attive"}
              </span>
            </div>

            <div className="space-y-2">
              {selectedFunction.integrations.map((integration) => (
                <div
                  key={`${selectedFunction.id}-${integration.name}`}
                  className="rounded-xl border border-white/10 bg-slate-900/35 p-3"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-blue-300" />
                      <p className="font-medium">{integration.name}</p>
                    </div>
                    <span className="text-xs text-blue-300">
                      Impatto {integration.impact}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{integration.note}</p>
                </div>
              ))}
            </div>
          </div>

          {isHybridMode ? (
            <NeuralDna3DCard selected={selectedFunction} />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-300" />
                <p className="text-sm font-semibold">Modalita standard</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Il grafico 3D rete neurale / DNA viene mostrato quando una
                funzione combina agenti virtuali e risorse umane di progetto.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
