"use client";

import Link from "next/link";
import { Globe2, TrendingUp } from "lucide-react";
import { useT, useLocale } from "@/components/i18n/i18n-provider";
import { formatNumber } from "@/lib/i18n/format";
import { COUNTRY_CAPITALS } from "@/lib/map-capitals";
import type { EmergingMarketCountry } from "@/lib/country-dashboard.server";

interface GlobalMarketOverviewCardProps {
  domain: string;
  representativeCount: number;
  totalCountries: number;
  emergingMarkets: EmergingMarketCountry[];
}

const KNOWN_CAPITAL_ISO2 = new Set(
  Object.values(COUNTRY_CAPITALS).map((info) => info.iso2.toUpperCase()),
);

export default function GlobalMarketOverviewCard({
  domain,
  representativeCount,
  totalCountries,
  emergingMarkets,
}: GlobalMarketOverviewCardProps) {
  const t = useT();
  const locale = useLocale();

  const safeTotal = totalCountries > 0 ? totalCountries : 1;
  const coveragePct = Math.min(
    100,
    Math.round((representativeCount / safeTotal) * 100),
  );

  const currency = (value: number) =>
    formatNumber(value, locale, {
      style: "currency",
      currency: "CHF",
      maximumFractionDigits: 0,
    });

  const tileHref = (iso2: string) =>
    KNOWN_CAPITAL_ISO2.has(iso2.toUpperCase())
      ? `/sites/${domain}/dashboard?country=${iso2}`
      : `/sites/${domain}/clients?country=${iso2}`;

  return (
    <div className="dashboard-panel space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Globe2 className="h-4 w-4" />
          </span>
          <div>
            <h3 className="dashboard-panel-title">
              {t("dashboard.globalMarketTitle")}
            </h3>
            <p className="dashboard-panel-subtitle">
              {t("dashboard.globalMarketSubtitle")}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">
            {formatNumber(representativeCount, locale)}
            <span className="text-lg font-medium text-muted-foreground">
              {" "}
              / {formatNumber(totalCountries, locale)}
            </span>
          </p>
          <p className="dashboard-panel-subtitle">
            {t("dashboard.countriesWithRepresentative")}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>{t("dashboard.coverage")}</span>
          <span>{coveragePct}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${coveragePct}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">
            {t("dashboard.emergingMarketsTitle")}
          </h4>
        </div>

        {emergingMarkets.length === 0 ? (
          <p className="rounded-xl border border-border bg-card/60 px-4 py-4 text-center text-sm text-muted-foreground">
            {t("dashboard.emergingMarketsEmpty")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {emergingMarkets.map((market) => (
              <Link
                key={market.iso2}
                href={tileHref(market.iso2)}
                className="group flex flex-col gap-1.5 rounded-xl border border-border bg-card/60 p-2.5 transition-colors hover:border-primary/60 hover:bg-card"
              >
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://flagcdn.com/w40/${market.iso2.toLowerCase()}.png`}
                    alt=""
                    className="h-4 w-6 shrink-0 rounded-sm object-cover"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {market.name}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {formatNumber(market.offers, locale)}{" "}
                    {t("dashboard.offers").toLowerCase()}
                  </span>
                  <span className="font-semibold text-foreground">
                    {currency(market.totalValue)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
