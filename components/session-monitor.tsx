"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const log = logger.scope("SessionMonitor");

/**
 * Component that monitors the current user's status in real-time.
 * If the user is deactivated (enabled = false), forces logout immediately.
 * 
 * This component should be placed high in the component tree (e.g., in providers.tsx)
 */
export function SessionMonitor() {
    const channelRef = useRef<RealtimeChannel | null>(null);
    const supabaseRef = useRef(createClient());
    const userIdRef = useRef<string | null>(null);

    useEffect(() => {
        const supabase = supabaseRef.current;

        // Get the current user and set up monitoring
        async function setupMonitor() {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                log.debug("No user logged in, skipping session monitor");
                return;
            }

            // If we're already monitoring this user, don't set up again
            if (userIdRef.current === user.id && channelRef.current) {
                return;
            }

            // Clean up previous channel if exists
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }

            userIdRef.current = user.id;
            const channelName = `user-status-${user.id}`;

            log.debug("Setting up session monitor for user:", user.id);

            // Subscribe to changes on the User table for this specific user
            const channel = supabase
                .channel(channelName)
                .on(
                    "postgres_changes",
                    {
                        event: "UPDATE",
                        schema: "public",
                        table: "User",
                        filter: `authId=eq.${user.id}`,
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
                        log.info("Session monitor active for user:", user.id);
                    } else if (status === "CHANNEL_ERROR") {
                        log.error("Session monitor subscription error");
                    }
                });

            channelRef.current = channel;
        }

        setupMonitor();

        // Also listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
            if (event === "SIGNED_IN" && session?.user) {
                setupMonitor();
            } else if (event === "SIGNED_OUT") {
                if (channelRef.current) {
                    supabase.removeChannel(channelRef.current);
                    channelRef.current = null;
                    userIdRef.current = null;
                }
            }
        });

        // Cleanup on unmount
        return () => {
            subscription.unsubscribe();
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, []);

    // This component doesn't render anything
    return null;
}
