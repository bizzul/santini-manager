"use client";

import { Search } from "lucide-react";
import { CategoryViewToggle } from "@/components/categories/category-view-toggle";
import { DebouncedInput } from "@/components/debouncedInput";
import type { CategoryViewMode } from "@/types/category-cards";

interface BrowseViewToolbarProps {
  viewMode: CategoryViewMode;
  onViewModeChange: (mode: CategoryViewMode) => void;
  viewToggleDisabled?: boolean;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  searchPlaceholder: string;
  leading?: React.ReactNode;
}

export function BrowseViewToolbar({
  viewMode,
  onViewModeChange,
  viewToggleDisabled = false,
  globalFilter,
  onGlobalFilterChange,
  searchPlaceholder,
  leading,
}: BrowseViewToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      {leading ? <div className="min-w-0 flex-1">{leading}</div> : null}
      <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
        <div className="relative min-w-[12rem] flex-1 sm:w-56 sm:flex-none">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <DebouncedInput
            value={globalFilter}
            onChange={(value) => onGlobalFilterChange(String(value))}
            className="h-9 pl-9"
            placeholder={searchPlaceholder}
          />
        </div>
        <CategoryViewToggle
          value={viewMode}
          onChange={onViewModeChange}
          disabled={viewToggleDisabled}
        />
      </div>
    </div>
  );
}
