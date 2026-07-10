import React from "react";
import Link from "next/link";
import { getUsers, getUserProfiles } from "../actions";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, Users, Eye, Pencil } from "lucide-react";
import { getUserContext } from "@/lib/auth-utils";
import ImpersonateButton from "@/components/users/impersonateButton";
import PasswordResetButton from "@/components/users/password-reset-button";
import ToggleUserStatusButton from "@/components/users/toggle-user-status-button";
import { DeleteUserButton } from "@/components/users/delete-user-button";
import AssistanceLevelSelector from "@/components/users/assistance-level-selector";
import UserAccessCell from "@/components/users/user-access-cell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { redirect } from "next/navigation";
import Image from "next/image";

// Force dynamic rendering to prevent static generation errors with cookies
export const dynamic = "force-dynamic";

// Deterministic avatar color palette (used when the user has no stored color)
const AVATAR_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#0ea5e9",
  "#3b82f6",
];

function getAvatarColor(seed: string, stored?: string | null) {
  if (stored) return stored;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(
  given?: string | null,
  family?: string | null,
  fallback?: string | null,
  email?: string
) {
  if (fallback) return fallback.toUpperCase();
  const g = given && given !== "-" ? given.charAt(0) : "";
  const f = family && family !== "-" ? family.charAt(0) : "";
  const initials = `${g}${f}`.trim();
  if (initials) return initials.toUpperCase();
  return (email?.charAt(0) || "?").toUpperCase();
}

export default async function UsersPage() {
  const userContext = await getUserContext();

  if (!userContext) {
    redirect("/login");
  }

  const { role } = userContext;

  // Only allow admin and superadmin access
  if (role !== "admin" && role !== "superadmin") {
    redirect("/");
  }

  const [users, profiles] = await Promise.all([getUsers(), getUserProfiles()]);
  const isSuperadmin =
    userContext?.role === "superadmin" && !userContext.isImpersonating;
  const currentUserId = userContext?.user?.id;

  // Get user-organization and user-site relationships with names
  const supabase = await createClient();
  const [{ data: userOrgs }, { data: userSites }] = await Promise.all([
    supabase.from("user_organizations").select(`
      user_id,
      organization_id,
      organizations (
        id,
        name
      )
    `),
    supabase.from("user_sites").select(`
      user_id,
      site_id,
      sites (
        id,
        name,
        organization_id,
        organizations (
          name
        )
      )
    `),
  ]);

  // Merge user, profile, organization, and site data using direct joins
  const mergedUsers = users.map((user: any) => {
    const profile = profiles.find((p: any) => p.authId === user.id);

    // Get all organizations for this user from user_organizations table
    const userOrganizations =
      userOrgs
        ?.filter((userOrg: any) => userOrg.user_id === user.id)
        ?.map((userOrg: any) => ({
          organization_id: userOrg.organization_id,
          organization: userOrg.organizations,
          organization_name: userOrg.organizations?.name || "Unknown Org",
          role: profile?.role || "user",
        })) || [];

    // Get all sites for this user from user_sites table
    const userSiteAccess =
      userSites
        ?.filter((userSite: any) => userSite.user_id === user.id)
        ?.map((userSite: any) => ({
          id: userSite.site_id,
          name: userSite.sites?.name || "Unknown Site",
          organizationName: userSite.sites?.organizations?.name,
        })) || [];

    return {
      ...user,
      userOrganizations,
      userSiteAccess,
      given_name: profile?.given_name || "-",
      family_name: profile?.family_name || "-",
      picture: profile?.picture || null,
      color: profile?.color || null,
      initials: profile?.initials || null,
    };
  });

  return (
    <div className="relative z-10 flex flex-col items-center min-h-screen px-4 py-12">
      {/* Header */}
      <div className="w-full max-w-[1500px] mb-8">
        <div className="flex flex-col items-center justify-center mb-8 space-y-6">
          <Image
            src="/logo-bianco.svg"
            alt="Full Data Manager Logo"
            width={60}
            height={60}
            className="drop-shadow-2xl"
          />
          <div className="flex items-center gap-4">
            <Link href="/administration">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/20 transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-center text-white">
            {role === "superadmin"
              ? "Manage All Users"
              : "Manage Organization Users"}
          </h1>
        </div>

        <div className="flex justify-center gap-3 mb-8">
          <Link href="/administration/create-user">
            <Button
              variant="outline"
              className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white hover:scale-105 transition-all duration-300 font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </Link>
          {isSuperadmin && (
            <Link href="/administration/create-user?role=superadmin">
              <Button
                variant="outline"
                className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white hover:scale-105 transition-all duration-300 font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Superadmin
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="w-full max-w-[1500px]">
        <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-white/10">
                <Users className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">
                {role === "superadmin" ? "All Users" : "Organization Users"}
              </h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="w-12 px-3 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    <span className="sr-only">Avatar</span>
                  </th>
                  <th className="w-40 px-3 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="w-56 px-3 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="w-16 px-3 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Ruolo
                  </th>
                  <th className="w-[280px] px-3 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Organizzazioni &amp; Siti
                  </th>
                  <th className="w-[220px] px-3 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Assistenza
                  </th>
                  <th className="w-20 px-3 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Stato
                  </th>
                  <th className="w-[120px] px-3 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {mergedUsers.length > 0 ? (
                  mergedUsers.map((u: any) => (
                    <tr
                      key={u.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-3 py-3 align-top">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={u.picture || undefined} />
                          <AvatarFallback
                            style={{
                              backgroundColor: getAvatarColor(
                                u.id || u.email,
                                u.color
                              ),
                            }}
                            className="text-white text-sm font-medium"
                          >
                            {getInitials(
                              u.given_name,
                              u.family_name,
                              u.initials,
                              u.email
                            )}
                          </AvatarFallback>
                        </Avatar>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span className="font-medium text-white">
                          {[u.given_name, u.family_name]
                            .filter((v: string) => v && v !== "-")
                            .join(" ") || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top text-sm text-white/80 break-all">
                        {u.email}
                      </td>
                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/20 text-white border border-white/30">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <UserAccessCell
                          userId={u.id}
                          organizations={(u.userOrganizations || []).map(
                            (userOrg: any) => ({
                              id: userOrg.organization_id,
                              name:
                                userOrg.organization?.name || "Unknown Org",
                            })
                          )}
                          sites={u.userSiteAccess || []}
                        />
                      </td>
                      <td className="px-3 py-3 align-top text-white/80 text-sm">
                        {isSuperadmin ? (
                          <AssistanceLevelSelector
                            userId={u.id}
                            initialLevel={
                              (u.assistance_level || "basic_tutorial") as
                                | "basic_tutorial"
                                | "smart_support"
                                | "advanced_support"
                            }
                          />
                        ) : u.assistance_level === "advanced_support" ? (
                          "Livello C"
                        ) : u.assistance_level === "smart_support" ? (
                          "Livello B"
                        ) : (
                          "Livello A"
                        )}
                      </td>
                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        <Badge
                          variant={u.enabled ? "default" : "secondary"}
                          className={
                            u.enabled
                              ? "bg-green-500/20 text-green-200 border border-green-400/50"
                              : "bg-gray-500/20 text-gray-200 border border-gray-400/50"
                          }
                        >
                          {u.enabled ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="grid grid-cols-3 gap-1 w-fit">
                          <Link href={`/administration/users/${u.id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              title="View"
                              aria-label="View"
                              className="h-8 w-8 p-0 border border-white/40 text-white hover:bg-white/20"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/administration/users/${u.id}/edit`}>
                            <Button
                              size="sm"
                              variant="outline"
                              title="Edit"
                              aria-label="Edit"
                              className="h-8 w-8 p-0 border border-white/40 text-white hover:bg-white/20"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <PasswordResetButton
                            userEmail={u.email}
                            userName={
                              `${u.given_name} ${u.family_name}`.trim() ||
                              u.email
                            }
                            compact
                          />
                          <ToggleUserStatusButton
                            userId={u.id}
                            isActive={u.enabled}
                            userEmail={u.email}
                            compact
                          />
                          <DeleteUserButton
                            userId={u.id}
                            userEmail={u.email}
                            userName={
                              `${u.given_name} ${u.family_name}`.trim() ||
                              u.email
                            }
                            disabled={u.id === currentUserId}
                          />
                          {isSuperadmin &&
                            !u.userOrganizations?.some(
                              (userOrg: any) => userOrg.role === "superadmin"
                            ) &&
                            u.id !== currentUserId && (
                              <ImpersonateButton userId={u.id} compact />
                            )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-12 text-center text-white/60"
                    >
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
