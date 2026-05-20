"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MobileWorkflowLayoutProps {
  /** Title shown in the top bar */
  title: React.ReactNode;
  /** Optional subtitle below the title */
  subtitle?: React.ReactNode;
  /** Back navigation. If `string`, renders a Link; if a function, renders a button. */
  back?: { href: string } | { onClick: () => void };
  /** Right-aligned actions in the top bar */
  actions?: React.ReactNode;
  /** Sticky footer / primary action row */
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * MobileWorkflowLayout - Full-bleed layout for shop-floor / tablet workflows.
 *
 * Used by `boxing/edit`, `qualityControl/edit`, `inventory/edit/[id]`.
 * High contrast, large touch targets, but derived from theme tokens
 * (`bg-page-shadow`, `text-foreground`) instead of hard-coded `bg-[#1A2027]`.
 *
 * Always pairs with `@/components/ui/button` for actions.
 */
export function MobileWorkflowLayout({
  title,
  subtitle,
  back,
  actions,
  footer,
  children,
  className,
}: MobileWorkflowLayoutProps) {
  const renderBack = () => {
    if (!back) return null;
    if ("href" in back) {
      return (
        <Button
          asChild
          variant="ghost"
          size="icon"
          aria-label="Indietro"
        >
          <Link href={back.href}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
      );
    }
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Indietro"
        onClick={back.onClick}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
    );
  };

  return (
    <div
      className={cn(
        "flex min-h-screen w-full flex-col bg-page-shadow text-foreground",
        className
      )}
    >
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-page/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-page/80 md:px-6">
        {renderBack()}
        <div className="flex min-w-0 flex-1 flex-col">
          {typeof title === "string" ? (
            <h1 className="truncate text-lg font-semibold leading-tight md:text-xl">
              {title}
            </h1>
          ) : (
            title
          )}
          {subtitle ? (
            typeof subtitle === "string" ? (
              <p className="truncate text-xs text-muted-foreground md:text-sm">
                {subtitle}
              </p>
            ) : (
              subtitle
            )
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </header>

      <main className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </main>

      {footer ? (
        <footer className="sticky bottom-0 z-20 border-t bg-page/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-page/80 md:px-6">
          <div className="mx-auto w-full max-w-3xl">{footer}</div>
        </footer>
      ) : null}
    </div>
  );
}

interface MobileWorkflowCardProps {
  selected?: boolean;
  status?: "default" | "success" | "warning" | "danger";
  onClick?: () => void;
  asChild?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * MobileWorkflowCard - High-contrast selectable card for shop-floor lists.
 * Status colors are derived from semantic tokens; no raw greens/reds.
 */
export function MobileWorkflowCard({
  selected,
  status = "default",
  onClick,
  className,
  children,
}: MobileWorkflowCardProps) {
  const statusClass =
    status === "success"
      ? "border-emerald-500/60"
      : status === "warning"
        ? "border-amber-500/60"
        : status === "danger"
          ? "border-destructive/60"
          : "border-border";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-left text-card-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        statusClass,
        selected && "ring-2 ring-primary",
        className
      )}
    >
      {children}
    </button>
  );
}
