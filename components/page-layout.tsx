"use client";

import { cn } from "@/lib/utils";
import React, { createContext, useContext } from "react";

import { PageTitle, PageSubtitle } from "@/components/ui/typography";

/**
 * Larghezza della pagina su desktop:
 *  - "contained" (default): contenuto centrato entro --content-max (1680px);
 *    fino a 1920px di schermo non cambia nulla, sui monitor larghi evita
 *    tabelle e form stirati su 2000+ px.
 *  - "full": tutta la larghezza disponibile (calendari, board, mappe).
 */
export type PageWidth = "contained" | "full";

const PageWidthContext = createContext<PageWidth>("contained");

const INLINE_PADDING: Record<PageWidth, string> = {
  contained: "px-4 md:px-6 lg:page-inline-contained",
  full: "px-4 md:px-6 lg:px-8",
};

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
  width?: PageWidth;
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
export function PageLayout({
  children,
  className,
  width = "contained",
}: PageLayoutProps) {
  return (
    <PageWidthContext.Provider value={width}>
      <div
        data-page-width={width}
        className={cn("flex flex-col h-full w-full", className)}
      >
        {children}
      </div>
    </PageWidthContext.Provider>
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
  const width = useContext(PageWidthContext);

  return (
    <div
      className={cn(
        "sticky top-0 z-10 bg-page/95 backdrop-blur supports-[backdrop-filter]:bg-page/80",
        "flex flex-col gap-2 border-b shrink-0 py-4",
        INLINE_PADDING[width],
        className
      )}
    >
      {hasTypedContent ? (
        <>
          {breadcrumbs ? (
            <div className="text-sm text-page-muted-foreground">{breadcrumbs}</div>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
              {title ? (
                typeof title === "string" ? (
                  <PageTitle className="text-page-foreground">{title}</PageTitle>
                ) : (
                  title
                )
              ) : null}
              {subtitle ? (
                typeof subtitle === "string" ? (
                  <PageSubtitle className="text-page-muted-foreground">
                    {subtitle}
                  </PageSubtitle>
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
  const width = useContext(PageWidthContext);
  return (
    <div
      className={cn(
        "flex-1 overflow-auto py-4",
        INLINE_PADDING[width],
        variant === "narrow" && "[&>*]:mx-auto [&>*]:max-w-4xl",
        className
      )}
    >
      {children}
    </div>
  );
}
