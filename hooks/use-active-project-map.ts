"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardProjectLocation } from "@/lib/server-data";
import {
  buildProjectAddress,
  geocodeAddress,
  normalizeProjectLocation,
  type NormalizedProjectLocation,
} from "@/utils/project-location-map";

interface UseActiveProjectMapResult {
  projects: NormalizedProjectLocation[];
  geocoding: boolean;
  unresolvedCount: number;
}

export function useActiveProjectMap(
  projects: DashboardProjectLocation[],
  cacheNamespace: string,
): UseActiveProjectMapResult {
  const [resolvedProjects, setResolvedProjects] = useState<NormalizedProjectLocation[]>([]);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolveCoordinates() {
      if (projects.length === 0) {
        setResolvedProjects([]);
        setGeocoding(false);
        return;
      }

      setGeocoding(true);

      const nextProjects = await Promise.all(
        projects.map(async (project) => {
          const fullAddress = buildProjectAddress(project);
          const hasExistingCoordinates =
            typeof project.latitude === "number" && Number.isFinite(project.latitude) &&
            typeof project.longitude === "number" && Number.isFinite(project.longitude);

          if (hasExistingCoordinates) {
            return normalizeProjectLocation(project, fullAddress, null);
          }

          if (!fullAddress) {
            if (process.env.NODE_ENV === "development") {
              console.debug("[Map] Project skipped, missing valid address", {
                id: project.id,
                name: project.name,
              });
            }
            return normalizeProjectLocation(project, null, null);
          }

          const geocodedPoint = await geocodeAddress(fullAddress, cacheNamespace);
          if (!geocodedPoint && process.env.NODE_ENV === "development") {
            console.debug("[Map] Address not geocodable", {
              id: project.id,
              name: project.name,
              fullAddress,
            });
          }
          return normalizeProjectLocation(project, fullAddress, geocodedPoint);
        }),
      );

      if (!cancelled) {
        setResolvedProjects(nextProjects);
        setGeocoding(false);
      }
    }

    resolveCoordinates();

    return () => {
      cancelled = true;
    };
  }, [cacheNamespace, projects]);

  const unresolvedCount = useMemo(
    () => resolvedProjects.filter((project) => !project.coordinates).length,
    [resolvedProjects],
  );

  return {
    projects: resolvedProjects,
    geocoding,
    unresolvedCount,
  };
}
