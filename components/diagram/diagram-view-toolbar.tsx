"use client";

import { BackButton } from "@/components/layout/back-button";
import {
  AreaViewSwitcher,
  type AreaViewMode,
} from "@/components/diagram/area-view-switcher";
import { cn } from "@/lib/utils";

interface DiagramViewToolbarProps {
  domain: string;
  value: AreaViewMode;
  onChange: (mode: AreaViewMode) => void;
  disabled?: boolean;
  leading?: React.ReactNode;
  className?: string;
}

/** Toolbar row: back button on the left, table/diagram toggle on the right. */
export function DiagramViewToolbar({
  domain,
  value,
  onChange,
  disabled = false,
  leading,
  className,
}: DiagramViewToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <BackButton domain={domain} />
        {leading ? <div className="min-w-0">{leading}</div> : null}
      </div>
      <AreaViewSwitcher
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
