"use client";

import { cn } from "@/lib/utils";
import React from "react";

import { PageTitle, PageSubtitle } from "@/components/ui/typography";

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

interface PageHeaderProps {
  /** Children are still supported for the legacy free-form composition. */
  children?: React.ReactNode;
  /** When set, renders title on the left automatically. */
  title?: React.ReactNode;
  /** Optional subtitle / muted line under the title. */
  subtitle?: React.ReactNode;
  /** Right-aligned action cluster (buttons, dialogs). */
  actions?: React.ReactNode;
  /** Optional breadcrumbs row above title (e.g. for detail pages). */
  breadcrumbs?: React.ReactNode;
  className?: string;
}

interface PageContentProps {
  children: React.ReactNode;
  /**
   * Layout variant:
   *  - "default" (full bleed, the standard for table pages)
   *  - "narrow" (centered max-w-4xl, for forms / wizards)
   */
  variant?: "default" | "narrow";
  className?: string;
}

/**
 * PageLayout - Outer shell for site pages.
 *
 * Usage A (composed, preferred):
 *   <PageLayout>
 *     <PageHeader title="Clienti" subtitle="..." actions={<DialogCreate />} />
 *     <PageContent>...</PageContent>
 *   </PageLayout>
 *
 * Usage B (legacy free-form):
 *   <PageLayout>
 *     <PageHeader>...</PageHeader>
 *     <PageContent>...</PageContent>
 *   </PageLayout>
 */
export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn("flex flex-col h-full w-full", className)}>
      {children}
    </div>
  );
}

/**
 * PageHeader - Sticky page header.
 * Stays fixed at top while content scrolls. Supports both the typed-prop API
 * (title / subtitle / actions / breadcrumbs) and free-form children.
 */
export function PageHeader({
  children,
  title,
  subtitle,
  actions,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  const hasTypedContent = Boolean(title || subtitle || actions || breadcrumbs);

  return (
    <div
      className={cn(
        "sticky top-0 z-10 bg-page/95 backdrop-blur supports-[backdrop-filter]:bg-page/80",
        "flex flex-col gap-2 border-b shrink-0 px-4 py-4 md:px-6 lg:px-8",
        className
      )}
    >
      {hasTypedContent ? (
        <>
          {breadcrumbs ? (
            <div className="text-sm text-muted-foreground">{breadcrumbs}</div>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            </div>
            {actions ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {actions}
              </div>
            ) : null}
          </div>
          {children ? <div className="pt-2">{children}</div> : null}
        </>
      ) : (
        <div className="flex items-center justify-between gap-4">{children}</div>
      )}
    </div>
  );
}

/**
 * PageContent - Scrollable content area.
 *
 * Variants:
 *  - "default" (table pages, full-width with consistent padding)
 *  - "narrow"  (forms / wizards, centered max-w-4xl)
 */
export function PageContent({
  children,
  variant = "default",
  className,
}: PageContentProps) {
  return (
    <div
      className={cn(
        "flex-1 overflow-auto px-4 py-4 md:px-6 lg:px-8",
        variant === "narrow" && "[&>*]:mx-auto [&>*]:max-w-4xl",
        className
      )}
    >
      {children}
    </div>
  );
}
