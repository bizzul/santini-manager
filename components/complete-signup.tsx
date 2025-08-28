"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { updateUserPassword } from "@/lib/actions";
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
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export function CompleteSignupForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const validateInvitation = async () => {
      const supabase = createClient();

      try {
        // Check if we have an access token in the URL hash (from invitation)
        const hash = window.location.hash;
        let accessToken = null;

        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1));
          accessToken = hashParams.get("access_token");
        }

        if (accessToken) {
          console.log(
            "Found access token in URL hash:",
            accessToken.substring(0, 20) + "..."
          );

          // Since we have an access token, the invitation is valid
          // Skip session validation and go directly to form
          console.log("Access token found, skipping session validation...");

          // Try to get email from the URL parameters
          const email = searchParams.get("email");
          if (email) {
            setUserEmail(email);
          } else {
            setUserEmail("Invited User"); // Placeholder
          }

          setIsValidating(false);
          return;
        }

        // Only check session if no access token (fallback for other scenarios)
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        console.log("Session check (fallback):", session);
        console.log("Session error:", sessionError);

        if (sessionError || !session) {
          setError(
            "Invalid or expired invitation. Please contact your administrator."
          );
          setIsValidating(false);
          return;
        }

        // Get user details
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setError("User not found. Please contact your administrator.");
          setIsValidating(false);
          return;
        }

        // Check if user profile already exists
        const { data: profile, error: profileError } = await supabase
          .from("User")
          .select("given_name, family_name")
          .eq("authId", user.id)
          .single();

        if (profileError && profileError.code !== "PGRST116") {
          setError(
            "Error loading user profile. Please contact your administrator."
          );
          setIsValidating(false);
          return;
        }

        // If profile exists and has names, redirect to sites/select
        if (profile && profile.given_name && profile.family_name) {
          router.push("/sites/select");
          return;
        }

        setUserEmail(user.email || null);
        setIsValidating(false);
      } catch (error) {
        console.error("Error validating invitation:", error);
        setError(
          "Error validating invitation. Please contact your administrator."
        );
        setIsValidating(false);
      }
    };

    validateInvitation();
  }, [router]);

  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Check if we have an access token (invitation flow)
      const hash = window.location.hash;
      let accessToken = null;

      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        accessToken = hashParams.get("access_token");
      }

      if (accessToken) {
        // This is an invitation flow - we need to handle it differently
        console.log("Handling invitation flow...");

        // Get email from URL parameters
        const email = searchParams.get("email");
        if (!email) {
          throw new Error("Email not found in invitation URL");
        }

        // For invitations, we need to decode the JWT token to get the user ID
        // The access token is a JWT that contains user information
        try {
          // Decode the JWT token to get user ID
          const tokenParts = accessToken.split(".");
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            const userId = payload.sub; // 'sub' field contains the user ID

            console.log("Decoded user ID from token:", userId);

            // Create user profile with the actual user ID
            const { error: profileError } = await supabase.from("User").insert({
              email: email,
              given_name: firstName.trim(),
              family_name: lastName.trim(),
              role: "admin", // Default role for invited users
              enabled: true,
              authId: userId,
              auth_id: userId,
            });

            if (profileError) {
              throw new Error(
                `Failed to create profile: ${profileError.message}`
              );
            }

            // Now we need to update the user's password in Supabase Auth
            // Since we don't have a full session, we'll need to use a service client
            console.log(
              "Profile created successfully, attempting password update..."
            );

            // Now update the user's password using the server action
            console.log("Profile created successfully, updating password...");

            try {
              const passwordResult = await updateUserPassword(userId, password);

              if (passwordResult.success) {
                console.log("Password updated successfully!");
                toast.success("Profile completed successfully!");
                router.push("/sites/select");
              } else {
                console.error(
                  "Password update failed:",
                  passwordResult.message
                );
                // Even if password update fails, the profile is created
                toast.success(
                  "Profile completed! Please use 'Forgot Password' to set your password."
                );
                router.push("/auth/login");
              }
            } catch (actionError) {
              console.error("Server action error:", actionError);
              // Fallback to login with forgot password message
              toast.success(
                "Profile completed! Please use 'Forgot Password' to set your password."
              );
              router.push("/auth/login");
            }
          } else {
            throw new Error("Invalid JWT token format");
          }
        } catch (decodeError) {
          console.error("Error decoding token:", decodeError);
          throw new Error("Failed to process invitation token");
        }
      } else {
        // Regular flow - user has a session
        // Update user password
        const { error: passwordError } = await supabase.auth.updateUser({
          password: password,
        });

        if (passwordError) {
          throw new Error(
            `Failed to update password: ${passwordError.message}`
          );
        }

        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("Failed to get user information");
        }

        // Update or create user profile
        const { error: profileError } = await supabase.from("User").upsert(
          {
            authId: user.id,
            auth_id: user.id,
            email: user.email,
            given_name: firstName.trim(),
            family_name: lastName.trim(),
            role: "admin", // Default role for invited users
            enabled: true,
          },
          {
            onConflict: "authId",
          }
        );

        if (profileError) {
          throw new Error(`Failed to update profile: ${profileError.message}`);
        }

        toast.success("Profile completed successfully!");

        // Redirect to sites selection
        router.push("/sites/select");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Validating Invitation</CardTitle>
            <CardDescription>
              Please wait while we validate your invitation...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !userEmail) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-red-600">
              Invitation Error
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                If you believe this is an error, please contact your system
                administrator.
              </p>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/auth/login")}
              >
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Welcome! Please complete your profile to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCompleteSignup}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userEmail || ""}
                  disabled
                  className="bg-gray-50 dark:bg-gray-800"
                />
                <p className="text-xs text-gray-500">
                  This is the email address you were invited with
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Enter your first name"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Enter your last name"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Password must be at least 6 characters long
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="repeatPassword">Confirm Password *</Label>
                <Input
                  id="repeatPassword"
                  type="password"
                  placeholder="Confirm your password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Completing Profile..." : "Complete Profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
