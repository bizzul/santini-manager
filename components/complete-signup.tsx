"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
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
import { logger } from "@/lib/logger";

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
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<string[]>([]);
  const [organizationNames, setOrganizationNames] = useState<string[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchOrganizationNames = async (orgIds: string[]) => {
    if (!orgIds || orgIds.length === 0) return;

    const supabase = createClient();
    const { data: orgs, error } = await supabase
      .from("organizations")
      .select("name")
      .in("id", orgIds);

    if (!error && orgs) {
      const names = orgs.map((org: { name: string | null }) => org.name).filter(Boolean);
      setOrganizationNames(names);
    }
  };

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

        // Check if we have invitation data in URL parameters (from inviteUserByEmail)
        // The data might be in the main URL or encoded in the 'next' parameter
        let email = searchParams.get("email");
        let name = searchParams.get("name");
        let last_name = searchParams.get("last_name");
        let role = searchParams.get("role");
        let organizations = searchParams.get("organizations");

        // If not in main URL, check the 'next' parameter (encoded invitation data)
        if (!email || !name || !last_name || !role || !organizations) {
          const nextParam = searchParams.get("next");
          if (nextParam) {
            try {
              const decodedNext = decodeURIComponent(nextParam);
              const nextUrl = new URL(decodedNext);

              // Extract invitation data from the decoded next URL
              email = email || nextUrl.searchParams.get("email");
              name = name || nextUrl.searchParams.get("name");
              last_name = last_name || nextUrl.searchParams.get("last_name");
              role = role || nextUrl.searchParams.get("role");
              organizations =
                organizations || nextUrl.searchParams.get("organizations");

              logger.debug("Found invitation data in 'next' parameter");
            } catch (decodeError) {
              logger.warn("Failed to decode 'next' parameter:", decodeError);
            }
          }
        }

        // If we have invitation data, this is a valid invitation
        if (email && name && last_name && role && organizations) {
          logger.debug("Found invitation data for:", email);

          // Set user data
          setUserEmail(email);
          setFirstName(name);
          setLastName(last_name);
          setUserRole(role);
          setUserOrganizations(organizations.split(","));

          // Fetch organization names for the welcome message
          await fetchOrganizationNames(organizations.split(","));

          setIsValidating(false);
          return;
        }

        // Check if we have an invitation token (from Supabase inviteUserByEmail)
        const tokenHash = searchParams.get("token_hash");
        const inviteType = searchParams.get("type");

        if (tokenHash && inviteType === "invite") {
          logger.debug("Found invitation token");

          // This is a valid Supabase invitation
          // The invitation data should be in the 'next' parameter or main URL
          if (email && name && last_name && role && organizations) {
            logger.debug("Invitation data found with token, proceeding...");

            // Set user data
            setUserEmail(email);
            setFirstName(name);
            setLastName(last_name);
            setUserRole(role);
            setUserOrganizations(organizations.split(","));

            // Fetch organization names for the welcome message
            await fetchOrganizationNames(organizations.split(","));

            setIsValidating(false);
            return;
          } else {
            logger.error("Invitation token found but missing invitation data");
            setError("Invalid invitation: Missing user information");
            setIsValidating(false);
            return;
          }
        }

        // Check if we have an access token (from other invitation types)
        if (accessToken) {
          logger.debug("Access token found, skipping session validation...");

          // Try to get pre-filled data from the URL parameters
          if (email) {
            setUserEmail(email);
          } else {
            setUserEmail("Invited User"); // Placeholder
          }

          // Pre-fill the form with the data from the invitation
          if (name) setFirstName(name);
          if (last_name) setLastName(last_name);
          if (role) setUserRole(role);
          if (organizations) {
            setUserOrganizations(organizations.split(","));
            // Fetch organization names for the welcome message
            await fetchOrganizationNames(organizations.split(","));
          }

          setIsValidating(false);
          return;
        }

        // Only check session if no invitation data or access token (fallback for other scenarios)
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        logger.debug("Session check (fallback):", !!session);

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
        logger.error("Error validating invitation:", error);
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

      // For inviteUserByEmail flow, we need to update the existing profile
      // since the user was already created in the createUser function

      // Get the user by email since we don't have a session yet
      const { data: existingUser, error: userLookupError } = await supabase
        .from("User")
        .select("authId, enabled")
        .eq("email", userEmail)
        .single();

      if (userLookupError || !existingUser) {
        throw new Error(
          "User profile not found. Please contact your administrator."
        );
      }

      // Update the user profile with the form data
      const { error: profileError } = await supabase
        .from("User")
        .update({
          given_name: firstName.trim(),
          family_name: lastName.trim(),
          enabled: true, // Activate the user
        })
        .eq("authId", existingUser.authId);

      if (profileError) {
        throw new Error(`Failed to update profile: ${profileError.message}`);
      }

      // Now try to update the password using the server action
      try {
        logger.debug("Attempting to update password for user");

        const passwordResult = await updateUserPassword(
          existingUser.authId,
          password
        );

        if (passwordResult.success) {
          logger.debug("Password updated successfully");
          toast.success(
            `Profile completed successfully! Welcome to ${
              organizationNames.length === 1
                ? "your organization"
                : "your organizations"
            }${
              organizationNames.length > 0
                ? `: ${organizationNames.join(", ")}`
                : ""
            }!`
          );
          router.push("/sites/select");
        } else {
          logger.error("Password update failed:", passwordResult.message);
          // Password update failed, but profile is updated
          toast.success(
            `Profile completed! Welcome to ${
              organizationNames.length === 1
                ? "your organization"
                : "your organizations"
            }${
              organizationNames.length > 0
                ? `: ${organizationNames.join(", ")}`
                : ""
            }! Please use 'Forgot Password' to set your password.`
          );
          router.push("/login");
        }
      } catch (passwordError) {
        logger.error("Password update failed:", passwordError);
        // Profile is still updated, redirect to login
        toast.success(
          `Profile completed! Welcome to ${
            organizationNames.length === 1
              ? "your organization"
              : "your organizations"
          }${
            organizationNames.length > 0
              ? `: ${organizationNames.join(", ")}`
              : ""
          }! Please use 'Forgot Password' to set your password.`
        );
        router.push("/login");
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
            {organizationNames.length > 0 ? (
              <>
                Welcome to{" "}
                {organizationNames.length === 1
                  ? "your organization"
                  : "your organizations"}
                :{" "}
                <span className="font-medium text-primary">
                  {organizationNames.join(", ")}
                </span>
                {userRole && (
                  <>
                    <br />
                    <span className="text-sm text-muted-foreground">
                      You'll be joining as:{" "}
                      <span className="font-medium">{userRole}</span>
                    </span>
                  </>
                )}
                <br />
                Please complete your profile to get started.
              </>
            ) : (
              "Welcome! Please complete your profile to get started."
            )}
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
