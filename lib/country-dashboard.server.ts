/**
 * Server-only aggregation of per-country KPIs for the dashboard map capital
 * points. Keyed by ISO 3166-1 alpha-2 (matching `Client.countryCode`).
 *
 * Client-safe types live in `lib/map-capitals.ts`.
 */
import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { COUNTRY_CAPITALS, type CountryDashboardStats } from "./map-capitals";
import type { DashboardStats } from "./server-data";
import { getSiteHighlightCountries } from "./map-highlight.server";
import { WORLD_SOVEREIGN_COUNTRIES_COUNT } from "./map-highlight";
import { countries as ISO2_COUNTRIES } from "@/components/clients/countries";

export const getCountryDashboardStats = cache(
  async (siteId: string): Promise<Record<string, CountryDashboardStats>> => {
    const result: Record<string, CountryDashboardStats> = {};
    if (!siteId) return result;

    const ensure = (iso2: string): CountryDashboardStats => {
      if (!result[iso2]) {
        result[iso2] = {
          clients: 0,
          projects: 0,
          offers: 0,
          totalValue: 0,
          offerValue: 0,
          orderValue: 0,
        };
      }
      return result[iso2];
    };

    try {
      const supabase = await createClient();
      const [{ data: clients }, { data: tasks }] = await Promise.all([
        supabase.from("Client").select("id, countryCode").eq("site_id", siteId),
        supabase
          .from("Task")
          .select("clientId, task_type, sellPrice")
          .eq("site_id", siteId),
      ]);

      const clientCountry = new Map<number, string>();

      (clients ?? []).forEach((client) => {
        const iso2 = String(client.countryCode || "").toUpperCase();
        if (!iso2) return;
        clientCountry.set(client.id as number, iso2);
        ensure(iso2).clients += 1;
      });

      (tasks ?? []).forEach((task) => {
        const iso2 = clientCountry.get(task.clientId as number);
        if (!iso2) return;
        const stats = ensure(iso2);
        const type = String(task.task_type || "").toUpperCase();
        const value = Number(task.sellPrice || 0);
        if (type === "OFFERTA") {
          stats.offers += 1;
          stats.offerValue += value;
        } else if (type === "LAVORO") {
          stats.projects += 1;
          stats.orderValue += value;
        }
        stats.totalValue += value;
      });

      return result;
    } catch (error) {
      console.error("[country-dashboard] failed to aggregate", error);
      return result;
    }
  },
);

/** A single emerging-market country in our pipeline without a representative. */
export interface EmergingMarketCountry {
  iso2: string;
  name: string;
  clients: number;
  offers: number;
  projects: number;
  totalValue: number;
}

/** Global market coverage + emerging markets preview for the dashboard. */
export interface GlobalMarketOverview {
  representativeCount: number;
  totalCountries: number;
  representativeIso2: string[];
  emergingMarkets: EmergingMarketCountry[];
  /** Countries with real activity (offers and/or projects), ranked by value. */
  activeMarkets: EmergingMarketCountry[];
}

const ISO2_NAME = new Map(
  ISO2_COUNTRIES.map((c) => [c.code.toUpperCase(), c.label]),
);

/**
 * Global market overview: how many countries have one of our representatives
 * (`map_highlight_countries`) out of the world total, plus the top emerging
 * markets - countries where we already have pipeline (clients/offers/projects)
 * but no representative yet. Emerging markets are ranked by business value.
 */
