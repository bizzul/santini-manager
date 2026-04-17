"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Orbit } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isCommandDeckEnabled } from "./feature-gate";

interface CommandDeckLauncherProps {
  /** Current site subdomain. */
  domain: string;
}

/** Minimal shape consumed by this component. The sidebar's `fetchSiteData`
 *  stores the full `SiteDataQueryResult` under the same query key; we only
 *  read the flag. */
type SiteDataForLauncher = {
  commandDeckEnabled?: boolean;
};

/**
 * Fetches the minimal site payload from the public API.
 *
 * Duplicated intentionally from `AppSidebar.fetchSiteData` so the launcher
 * subscribes to the same `["site-data", domain]` query key. React Query
 * deduplicates the in-flight request, so this does not double the network
 * cost — it just ensures the launcher re-renders when the cache lands.
 */
async function fetchSiteDataForLauncher(
  domain: string,
): Promise<SiteDataForLauncher> {
  const response = await fetch(`/api/sites/${domain}`);
  if (!response.ok) throw new Error("Failed to fetch site data");
  const data = await response.json();
  return { commandDeckEnabled: Boolean(data.commandDeckEnabled) };
}

/**
 * Small launcher button for the Command Deck.
 *
 * Visibility is driven by the per-site `commandDeckEnabled` flag. We
 * subscribe to the `["site-data", domain]` React Query cache (same entry
 * used by the sidebar) so the button pops in as soon as the flag is known
 * — including the case where the persistent cache was stale and the first
 * render had no data.
 *
 * While the flag is unknown (or explicitly `false`) the component renders
 * `null` so the UI stays pristine on every space where the feature is
 * disabled.
 */
export function CommandDeckLauncher({ domain }: CommandDeckLauncherProps) {
  const pathname = usePathname();

  const { data: siteData } = useQuery<SiteDataForLauncher>({
    queryKey: ["site-data", domain],
    queryFn: () => fetchSiteDataForLauncher(domain),
    enabled: Boolean(domain),
    // Mirror the sidebar's staleTime/gcTime so we share the exact cache
    // entry and don't trigger independent refetches.
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  if (!isCommandDeckEnabled(siteData?.commandDeckEnabled)) return null;

  const href = `/sites/${domain}/command-deck`;
  const isActive = pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={href} aria-label="Open Command Deck">
            <motion.span
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300",
                "focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:ring-offset-2 focus:ring-offset-[hsl(var(--sidebar))]",
                isActive
                  ? [
                      "bg-gradient-to-br from-sky-500 to-sky-600 text-white",
                      "shadow-lg shadow-sky-500/40",
                    ].join(" ")
                  : [
                      "bg-gradient-to-br from-[hsl(var(--sidebar-card))] to-[hsl(var(--sidebar-card-strong))] dark:from-sky-500/20 dark:to-sky-600/20",
                      "text-[hsl(var(--sidebar-foreground))] dark:text-sky-300",
                      "shadow-md hover:shadow-lg hover:shadow-sky-500/20",
                      "hover:from-sky-500/10 hover:to-sky-600/10 dark:hover:from-sky-500/30 dark:hover:to-sky-600/30",
                    ].join(" "),
              )}
            >
              <Orbit className="h-5 w-5" strokeWidth={2} />
              {isActive && (
                <span className="absolute inset-0 rounded-xl ring-1 ring-sky-300/60" />
              )}
            </motion.span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Command Deck
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default CommandDeckLauncher;
