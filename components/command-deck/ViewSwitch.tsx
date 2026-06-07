"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type CommandDeckViewId = "galaxy" | "activities";

interface ViewSwitchProps {
  domain: string;
  active: CommandDeckViewId;
}

const VIEWS: Array<{ id: CommandDeckViewId; label: string; path: string }> = [
  { id: "galaxy", label: "Command Deck", path: "command-deck" },
  { id: "activities", label: "Attività", path: "command-deck/attivita" },
];

export function ViewSwitch({ domain, active }: ViewSwitchProps) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border/70 bg-surface-strong/80 p-1 shadow-lg shadow-black/40 backdrop-blur">
      {VIEWS.map((view) => {
        const isActive = view.id === active;
        const href = `/sites/${domain}/${view.path}`;
        return (
          <Link
            key={view.id}
            href={href}
            className={cn(
              "relative rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors md:px-4 md:text-[11px]",
              isActive ? "text-background" : "text-foreground/80 hover:text-foreground",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="deck-view-pill"
                className="absolute inset-0 rounded-full bg-foreground"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <span className="relative z-10">{view.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
