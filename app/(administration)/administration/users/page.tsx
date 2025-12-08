import React from "react";
import Link from "next/link";
import { getUsers, getUserProfiles } from "../actions";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, Users } from "lucide-react";
import { getUserContext } from "@/lib/auth-utils";
import ImpersonateButton from "@/components/users/impersonateButton";
import PasswordResetButton from "@/components/users/password-reset-button";
import ToggleUserStatusButton from "@/components/users/toggle-user-status-button";
import { DeleteUserButton } from "@/components/users/delete-user-button";
import { redirect } from "next/navigation";
import Image from "next/image";

// Force dynamic rendering to prevent static generation errors with cookies
export const dynamic = "force-dynamic";

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

  // Get user-organization relationships with organization information
  const supabase = await createClient();
  const { data: userOrgs } = await supabase.from("user_organizations").select(`
      user_id,
      organization_id,
      organizations (
        id,
        name
      )
    `);

  // Merge user, profile, and organization data using direct joins
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

    return {
      ...user,
      userOrganizations,
      given_name: profile?.given_name || "-",
      family_name: profile?.family_name || "-",
    };
  });

  return (
    <div className="relative z-10 flex flex-col items-center min-h-screen px-4 py-12">
      {/* Header */}
      <div className="w-full max-w-7xl mb-8">
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
      <div className="w-full max-w-7xl">
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
                  <th className="px-6 py-4 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Given Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Family Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Organizations
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Actions
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
                      <td className="px-6 py-4 whitespace-nowrap text-white">
                        {u.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-white/80">
                        {u.given_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-white/80">
                        {u.family_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/20 text-white border border-white/30">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {u.userOrganizations?.map(
                            (userOrg: any, index: number) => (
                              <div
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <span className="text-sm text-white/80">
                                  {userOrg.organization?.name || "Unknown Org"}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2 flex-wrap">
                          <Link href={`/administration/users/${u.id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border border-white/40 text-white hover:bg-white/20 text-xs"
                            >
                              View
                            </Button>
                          </Link>
                          <Link href={`/administration/users/${u.id}/edit`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border border-white/40 text-white hover:bg-white/20 text-xs"
                            >
                              Edit
                            </Button>
                          </Link>
                          <PasswordResetButton
                            userEmail={u.email}
                            userName={
                              `${u.given_name} ${u.family_name}`.trim() ||
                              u.email
                            }
                          />
                          <ToggleUserStatusButton
                            userId={u.id}
                            isActive={u.enabled}
                            userEmail={u.email}
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
                              <ImpersonateButton userId={u.id} />
                            )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
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
