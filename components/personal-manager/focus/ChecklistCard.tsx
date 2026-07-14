"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type {
  PmChecklistItem,
  PmEntityType,
} from "@/lib/personal-manager/voice-types";

type Props = {
  voiceNoteId: string;
  items: PmChecklistItem[];
};

const TYPE_COLOR: Record<PmEntityType | "generale", string> = {
  progetto: "#5db8dd",
  azienda: "#f5a623",
  persona: "#2f9e6e",
  generale: "#1c2733",
};

type Group = {
  key: string;
  title: string;
  type: PmEntityType | "generale";
  items: PmChecklistItem[];
};

function groupByEntity(items: PmChecklistItem[]): Group[] {
  const map = new Map<string, Group>();
  for (const item of items) {
    const ent = item.pm_entities;
    const key = ent?.id ?? "generale";
    const title = ent?.name ?? "Generale";
    const type = (ent?.type as PmEntityType | undefined) ?? "generale";
    if (!map.has(key)) {
      map.set(key, { key, title, type, items: [] });
    }
    map.get(key)!.items.push(item);
  }
  return [...map.values()].sort((a, b) => {
    if (a.key === "generale") return 1;
    if (b.key === "generale") return -1;
    return a.title.localeCompare(b.title, "it");
  });
}

export function ChecklistCard({ items }: Props) {
  const [local, setLocal] = useState(items);

  useEffect(() => {
    setLocal(items);
  }, [items]);

  if (local.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Nessuna checklist per questa nota.
      </p>
    );
  }

  async function toggle(item: PmChecklistItem) {
    const next = !item.done;
    setLocal((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, done: next } : i)),
    );
    const supabase = createClient();
    const { error } = await supabase
      .from("pm_checklist_items")
      .update({ done: next })
      .eq("id", item.id);
    if (error) {
      setLocal((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, done: item.done } : i)),
      );
      console.error("[ChecklistCard]", error.message);
    }
  }

  const groups = groupByEntity(local);

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.key}>
          <span
            className="mb-1.5 inline-block rounded-md px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-primary-foreground"
            style={{ backgroundColor: TYPE_COLOR[g.type] }}
          >
            {g.title}
          </span>
          <ul className="space-y-1">
            {g.items.map((item) => (
              <li key={item.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => void toggle(item)}
                  className="mt-1 h-4 w-4 accent-primary"
                  aria-label={item.label}
                />
                <span
                  className={
                    item.done
                      ? "text-muted-foreground line-through"
                      : "text-foreground"
                  }
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
