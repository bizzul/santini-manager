"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Home, Mic, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePmContext } from "@/components/personal-manager/pm-context";

interface TabDef {
  label: string;
  href: (base: string) => string;
  match: (base: string, path: string) => boolean;
  icon: ReactNode;
}

const TABS: TabDef[] = [
  {
    label: "Focus",
    href: (base) => `${base}/focus`,
    match: (base, path) => path.startsWith(`${base}/focus`),
    icon: <Mic className="h-5 w-5" />,
  },
  {
    label: "Home",
    href: (base) => base,
    match: (base, path) => path === base,
    icon: <Home className="h-5 w-5" />,
  },
  {
    label: "Today",
    href: (base) => `${base}/today`,
    match: (base, path) => path.startsWith(`${base}/today`),
    icon: <CalendarCheck className="h-5 w-5" />,
  },
  {
    label: "Impostazioni",
    href: (base) => `${base}/settings`,
    match: (base, path) => path.startsWith(`${base}/settings`),
    icon: <Settings className="h-5 w-5" />,
  },
];

export function MobileShell({ children }: { children: ReactNode }) {
  const { base } = usePmContext();
  const pathname = usePathname() ?? base;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[420px] flex-col bg-page">
      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[420px] border-t border-border bg-card/95 backdrop-blur">
        <ul className="grid grid-cols-4">
          {/* VOICE-FIRST v0.2: tab Focus in prima posizione */}
          {TABS.map((tab) => {
            const href = tab.href(base);
            const active = tab.match(base, pathname);
            return (
              <li key={tab.label}>
                <Link
                  href={href}
                  className={cn(
                    "flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.icon}
                  <span className="leading-none">{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/** Chip che dichiara le categorie di appartenenza in cima a ogni schermata. */
export function CategoryChips({
  items,
}: {
  items: { label: string; color?: string }[];
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
        >
          {item.color ? (
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
          ) : null}
          {item.label}
        </span>
      ))}
    </div>
  );
}

/** Header compatto riutilizzabile per le schermate mobile. */
export function PmScreenHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
