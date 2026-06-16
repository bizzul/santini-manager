"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  appendFocusSegment,
  type FocusSegment,
} from "@/lib/diagram-focus";

export type DiagramViewParam = "diagram" | "table" | "grid";

/**
 * Reads/writes `view` and `focus` search params for navigable area diagrams.
 * Each `pushFocus` call adds a history entry so `router.back()` works.
 */
export function useDiagramFocus() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const viewParam = searchParams.get("view");
  const isDiagram = viewParam === "diagram";
  const focusPath = searchParams.get("focus");

  const buildHref = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname, searchParams],
  );

  const navigate = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      router.push(buildHref(updates));
    },
    [router, buildHref],
  );

  const setView = useCallback(
    (view: DiagramViewParam) => {
      if (view === "diagram") {
        navigate({ view: "diagram" });
        return;
      }
      navigate({ view: null, focus: null });
    },
    [navigate],
  );

  const pushFocus = useCallback(
    (segment: FocusSegment) => {
      const next = appendFocusSegment(focusPath, segment);
      navigate({ view: "diagram", focus: next });
    },
    [focusPath, navigate],
  );

  const setFocus = useCallback(
    (focus: string | null) => {
      navigate({ view: "diagram", focus });
    },
    [navigate],
  );

  const clearDiagramParams = useCallback(() => {
    navigate({ view: null, focus: null });
  }, [navigate]);

  return {
    viewParam,
    isDiagram,
    focusPath,
    setView,
    pushFocus,
    setFocus,
    clearDiagramParams,
    buildHref,
    navigate,
  };
}
