"use client";

import { CalendarDays } from "lucide-react";
import { ProduzioneDashboardStats } from "@/lib/server-data";
import { getProductCategoryIcon } from "@/lib/calendar-product-styling";

interface ProduzioneCalendarWeeklySummaryProps {
  data: ProduzioneDashboardStats["calendarWeeklySummary"];
  productCategories: ProduzioneDashboardStats["productWorkload"];
}

function WeeklySummaryCard({
  week,
  productCategories,
}: {
  week: ProduzioneDashboardStats["calendarWeeklySummary"][number];
  productCategories: ProduzioneDashboardStats["productWorkload"];
}) {
  const weekCategoryMap = new Map(
    week.categories.map((category) => [category.category, category])
  );
  const categoriesToRender = productCategories.map((productCategory) => {
    const weeklyCategory = weekCategoryMap.get(productCategory.category);
    if (weeklyCategory) {
      return weeklyCategory;
    }
    return {
      category: productCategory.category,
      color: productCategory.color || "#64748b",
      commesse: 0,
      elementi: 0,
      elementiByCalendar: {
        production: 0,
        installation: 0,
        service: 0,
      },
    };
  });

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold">{week.label}</h4>
        <span className="text-[11px] text-muted-foreground">
          {week.commesse} commesse
        </span>
      </div>

      <div className="text-2xl font-bold tabular-nums">{week.elementi}</div>
      <div className="text-xs text-muted-foreground -mt-2">elementi totali</div>

      {categoriesToRender.length === 0 ? (
        <p className="text-xs text-muted-foreground pt-1">
          Nessuna tipologia prodotto disponibile.
        </p>
      ) : (
        <div className="space-y-2 pt-1">
          {categoriesToRender.map((category) => {
            const Icon = getProductCategoryIcon(category.category);
            return (
              <div
                key={`${week.id}-${category.category}`}
                className="flex items-center gap-2.5"
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: category.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">
                    {category.category}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                    <span>Elem. {category.elementi}</span>
                    <span>Com. {category.commesse}</span>
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground text-right tabular-nums leading-4">
                  <div>P {category.elementiByCalendar.production}</div>
                  <div>I {category.elementiByCalendar.installation}</div>
                  <div>S {category.elementiByCalendar.service}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ProduzioneCalendarWeeklySummary({
  data,
  productCategories,
}: ProduzioneCalendarWeeklySummaryProps) {
  return (
    <div className="dashboard-panel p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-violet-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Commesse calendari: riepilogo 3 settimane</h3>
          <p className="text-xs text-muted-foreground">
            Totale elementi per tipologia prodotto su Produzione, Posa e Service
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {data.map((week) => (
          <WeeklySummaryCard
            key={week.id}
            week={week}
            productCategories={productCategories}
          />
        ))}
      </div>
    </div>
  );
}
