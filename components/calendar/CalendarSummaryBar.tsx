"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { getProductCategoryIcon } from "@/lib/calendar-product-styling";

interface SummaryTask {
  deliveryDate?: string | null;
  SellProduct?: { category?: { name?: string | null; color?: string | null } | null } | null;
  sellProduct?: { category?: { name?: string | null; color?: string | null } | null } | null;
}

function getCategoryName(task: SummaryTask): string {
  const cat =
    task.SellProduct?.category?.name ??
    task.sellProduct?.category?.name ??
    "Senza categoria";
  return cat;
}

function getCategoryColor(task: SummaryTask): string {
  const color =
    task.SellProduct?.category?.color ??
    task.sellProduct?.category?.color ??
    "#6b7280";
  return color;
}

export interface CalendarSummaryBarProps {
  tasks: SummaryTask[];
  weekStart: Date | null;
  weekEnd: Date | null;
  monthStart: Date | null;
  monthEnd: Date | null;
}

export function CalendarSummaryBar({
  tasks,
  weekStart,
  weekEnd,
  monthStart,
  monthEnd,
}: CalendarSummaryBarProps) {
  const isInRange = (date: Date, start: Date | null, end: Date | null) => {
    if (!start || !end) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const s = new Date(start);
    s.setHours(0, 0, 0, 0);
    const e = new Date(end);
    e.setHours(23, 59, 59, 999);
    return d >= s && d <= e;
  };

  const tasksInWeek = tasks.filter((t) =>
    t.deliveryDate
      ? isInRange(new Date(t.deliveryDate), weekStart, weekEnd)
      : false
  );
  const tasksInMonth = tasks.filter((t) =>
    t.deliveryDate
      ? isInRange(new Date(t.deliveryDate), monthStart, monthEnd)
      : false
  );

  const groupByCategory = (taskList: SummaryTask[]) => {
    const map = new Map<
      string,
      { count: number; color: string }
    >();
    taskList.forEach((t) => {
      const name = getCategoryName(t);
      const color = getCategoryColor(t);
      const current = map.get(name) || { count: 0, color };
      current.count++;
      map.set(name, current);
    });
    return Array.from(map.entries()).map(([name, { count, color }]) => ({
      name,
      count,
      color,
    }));
  };

  const weekSummary = groupByCategory(tasksInWeek);
  const monthSummary = groupByCategory(tasksInMonth);

  if (weekSummary.length === 0 && monthSummary.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-4 py-3 px-4 mb-4 rounded-lg bg-muted/50 border border-border text-sm">
      {weekSummary.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-muted-foreground">Settimana:</span>
          {weekSummary.map(({ name, count, color }) => {
            const Icon = getProductCategoryIcon(name);
            return (
              <Badge
                key={name}
                variant="secondary"
                className="gap-1 font-normal"
                style={{
                  borderLeftColor: color,
                  borderLeftWidth: "3px",
                  borderLeftStyle: "solid",
                }}
              >
                <Icon className="h-3 w-3" />
                {name} {count}
              </Badge>
            );
          })}
        </div>
      )}
      {weekSummary.length > 0 && monthSummary.length > 0 && (
        <span className="text-muted-foreground">|</span>
      )}
      {monthSummary.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-muted-foreground">Mese:</span>
          {monthSummary.map(({ name, count, color }) => {
            const Icon = getProductCategoryIcon(name);
            return (
              <Badge
                key={name}
                variant="outline"
                className="gap-1 font-normal"
                style={{
                  borderLeftColor: color,
                  borderLeftWidth: "3px",
                  borderLeftStyle: "solid",
                }}
              >
                <Icon className="h-3 w-3" />
                {name} {count}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
