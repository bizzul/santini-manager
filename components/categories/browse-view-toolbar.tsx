"use client";

import { Search } from "lucide-react";
import { BackButton } from "@/components/layout/back-button";
import { CategoryViewToggle } from "@/components/categories/category-view-toggle";
import { DebouncedInput } from "@/components/debouncedInput";
import type { CategoryViewMode } from "@/types/category-cards";

interface BrowseViewToolbarProps {
  viewMode: CategoryViewMode;
  onViewModeChange: (mode: CategoryViewMode) => void;
  viewToggleDisabled?: boolean;
  showDiagramToggle?: boolean;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  searchPlaceholder: string;
  leading?: React.ReactNode;
  /** When set, shows the back button on this toolbar row. */
  backDomain?: string;
  /** `end` puts search on the left and the back button on the right. */
  backPlacement?: "start" | "end";
}

export function BrowseViewToolbar({
  viewMode,
  onViewModeChange,
  viewToggleDisabled = false,
  showDiagramToggle = false,
  globalFilter,
  onGlobalFilterChange,
  searchPlaceholder,
  leading,
  backDomain,
  backPlacement = "start",
}: BrowseViewToolbarProps) {
  const backButton =
    backDomain ? <BackButton domain={backDomain} /> : null;
  const searchField = (
    <div className="relative min-w-[12rem] w-full flex-1 sm:w-72 sm:flex-none">
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
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {backPlacement === "start" ? backButton : searchField}
        {leading ? <div className="min-w-0 flex-1">{leading}</div> : null}
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
        {backPlacement === "start" ? searchField : null}
        <CategoryViewToggle
          value={viewMode}
          onChange={onViewModeChange}
          disabled={viewToggleDisabled}
          showDiagram={showDiagramToggle}
        />
        {backPlacement === "end" ? backButton : null}
      </div>
    </div>
  );
}
