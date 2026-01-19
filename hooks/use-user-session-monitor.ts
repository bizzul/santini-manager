"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const log = logger.scope("SessionMonitor");

/**
 * Hook that monitors the current user's status in real-time.
 * If the user is deactivated (enabled = false), forces logout immediately.
 * 
 * @param userId - The current user's auth ID
 */
export function useUserSessionMonitor(userId: string | null | undefined) {
    const channelRef = useRef<RealtimeChannel | null>(null);
    const supabaseRef = useRef(createClient());

    useEffect(() => {
        if (!userId) return;

        const supabase = supabaseRef.current;
        const channelName = `user-status-${userId}`;

        log.debug("Setting up session monitor for user:", userId);

        // Subscribe to changes on the User table for this specific user
        const channel = supabase
            .channel(channelName)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "User",
                    filter: `authId=eq.${userId}`,
                },
                async (payload: any) => {
                    log.debug("User record updated:", payload);

                    // Check if user was deactivated
                    if (payload.new && payload.new.enabled === false) {
                        log.info("User deactivated, forcing logout");
                        
                        // Sign out and redirect to login
                        await supabase.auth.signOut();
                        
                        // Redirect to login with a message
                        window.location.href = "/login?deactivated=true";
                    }
                }
            )
            .subscribe((status: string) => {
                if (status === "SUBSCRIBED") {
                    log.info("Session monitor active for user:", userId);
                } else if (status === "CHANNEL_ERROR") {
                    log.error("Session monitor subscription error");
                }
            });

        channelRef.current = channel;

        // Cleanup on unmount
        return () => {
            log.debug("Cleaning up session monitor for user:", userId);
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [userId]);

    return { isMonitoring: !!channelRef.current };
}
