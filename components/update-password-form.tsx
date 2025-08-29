"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UpdatePasswordForm({
  className,
  token,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { token?: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      if (token) {
        // This is a password reset flow - we need to use the recovery token
        // For password recovery in Supabase, we need to first exchange the token
        // for a session, then update the password

        console.log("Attempting password recovery with token:", token);
        console.log("Token type:", typeof token);
        console.log("Token length:", token.length);

        // For Supabase password recovery, we need to use the token to establish a session
        // The correct approach is to use the recovery token with the auth API
        try {
          // First, we need to exchange the recovery token for a session
          // This is done by calling the recovery endpoint
          const { data, error: recoveryError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: "recovery",
          });

          if (recoveryError) {
            console.error("Recovery token verification failed:", recoveryError);
            console.error("Error details:", recoveryError.message);
            console.error("Error status:", recoveryError.status);
            throw new Error(
              "Recovery link is invalid or has expired. Please request a new one."
            );
          }

          // Now that we have a session, update the password
          const { error } = await supabase.auth.updateUser({ password });

          if (error) {
            console.error("Password update failed:", error);
            throw error;
          }

          setSuccess(true);
          setTimeout(() => {
            router.push("/login");
          }, 2000);
        } catch (updateError) {
          console.error("Password update error:", updateError);
          throw new Error(
            "Failed to update password. The recovery link may have expired."
          );
        }
      } else {
        // This is a regular password update (user already authenticated)
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        router.push("/");
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>
            Please enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordReset}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="New password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              {success && (
                <p className="text-sm text-green-600">
                  Password updated successfully! Redirecting to login...
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || success}
              >
                {isLoading ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