export const getGlobalMarketOverview = cache(
  async (siteId: string): Promise<GlobalMarketOverview> => {
    const empty: GlobalMarketOverview = {
      representativeCount: 0,
      totalCountries: WORLD_SOVEREIGN_COUNTRIES_COUNT,
      representativeIso2: [],
      emergingMarkets: [],
      activeMarkets: [],
    };
    if (!siteId) return empty;

    const [highlight, stats] = await Promise.all([
      getSiteHighlightCountries(siteId),
      getCountryDashboardStats(siteId),
    ]);

    const representativeIso2 = new Set<string>();
    highlight.forEach((iso3) => {
      const iso2 = COUNTRY_CAPITALS[iso3]?.iso2;
      if (iso2) representativeIso2.add(iso2.toUpperCase());
    });

    const emergingMarkets: EmergingMarketCountry[] = Object.entries(stats)
      .filter(([iso2, s]) => {
        const code = iso2.toUpperCase();
        if (representativeIso2.has(code)) return false;
        return s.clients > 0 || s.offers > 0 || s.projects > 0;
      })
      .map(([iso2, s]) => {
        const code = iso2.toUpperCase();
        return {
          iso2: code,
          name: ISO2_NAME.get(code) ?? code,
          clients: s.clients,
          offers: s.offers,
          projects: s.projects,
          totalValue: s.totalValue,
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 8);

    // Countries that actually have active business (offers and/or projects),
    // regardless of whether they already have a representative.
    const activeMarkets: EmergingMarketCountry[] = Object.entries(stats)
      .filter(([, s]) => s.offers > 0 || s.projects > 0)
      .map(([iso2, s]) => {
        const code = iso2.toUpperCase();
        return {
          iso2: code,
          name: ISO2_NAME.get(code) ?? code,
          clients: s.clients,
          offers: s.offers,
          projects: s.projects,
          totalValue: s.totalValue,
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 12);

    return {
      representativeCount: highlight.length,
      totalCountries: WORLD_SOVEREIGN_COUNTRIES_COUNT,
      representativeIso2: Array.from(representativeIso2),
      emergingMarkets,
      activeMarkets,
    };
  },
);

/** A DashboardStats with everything zeroed; country slices are overridden. */
function createEmptyDashboardStats(): DashboardStats {
  return {
    activeProjectLocations: [],
    offers: { todo: 0, inProgress: 0, sent: 0, won: 0, lost: 0, totalValue: 0, byCategory: [] },
    orders: { totalProjects: 0, totalItems: 0, totalValue: 0, byCategory: [] },
    hr: { totalEmployees: 0, activeEmployees: 0 },
    financial: { totalOrdersValue: 0, monthlyChange: 0 },
    activeOffers: { count: 0, totalValue: 0, changePercent: 0 },
    productionOrders: { total: 0, delayed: 0, delayedChange: 0 },
    openInvoices: { totalValue: 0, expiredCount: 0, changePercent: 0 },
    avorWorkload: { percentage: 0, status: "Nessun dato" },
    pipelineData: [],
    departmentWorkload: [],
    kanbanStatus: [],
    forecast: {
      conversion: [],
      occupancy: { averageLoad: 0, categories: [] },
      plannedHours: { totalHours: 0, fte: 0, byDepartment: [] },
      cashFlow: { baseLiquidity: 0, horizons: [], monthlySeries: [] },
    },
  };
}

const MONTH_LABELS_IT = [
  "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
  "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
];

/**
 * Country-scoped dashboard data + KPI facts. Reuses the same task
 * classification heuristics as `fetchDashboardData` but filters tasks to the
 * clients located in `iso2`. Returns a full `DashboardStats` (only the
 * KPI/pipeline/department slices are meaningful; the rest stays zeroed) plus
 * the lighter `CountryDashboardStats` used by the facts + donut/bar charts.
 */
export const fetchCountryDashboardData = cache(
  async (
    siteId: string,
    iso2: string,
  ): Promise<{ dashboard: DashboardStats; country: CountryDashboardStats }> => {
    const dashboard = createEmptyDashboardStats();
    const country: CountryDashboardStats = {
      clients: 0,
      projects: 0,
      offers: 0,
      totalValue: 0,
      offerValue: 0,
      orderValue: 0,
    };

    const targetIso = String(iso2 || "").toUpperCase();
    if (!siteId || !targetIso) return { dashboard, country };

    try {
      const supabase = await createClient();

      const { data: countryClients } = await supabase
        .from("Client")
        .select("id, countryCode")
        .eq("site_id", siteId);

      const clientIds = (countryClients ?? [])
        .filter(
          (c) => String(c.countryCode || "").toUpperCase() === targetIso,
        )
        .map((c) => c.id as number);

      country.clients = clientIds.length;
      if (clientIds.length === 0) return { dashboard, country };

      const [{ data: kanbans }, { data: rawTasks }] = await Promise.all([
        supabase
          .from("Kanban")
          .select("id, is_offer_kanban, is_production_kanban, title, identifier")
          .eq("site_id", siteId),
        supabase
          .from("Task")
          .select(
            "id, task_type, sellPrice, kanbanId, kanbanColumnId, display_mode, created_at, deliveryDate, sent_date",
          )
          .eq("site_id", siteId)
          .eq("archived", false)
          .in("clientId", clientIds),
      ]);

      const kanbanList = kanbans ?? [];
      const kanbanIds = kanbanList.map((k) => k.id);
      const { data: columns } = kanbanIds.length
        ? await supabase
            .from("KanbanColumn")
            .select("id, kanbanId, column_type, title, position")
            .in("kanbanId", kanbanIds)
        : { data: [] as Array<Record<string, unknown>> };

      const kanbanMap = new Map(kanbanList.map((k) => [k.id, k]));
      const columnMap = new Map((columns ?? []).map((c) => [c.id, c]));
      const offerKanbanIds = new Set(
        kanbanList.filter((k) => k.is_offer_kanban).map((k) => k.id),
      );
      const tasks = rawTasks ?? [];

      const isOffer = (t: any) =>
        t.task_type === "OFFERTA" || offerKanbanIds.has(t.kanbanId);
      const isInvoice = (t: any) => t.task_type === "FATTURA";
      const isWon = (t: any) => {
        const col = columnMap.get(t.kanbanColumnId) as any;
        return t.display_mode === "small_green" || col?.column_type === "won";
      };
      const isLost = (t: any) => {
        const col = columnMap.get(t.kanbanColumnId) as any;
        return t.display_mode === "small_red" || col?.column_type === "lost";
      };

      const departmentOf = (kanbanId: number | null): string => {
        if (!kanbanId) return "Altro";
        const k = kanbanMap.get(kanbanId) as any;
        if (!k) return "Altro";
        if (k.is_offer_kanban) return "Vendita";
        const name = String(k.title || k.identifier || "").toLowerCase();
        if (name.includes("avor") || name.includes("ufficio")) return "AVOR";
        if (name.includes("vendita") || name.includes("offerta")) return "Vendita";
        if (name.includes("produzione") || name.includes("prod") || name.includes("lavorazione")) return "Prod.";
        if (name.includes("fattur") || name.includes("invoic")) return "Fatturazione";
        if (name.includes("install") || name.includes("montag") || name.includes("cantiere")) return "Install.";
        if (name.includes("service") || name.includes("assistenza")) return "Service";
        const orig = k.title || k.identifier || "";
        return orig ? orig.charAt(0).toUpperCase() + orig.slice(1) : "Altro";
      };

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      // Pipeline: last 6 months of offer value.
      const pipelineBuckets: Array<{ month: string; value: number; year: number; m: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        pipelineBuckets.push({
          month: MONTH_LABELS_IT[d.getMonth()],
          value: 0,
          year: d.getFullYear(),
          m: d.getMonth(),
        });
      }

      const departmentCounts = new Map<string, number>();
      let activeOffersCount = 0;
      let activeOffersValue = 0;
      let currentMonthOffers = 0;
      let lastMonthOffers = 0;
      let productionTotal = 0;
      let productionDelayed = 0;
      let invoicesValue = 0;
      let invoicesExpired = 0;
      let avorCount = 0;

      tasks.forEach((t: any) => {
        const value = Number(t.sellPrice || 0);
        country.totalValue += value;

        const dept = departmentOf(t.kanbanId);
        departmentCounts.set(dept, (departmentCounts.get(dept) || 0) + 1);
        if (dept === "AVOR") avorCount += 1;

        const created = t.created_at ? new Date(t.created_at) : null;
        const delivery = t.deliveryDate ? new Date(t.deliveryDate) : null;

        if (isInvoice(t)) {
          if (!isWon(t)) {
            invoicesValue += value;
            if (delivery && delivery < now) invoicesExpired += 1;
          }
          return;
        }

        if (isOffer(t)) {
          country.offers += 1;
          country.offerValue += value;
          if (!isWon(t) && !isLost(t)) {
            activeOffersCount += 1;
            activeOffersValue += value;
          }
          if (created && created >= startOfMonth) currentMonthOffers += value;
          if (created && created >= startOfLastMonth && created <= endOfLastMonth) {
            lastMonthOffers += value;
          }
          // Pipeline bucket by creation month.
          if (created) {
            const bucket = pipelineBuckets.find(
              (b) => b.year === created.getFullYear() && b.m === created.getMonth(),
            );
            if (bucket) bucket.value += value;
          }
          return;
        }

        // Production order (LAVORO / other non-offer non-invoice).
        country.projects += 1;
        country.orderValue += value;
        productionTotal += 1;
        if (delivery && delivery < now && !isWon(t)) productionDelayed += 1;
      });

      const offerChange =
        lastMonthOffers > 0
          ? ((currentMonthOffers - lastMonthOffers) / lastMonthOffers) * 100
          : 0;

      const totalTasks = tasks.length;
      const avorPct = totalTasks > 0 ? (avorCount / totalTasks) * 100 : 0;
      const avorStatus =
        avorPct >= 66 ? "Sovraccarico" : avorPct >= 33 ? "Carico regolare" : "Sotto carico";

      dashboard.activeOffers = {
        count: activeOffersCount,
        totalValue: activeOffersValue,
        changePercent: Math.round(offerChange),
      };
      dashboard.productionOrders = {
        total: productionTotal,
        delayed: productionDelayed,
        delayedChange: 0,
      };
      dashboard.openInvoices = {
        totalValue: invoicesValue,
        expiredCount: invoicesExpired,
        changePercent: 0,
      };
      dashboard.avorWorkload = { percentage: avorPct, status: avorStatus };
      dashboard.pipelineData = pipelineBuckets.map((b) => ({
        month: b.month,
        value: b.value,
      }));
      dashboard.departmentWorkload = Array.from(departmentCounts.entries())
        .map(([department, count]) => ({ department, count }))
        .sort((a, b) => b.count - a.count);

      return { dashboard, country };
    } catch (error) {
      console.error("[country-dashboard] failed to build country dashboard", error);
      return { dashboard, country };
    }
  },
);
