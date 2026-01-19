"use client";

import { ModalProvider } from "@/components/modal/provider";
import { Providers as ThemeProviders } from "../app/Theme/providers";
import { SessionMonitor } from "@/components/session-monitor";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useState, useEffect } from "react";

// Query keys that should be persisted to localStorage
// ONLY persist stable data that doesn't change frequently
// DO NOT persist: kanbans-list, kanban-tasks, tasks, kanban-categories, inventory
// These need to be always fresh for multi-user collaboration
const PERSISTABLE_QUERY_KEYS = [
  "site-modules", // Modules change rarely (admin only)
  "site-data", // Site info changes rarely
  "user-context", // User info changes rarely
  // NOTE: kanban-categories is NOT persisted because it can be created/modified
  // and all users need to see updates immediately
];

// Check if a query should be persisted
function shouldPersistQuery(queryKey: unknown): boolean {
  if (!Array.isArray(queryKey) || queryKey.length === 0) return false;
  const firstKey = queryKey[0];
  return (
    typeof firstKey === "string" && PERSISTABLE_QUERY_KEYS.includes(firstKey)
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Track if we're on the client (for SSR safety)
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Create QueryClient with optimized defaults for performance
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is considered fresh for 5 minutes - won't refetch during this time
            staleTime: 5 * 60 * 1000,
            // Keep unused data in cache for 30 minutes (in memory)
            // For persisted queries, gcTime is longer
            gcTime: 30 * 60 * 1000,
            // Don't refetch on window focus for most queries (reduces unnecessary requests)
            refetchOnWindowFocus: false,
            // Retry failed requests only twice
            retry: 2,
            // Don't retry immediately, wait a bit
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),
          },
        },
      })
  );

  // Create persister only on client side
  const [persister] = useState(() => {
    if (typeof window === "undefined") return undefined;
    return createSyncStoragePersister({
      storage: window.localStorage,
      key: "matris-query-cache",
      // Throttle writes to localStorage
      throttleTime: 1000,
    });
  });

  // If we're on the server or persister isn't ready, render without persistence
  if (!isClient || !persister) {
    return (
      <QueryClientProvider client={queryClient}>
        <ModalProvider>
          <ThemeProviders>
            <SessionMonitor />
            {children}
          </ThemeProviders>
        </ModalProvider>
      </QueryClientProvider>
    );
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        // Cache persists for 24 hours
        maxAge: 1000 * 60 * 60 * 24,
        // Only persist specific stable queries
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Only persist if query was successful and is in our allowed list
            return (
              query.state.status === "success" &&
              shouldPersistQuery(query.queryKey)
            );
          },
        },
      }}
    >
      <ModalProvider>
        <ThemeProviders>
          <SessionMonitor />
          {children}
        </ThemeProviders>
      </ModalProvider>
    </PersistQueryClientProvider>
  );
}
