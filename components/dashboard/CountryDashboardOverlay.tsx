"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ApexOptions } from "apexcharts";
import { Loader2, Phone, Users, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import KPICards from "@/components/dashboard/KPICards";
import PipelineChart from "@/components/dashboard/PipelineChart";
import DepartmentWorkloadChart from "@/components/dashboard/DepartmentWorkloadChart";
import { useT, useLocale } from "@/components/i18n/i18n-provider";
import { formatNumber } from "@/lib/i18n/format";
import { chartColorAt, getChartAxisColor } from "@/lib/charts/theme";
import {
  COUNTRY_CAPITALS,
  type CountryDashboardStats,
  type SelectedCountry,
} from "@/lib/map-capitals";
import type { DashboardStats } from "@/lib/server-data";
import type { NormalizedProjectLocation } from "@/utils/project-location-map";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });
const ActiveProjectsMap = dynamic(
  () => import("@/components/dashboard/ActiveProjectsMap"),
  { ssr: false },
);

interface CountryDashboardOverlayProps {
  country: SelectedCountry | null;
  domain: string;
  /** All geolocated projects; filtered to the country for the background map. */
  projects: NormalizedProjectLocation[];
  onClose: () => void;
}

type CountryPayload = {
  dashboard: DashboardStats;
  country: CountryDashboardStats;
};

export default function CountryDashboardOverlay({
  country,
  domain,
  projects,
  onClose,
}: CountryDashboardOverlayProps) {
  const t = useT();
  const locale = useLocale();
  const [payload, setPayload] = useState<CountryPayload | null>(null);
  const [loading, setLoading] = useState(false);

  const iso2 = country?.iso2 ?? "";
  const iso3 = country?.iso3 ?? "";
  const info = iso3 ? COUNTRY_CAPITALS[iso3] : undefined;

  useEffect(() => {
    if (!country) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [country, onClose]);

  useEffect(() => {
    if (!country) {
      setPayload(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setPayload(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/sites/${domain}/country-dashboard?iso2=${encodeURIComponent(iso2)}`,
        );
        const data = (await res.json()) as CountryPayload;
        if (!cancelled) setPayload(data);
      } catch {
        if (!cancelled) setPayload(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [country, domain, iso2]);

  if (!country) return null;

  const stats = payload?.country;
  const countryProjects = projects.filter(
    (p) => String(p.countryCode || "").toUpperCase() === iso2,
  );

  const currency = (value: number) =>
    formatNumber(value, locale, {
      style: "currency",
      currency: "CHF",
      maximumFractionDigits: 0,
    });

  const facts = [
    {
      key: "population",
      label: t("dashboard.population"),
      value: info ? formatNumber(info.population, locale) : "-",
      icon: Users,
    },
    {
      key: "phone",
      label: t("dashboard.phonePrefix"),
      value: info?.phoneCode ?? "-",
      icon: Phone,
    },
    {
      key: "clients",
      label: t("dashboard.clients"),
      value: stats ? formatNumber(stats.clients, locale) : "-",
      icon: Users,
    },
    {
      key: "value",
      label: t("dashboard.totalValue"),
      value: stats ? currency(stats.totalValue) : "-",
      icon: Wallet,
    },
  ];

  const hasSales = !!stats && stats.offerValue + stats.orderValue > 0;
  const salesOptions: ApexOptions = {
    chart: { type: "donut", background: "transparent" },
    labels: [t("dashboard.offerValue"), t("dashboard.orderValue")],
    colors: [chartColorAt(1), chartColorAt(3)],
    stroke: { width: 0 },
    dataLabels: { enabled: false },
    legend: { position: "bottom", labels: { colors: getChartAxisColor() } },
    tooltip: { theme: "dark", y: { formatter: (v: number) => currency(v) } },
  };

  return (
    <div className="fixed inset-0 z-[130] flex flex-col bg-slate-950">
      {/* Background map (non-interactive) */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <ActiveProjectsMap
          key={`country-${iso3}`}
          projects={countryProjects}
          domain={domain}
          doubleClickZoom={false}
          highlightCountries={iso3 ? [iso3] : undefined}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/70 to-slate-950/85" />

      {/* Foreground content */}
      <div className="relative z-10 flex h-full flex-col overflow-y-auto p-4 md:p-6">
        <div className="mx-auto w-full max-w-6xl space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {iso2 && (
                <Image
                  src={`https://flagcdn.com/w80/${iso2.toLowerCase()}.png`}
                  alt={country.name}
                  width={48}
                  height={36}
                  className="h-auto w-12 rounded-sm shadow-md"
                />
              )}
              <div>
                <h2 className="text-2xl font-bold text-white">{country.name}</h2>
                {country.capital && (
                  <p className="text-sm text-white/70">
                    {t("dashboard.capital")}: {country.capital}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label={t("common.close")}
              className="text-white/80 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Dati paese */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {facts.map((fact) => {
              const Icon = fact.icon;
              return (
                <div
                  key={fact.key}
                  className="rounded-xl border border-white/10 bg-slate-900/70 p-3 backdrop-blur"
                >
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-medium uppercase tracking-wide">
                      {fact.label}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-lg font-semibold text-white">
                    {fact.value}
                  </p>
                </div>
              );
            })}
          </div>

          {loading || !payload ? (
            <div className="flex items-center justify-center py-24 text-white/70">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {t("common.loading")}
            </div>
          ) : (
            <>
              <KPICards data={payload.dashboard} domain={domain} />

              <div className="grid gap-4 lg:grid-cols-2">
                <PipelineChart data={payload.dashboard} />
                <DepartmentWorkloadChart data={payload.dashboard} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="dashboard-panel p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-blue-400" />
                    <h3 className="dashboard-panel-title">
                      {t("dashboard.salesTitle")}
                    </h3>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {stats ? currency(stats.totalValue) : ""}
                    </span>
                  </div>
                  {hasSales && stats ? (
                    <ReactApexChart
                      options={salesOptions}
                      series={[stats.offerValue, stats.orderValue]}
                      type="donut"
                      height={240}
                    />
                  ) : (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      {t("dashboard.noSalesData")}
                    </p>
                  )}
                </div>

                <div className="dashboard-panel flex flex-col justify-center gap-3 p-6">
                  <h3 className="dashboard-panel-title">
                    {t("dashboard.activityTitle")}
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border bg-card p-4 text-center">
                      <p className="text-2xl font-bold text-foreground">
                        {stats?.clients ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("dashboard.clients")}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4 text-center">
                      <p className="text-2xl font-bold text-foreground">
                        {stats?.offers ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("dashboard.offers")}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4 text-center">
                      <p className="text-2xl font-bold text-foreground">
                        {stats?.projects ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("dashboard.projects")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/sites/${domain}/clients?country=${iso2}`}>
                        {t("dashboard.openClients")}
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/sites/${domain}/projects?country=${iso2}`}>
                        {t("dashboard.openProjects")}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
