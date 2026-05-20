import * as React from "react";

import { cn } from "@/lib/utils";
import { SectionTitle, SectionSubtitle } from "@/components/ui/typography";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * EmptyState - Standard empty placeholder for pages and sections.
 *
 * Replaces ad-hoc patterns like `<h1 className="font-bold text-2xl">No data</h1>`
 * Used inside PageContent or any container. Renders a dashed card with optional
 * icon, title, description and CTA.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-card/50 px-6 py-12 text-center",
        className
      )}
    >
      {icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <SectionTitle>{title}</SectionTitle>
      {description ? <SectionSubtitle>{description}</SectionSubtitle> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
