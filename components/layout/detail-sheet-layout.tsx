import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { PageTitle, PageSubtitle } from "@/components/ui/typography";

interface DetailSheetLayoutProps {
  /** Back-navigation href */
  backHref: string;
  /** Back-navigation label */
  backLabel?: string;
  /**
   * Title displayed in the bordered header card.
   * When omitted, the layout renders only the outer shell (container + back
   * link) and `children` are placed directly inside, allowing pages to define
   * their own bordered card (used by `progetti/[id]`).
   */
  title?: React.ReactNode;
  /** Optional subtitle / metadata under the title */
  subtitle?: React.ReactNode;
  /** Optional row of badges, code, etc. shown between subtitle and actions */
  meta?: React.ReactNode;
  /** Right-aligned action cluster */
  actions?: React.ReactNode;
  /**
   * Optional accent color for the left card border (e.g. category color).
   * MUST be a CSS color (token or hex) – the component does NOT generate
   * Tailwind classes from it.
   */
  accentColor?: string;
  /** Maximum width of the inner container. Defaults to `max-w-6xl`. */
  maxWidth?: "max-w-4xl" | "max-w-5xl" | "max-w-6xl" | "max-w-7xl";
  children: React.ReactNode;
  className?: string;
}

/**
 * DetailSheetLayout - Page shell for record detail views.
 *
 * Replaces the ad-hoc `max-w-6xl px-4 py-6 min-h-screen` pattern used by
 * `products/[id]` and `progetti/[id]`. Provides:
 *  - Back link
 *  - Title + subtitle + meta + actions header
 *  - A bordered "sheet" content card using `bg-card` (no slate/dark overrides)
 *  - Optional accent color rendered via inline style (left border)
 */
export function DetailSheetLayout({
  backHref,
  backLabel = "Indietro",
  title,
  subtitle,
  meta,
  actions,
  accentColor,
  maxWidth = "max-w-6xl",
  children,
  className,
}: DetailSheetLayoutProps) {
  const hasInnerHeader = Boolean(title || subtitle || meta || actions);

  return (
    <div className={cn("min-h-full w-full bg-transparent", className)}>
      <div className={cn("container mx-auto px-4 py-6 md:px-6 lg:px-8", maxWidth)}>
        <div className="mb-6">
          <Link
            href={backHref}
            className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Link>
        </div>

        {hasInnerHeader ? (
          <div
            className="relative overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-md"
            style={
              accentColor
                ? {
                    borderLeftWidth: "6px",
                    borderLeftStyle: "solid",
                    borderLeftColor: accentColor,
                  }
                : undefined
            }
          >
            <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-start sm:justify-between lg:p-6">
              <div className="flex min-w-0 flex-col gap-1">
                {title ? (
                  typeof title === "string" ? (
                    <PageTitle>{title}</PageTitle>
                  ) : (
                    title
                  )
                ) : null}
                {subtitle ? (
                  typeof subtitle === "string" ? (
                    <PageSubtitle>{subtitle}</PageSubtitle>
                  ) : (
                    subtitle
                  )
                ) : null}
                {meta ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {meta}
                  </div>
                ) : null}
              </div>
              {actions ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {actions}
                </div>
              ) : null}
            </div>

            <div className="space-y-6 p-5 lg:p-6">{children}</div>
          </div>
        ) : (
          <div className="space-y-6">{children}</div>
        )}
      </div>
    </div>
  );
}

interface DetailSheetSectionProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * DetailSheetSection - Standard section block to use inside DetailSheetLayout.
 * Renders a bordered surface with optional title/description/actions.
 */
export function DetailSheetSection({
  title,
  description,
  actions,
  children,
  className,
}: DetailSheetSectionProps) {
  return (
    <section
      className={cn(
        "rounded-xl border bg-card/60 p-4 lg:p-5",
        className
      )}
    >
      {(title || actions) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            {title ? (
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
            ) : null}
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}
