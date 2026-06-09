"use client";

import React from "react";
import { BellRing, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CalendarProjectCard } from "./CalendarProjectCard";
import type { WeeklyCalendarItem } from "./weekly-calendar-types";

interface PendingProjectsCollapsibleProps {
  items: WeeklyCalendarItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemClick: (item: WeeklyCalendarItem) => void;
}

export function PendingProjectsCollapsible({
  items,
  open,
  onOpenChange,
  onItemClick,
}: PendingProjectsCollapsibleProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="shrink-0 rounded-lg border border-border/60 bg-muted/20"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 sm:px-4"
        >
          <div className="flex min-w-0 items-center gap-2">
            <BellRing className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-semibold">Da definire</span>
            <Badge variant="secondary" className="shrink-0">
              {items.length}
            </Badge>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="max-h-52 overflow-y-auto border-t border-border/60 p-3 sm:max-h-60">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <CalendarProjectCard
                key={item.id}
                item={item}
                compact
                onClick={() => onItemClick(item)}
              />
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
