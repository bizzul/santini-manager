"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Orbit } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
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

/**
 * Small launcher button for the Command Deck.
 *
 * Visibility is driven by the per-site `commandDeckEnabled` flag, which is
 * hydrated server-side into the React Query cache (`["site-data", domain]`)
 * by the site layout. We read it directly from the cache — no extra fetch.
 *
 * When the flag is `true` the button sits next to the site logo in the
 * sidebar header and navigates to `/sites/{domain}/command-deck`. When the
 * flag is `false` (or not yet hydrated) the component renders `null` so
 * the UI stays pristine on every space where the feature is disabled.
 */
export function CommandDeckLauncher({ domain }: CommandDeckLauncherProps) {
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const siteData = queryClient.getQueryData<{
    commandDeckEnabled?: boolean;
  }>(["site-data", domain]);

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
