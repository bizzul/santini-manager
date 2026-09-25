"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BellRing, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WeeklyCalendarItem } from "../weekly-calendar-types";
import { EventCard } from "./EventCard";

const STORAGE_PREFIX = "fdm:calendar:pending-panel:";

function readStoredOpen(storageKey: string): boolean | null {
  try {
    const value = window.localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`);
    return value === null ? null : value === "open";
  } catch {
    return null;
  }
}

function writeStoredOpen(storageKey: string, open: boolean) {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, open ? "open" : "closed");
  } catch {
    // localStorage non disponibile (modalita' privata, quota): stato solo in memoria.
  }
}

interface PendingSidePanelProps {
  items: WeeklyCalendarItem[];
  /** Chiave per ricordare aperto/chiuso (id utente). */
  storageKey: string;
  draggable?: boolean;
  onItemClick?: (item: WeeklyCalendarItem) => void;
}

/** Pannello laterale destro "Da definire": sorgente drag verso i giorni. */
export function PendingSidePanel({
  items,
  storageKey,
  draggable = true,
  onItemClick,
}: PendingSidePanelProps) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const stored = readStoredOpen(storageKey);
    if (stored !== null) setOpen(stored);
  }, [storageKey]);

  const toggle = useCallback(() => {
    setOpen((current) => {
      writeStoredOpen(storageKey, !current);
      return !current;
    });
  }, [storageKey]);

  if (!open) {
    return (
      <aside className="flex w-10 shrink-0 flex-col items-center gap-2 rounded-lg border border-border/60 bg-card py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggle}
          aria-label="Apri pannello Da definire"
          title="Apri pannello Da definire"
        >
          <PanelRightOpen className="h-4 w-4" />
        </Button>
        <BellRing className="h-4 w-4 text-warning" />
        <Badge variant="secondary" className="px-1.5">
          {items.length}
        </Badge>
      </aside>
    );
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-hidden rounded-lg border border-border/60 bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <BellRing className="h-4 w-4 shrink-0 text-warning" />
          <span className="text-body-sm font-semibold">Da definire</span>
          <Badge variant="secondary" className="shrink-0">
            {items.length}
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggle}
          aria-label="Chiudi pannello Da definire"
          title="Chiudi pannello"
        >
          <PanelRightClose className="h-4 w-4" />
        </Button>
      </div>
      <p className="border-b border-border/60 px-3 py-1.5 text-caption text-muted-foreground">
        Trascina su un giorno per pianificare
      </p>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
        {items.length === 0 ? (
          <p className="px-1 py-6 text-center text-caption text-muted-foreground">
            Nessun progetto da definire.
          </p>
        ) : (
          items.map((item) => (
            <div key={item.id}>
              <EventCard
                item={item}
                variant="split"
                draggable={draggable}
                onClick={onItemClick ? () => onItemClick(item) : undefined}
              />
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
