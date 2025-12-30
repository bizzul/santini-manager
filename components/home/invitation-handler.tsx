"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Loader2 } from "lucide-react";

export function InvitationHandler() {
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleInvitation = async () => {
      // Check if we have an access token in the URL hash (from Supabase invitation)
      const hash = window.location.hash;
      
      if (!hash) return;

      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");

      console.log("[InvitationHandler] Hash params:", { 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken, 
        type 
      });

      // If this is an invitation (type=invite or we have tokens)
      if (accessToken || type === "invite") {
        setIsProcessing(true);

        try {
          const supabase = createClient();

          // If we have tokens, set the session
          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error("[InvitationHandler] Failed to set session:", error.message);
              setIsProcessing(false);
              return;
            }

            console.log("[InvitationHandler] Session set for user:", data.user?.id);
          }

          // Get the current user
          const { data: { user }, error: userError } = await supabase.auth.getUser();

          if (userError || !user) {
            console.error("[InvitationHandler] Failed to get user:", userError?.message);
            setIsProcessing(false);
            return;
          }

          console.log("[InvitationHandler] User found:", user.id, user.email);

          // Look up user profile
          const { data: userProfile, error: profileError } = await supabase
            .from("User")
            .select("authId, email, given_name, family_name, role, enabled")
            .eq("authId", user.id)
            .single();

          if (profileError && profileError.code !== "PGRST116") {
            console.error("[InvitationHandler] Profile lookup error:", profileError.message);
          }

          console.log("[InvitationHandler] User profile:", userProfile);

          // Get user's organizations
          const { data: userOrgs } = await supabase
            .from("user_organizations")
            .select("organization_id")
            .eq("user_id", user.id);

          const organizationIds = userOrgs?.map(uo => uo.organization_id).join(",") || "";

          // Get user's sites
          const { data: userSites } = await supabase
            .from("user_sites")
            .select("site_id")
            .eq("user_id", user.id);

          const siteIds = userSites?.map(us => us.site_id).join(",") || "";

          // If user profile exists and is enabled, go to site selection
          if (userProfile && userProfile.enabled) {
            console.log("[InvitationHandler] User already enabled, redirecting to sites/select");
            // Clear the hash to prevent loops
            window.history.replaceState(null, "", window.location.pathname);
            router.push("/sites/select");
            return;
          }

          // Build redirect URL to complete-signup
          const completeSignupParams = new URLSearchParams({
            email: userProfile?.email || user.email || "",
            name: userProfile?.given_name || user.user_metadata?.name || "",
            last_name: userProfile?.family_name || user.user_metadata?.last_name || "",
            role: userProfile?.role || user.user_metadata?.role || "user",
          });

          if (organizationIds) {
            completeSignupParams.set("organizations", organizationIds);
          }
          if (siteIds) {
            completeSignupParams.set("sites", siteIds);
          }

          console.log("[InvitationHandler] Redirecting to complete-signup with params:", completeSignupParams.toString());

          // Clear the hash to prevent loops
          window.history.replaceState(null, "", window.location.pathname);
          router.push(`/auth/complete-signup?${completeSignupParams.toString()}`);
        } catch (error) {
          console.error("[InvitationHandler] Error processing invitation:", error);
          setIsProcessing(false);
        }
      }
    };

    handleInvitation();
  }, [router]);

  if (!isProcessing) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white/10 border border-white/20 rounded-xl p-8 flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
        <p className="text-white text-lg">Elaborazione invito...</p>
        <p className="text-white/60 text-sm">Attendere prego</p>
      </div>
    </div>
  );
}

