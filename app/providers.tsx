"use client";

import { ModalProvider } from "@/components/modal/provider";
import { Providers as ThemeProviders } from "../app/Theme/providers";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient with optimized defaults for performance
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is considered fresh for 5 minutes - won't refetch during this time
            staleTime: 5 * 60 * 1000,
            // Keep unused data in cache for 30 minutes
            gcTime: 30 * 60 * 1000,
            // Don't refetch on window focus for most queries (reduces unnecessary requests)
            refetchOnWindowFocus: false,
            // Retry failed requests only twice
            retry: 2,
            // Don't retry immediately, wait a bit
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ModalProvider>
        <ThemeProviders>{children}</ThemeProviders>
      </ModalProvider>
    </QueryClientProvider>
  );
}
