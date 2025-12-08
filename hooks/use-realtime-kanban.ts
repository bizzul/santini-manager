"use client";

import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

// Scoped logger for realtime events
const log = logger.scope("Realtime");

type RealtimePayload = {
    eventType: "INSERT" | "UPDATE" | "DELETE";
    new: Record<string, any>;
    old: Record<string, any>;
    table: string;
};

type RealtimeCallback = (payload: RealtimePayload) => void;

/**
 * Hook for subscribing to Supabase Realtime changes on Kanban tasks.
 * When any user moves a card, all other users see the update in real-time.
 *
 * @param siteId - The site ID to filter changes
 * @param onTaskChange - Optional callback when a task changes
 * @returns Object with connection status
 */
export function useRealtimeKanban(
    siteId: string | null,
    onTaskChange?: RealtimeCallback,
) {
    const queryClient = useQueryClient();
    const channelRef = useRef<RealtimeChannel | null>(null);
    const supabaseRef = useRef(createClient());

    const handleChange = useCallback(
        (payload: RealtimePayload) => {
            log.debug("Kanban update received:", payload.eventType, payload);

            // Call custom callback if provided
            if (onTaskChange) {
                onTaskChange(payload);
            }

            // Invalidate React Query cache to trigger refetch
            queryClient.invalidateQueries({ queryKey: ["kanban-tasks"] });
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
        [queryClient, onTaskChange],
    );

    useEffect(() => {
        if (!siteId) return;

        const supabase = supabaseRef.current;

        // Create a unique channel name for this site
        const channelName = `kanban-realtime-${siteId}`;

        // Subscribe to Task table changes for this site
        const channel = supabase
            .channel(channelName)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "Task",
                    filter: `site_id=eq.${siteId}`,
                },
                (payload) =>
                    handleChange({
                        eventType: "INSERT",
                        new: payload.new,
                        old: payload.old as Record<string, any>,
                        table: "Task",
                    }),
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "Task",
                    filter: `site_id=eq.${siteId}`,
                },
                (payload) =>
                    handleChange({
                        eventType: "UPDATE",
                        new: payload.new,
                        old: payload.old as Record<string, any>,
                        table: "Task",
                    }),
            )
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "Task",
                    filter: `site_id=eq.${siteId}`,
                },
                (payload) =>
                    handleChange({
                        eventType: "DELETE",
                        new: payload.new as Record<string, any>,
                        old: payload.old as Record<string, any>,
                        table: "Task",
                    }),
            )
            .subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    log.info(
                        `Subscribed to kanban updates for site: ${siteId}`,
                    );
                } else if (status === "CHANNEL_ERROR") {
                    log.error("Realtime subscription error");
                }
            });

        channelRef.current = channel;

        // Cleanup on unmount or siteId change
        return () => {
            log.debug(`Unsubscribing from kanban realtime: ${siteId}`);
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [siteId, handleChange]);

    return {
        isSubscribed: !!channelRef.current,
    };
}

/**
 * Hook for subscribing to multiple tables for a complete Kanban experience.
 * Subscribes to: Task, KanbanColumn changes
 */
export function useRealtimeKanbanFull(siteId: string | null) {
    const queryClient = useQueryClient();
    const channelRef = useRef<RealtimeChannel | null>(null);
    const supabaseRef = useRef(createClient());

    useEffect(() => {
        if (!siteId) return;

        const supabase = supabaseRef.current;
        const channelName = `kanban-full-${siteId}`;

        const channel = supabase
            .channel(channelName)
            // Task changes
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "Task",
                    filter: `site_id=eq.${siteId}`,
                },
                () => {
                    queryClient.invalidateQueries({
                        queryKey: ["kanban-tasks"],
                    });
                    queryClient.invalidateQueries({ queryKey: ["tasks"] });
                },
            )
            // KanbanColumn changes (column reordering, etc.)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "KanbanColumn",
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["kanban"] });
                    queryClient.invalidateQueries({ queryKey: ["kanbans"] });
                },
            )
            .subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    log.info(`Full kanban realtime active for site: ${siteId}`);
                }
            });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [siteId, queryClient]);

    return { isSubscribed: !!channelRef.current };
}
