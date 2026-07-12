"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { logger } from "@/lib/logger";

const log = logger.scope("OverviewConnector:realtime");

/**
 * Sottoscrizione Supabase Realtime per la Overview Connector.
 *
 * Se sposto una card dal telefono, la dashboard sul desktop si aggiorna da
 * sola: senza questo, con due Mac + telefono le viste divergono e il sistema
 * perde la sua unica proprieta' utile (essere l'unica fonte di verita').
 *
 * Ascolta `attivita` (filtrata per site_id) e le tre join table del grafo,
 * poi fa un router.refresh() debounced che rifa' il fetch server.
 */
export function OverviewRealtime({ siteId }: { siteId: string }) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    if (!siteId) return;
    const supabase = supabaseRef.current;

    const scheduleRefresh = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => router.refresh(), 300);
    };

    const channel = supabase
      .channel(`overview-connector-${siteId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attivita",
          filter: `site_id=eq.${siteId}`,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attivita_progetti" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attivita_aziende" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attivita_persone" },
        scheduleRefresh,
      )
      .subscribe((status: string) => {
        if (status === "CHANNEL_ERROR") {
          log.error("Realtime subscription error");
        }
      });

    channelRef.current = channel;

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [siteId, router]);

  return null;
}
