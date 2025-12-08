"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

interface PageHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * PageLayout - A layout component for consistent page structure
 * 
 * Usage:
 * <PageLayout>
 *   <PageHeader>
 *     <h1>Title</h1>
 *     <Button>Create</Button>
 *   </PageHeader>
 *   <PageContent>
 *     <Table />
 *   </PageContent>
 * </PageLayout>
 */
export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn("flex flex-col h-full w-full", className)}>
      {children}
    </div>
  );
}

/**
 * PageHeader - Sticky header section for page title and action buttons
 * Stays fixed at top while content scrolls
 */
export function PageHeader({ children, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "flex items-center justify-between gap-4 px-4 py-4 md:px-6 lg:px-8",
        "border-b shrink-0",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * PageContent - Scrollable content area for tables and main content
 */
export function PageContent({ children, className }: PageContentProps) {
  return (
    <div className={cn("flex-1 overflow-auto px-4 py-4 md:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}

