"use client";

// Client wrapper required because `UserHomeMinimal` is a Server Component and
// `dynamic(..., { ssr: false })` is only allowed inside Client Components.
// @xyflow/react is heavy and not SSR-compatible, so it must be lazy-loaded.
import dynamic from "next/dynamic";
import type { FlowchartSectionProps } from "./FlowchartSection";

const FlowchartSection = dynamic(() => import("./FlowchartSection"), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[480px] w-full animate-pulse rounded-lg border bg-muted" />
  ),
});

export function FlowchartSectionLazy(props: FlowchartSectionProps) {
  return <FlowchartSection {...props} />;
}
