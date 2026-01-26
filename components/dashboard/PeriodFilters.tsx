"use client";

import { useState } from "react";
import { Calendar, Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateRangePicker, DateRangePickerValue } from "@/components/ui/date-range-picker";
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, endOfWeek, endOfMonth, endOfQuarter, endOfYear } from "date-fns";
import { it as dateFnsIt } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Period = "week" | "month" | "quarter" | "year" | "custom";

interface PeriodFiltersProps {
  onPeriodChange?: (period: Period, dateRange?: DateRangePickerValue) => void;
}

export default function PeriodFilters({ onPeriodChange }: PeriodFiltersProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("week");
  const [customDateRange, setCustomDateRange] = useState<DateRangePickerValue>({
    from: undefined,
    to: undefined,
  });
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const now = new Date();

  const handlePeriodClick = (period: Period) => {
    setSelectedPeriod(period);
    if (period !== "custom") {
      let from: Date;
      let to: Date;

      switch (period) {
        case "week":
          from = startOfWeek(now, { locale: dateFnsIt });
          to = endOfWeek(now, { locale: dateFnsIt });
          break;
        case "month":
          from = startOfMonth(now);
          to = endOfMonth(now);
          break;
        case "quarter":
          from = startOfQuarter(now);
          to = endOfQuarter(now);
          break;
        case "year":
          from = startOfYear(now);
          to = endOfYear(now);
          break;
        default:
          from = now;
          to = now;
      }

      onPeriodChange?.(period, { from, to });
    } else {
      setIsCustomOpen(true);
    }
  };

  const handleCustomDateChange = (range: DateRangePickerValue) => {
    setCustomDateRange(range);
    if (range.from && range.to) {
      setIsCustomOpen(false);
      onPeriodChange?.("custom", range);
    }
  };

  const periodButtons = [
    { key: "week" as Period, label: "Questa settimana" },
    { key: "month" as Period, label: "Mese" },
    { key: "quarter" as Period, label: "Trimestre" },
    { key: "year" as Period, label: "Anno" },
  ];

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {/* Segmented control for period filters */}
      <div className="flex items-center">
        {periodButtons.map((btn, index) => {
          const isActive = selectedPeriod === btn.key;
          const isFirst = index === 0;
          const isLast = index === periodButtons.length - 1;
          
          return (
            <button
              key={btn.key}
              onClick={() => handlePeriodClick(btn.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap relative",
                // Base styles
                "border border-slate-700",
                // Rounded corners only on first and last
                isFirst && "rounded-l-lg",
                isLast && "rounded-r-lg",
                // Remove left border for all except first to create intersection
                !isFirst && "-ml-px",
                // Active state
                isActive
                  ? "bg-slate-700 text-white z-10"
                  : "bg-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-700/50"
              )}
            >
              {btn.label}
            </button>
          );
        })}
      </div>

      {/* Custom date picker */}
      <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "text-xs bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700",
              selectedPeriod === "custom" && "bg-slate-700"
            )}
          >
            <Calendar className="w-3 h-3 mr-2" />
            Custom
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="end">
          <DateRangePicker
            value={customDateRange}
            onValueChange={handleCustomDateChange}
            placeholder="Seleziona periodo"
          />
        </PopoverContent>
      </Popover>

      {/* Filter dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="text-xs bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700"
          >
            <Filter className="w-3 h-3 mr-2" />
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
          {/* Add filter options here if needed */}
          <div className="p-2 text-sm text-slate-300">Filtri disponibili</div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
