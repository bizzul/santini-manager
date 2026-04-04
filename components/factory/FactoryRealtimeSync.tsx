"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeKanbanFull, type RealtimePayload } from "@/hooks/use-realtime-kanban";

interface FactoryRealtimeSyncProps {
  siteId: string;
  kanbanIds: number[];
}

export function FactoryRealtimeSync({
  siteId,
  kanbanIds,
}: FactoryRealtimeSyncProps) {
  const router = useRouter();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kanbanIdSet = useMemo(() => new Set(kanbanIds), [kanbanIds]);

  useRealtimeKanbanFull(siteId, (payload: RealtimePayload) => {
    const rawAffectedKanbanIds =
      payload.table === "Kanban"
        ? [payload.new?.id, payload.old?.id]
        : [payload.new?.kanbanId, payload.old?.kanbanId];

    const affectedKanbanIds = rawAffectedKanbanIds
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    if (!affectedKanbanIds.some((kanbanId) => kanbanIdSet.has(kanbanId))) {
      return;
    }

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = setTimeout(() => {
      router.refresh();
    }, 250);
  });

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  return null;
}
