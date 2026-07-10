import React from "react";
import Link from "next/link";
import { getUsers, getUserProfiles } from "../actions";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Users } from "lucide-react";
import { getUserContext } from "@/lib/auth-utils";
import UsersTable, { TableUser } from "@/components/users/users-table";
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

  // Merge user, profile, organization, and site data into serializable rows
  const tableUsers: TableUser[] = users.map((user: any) => {
    const profile = profiles.find((p: any) => p.authId === user.id);

    const organizations =
      userOrgs
        ?.filter((userOrg: any) => userOrg.user_id === user.id)
        ?.map((userOrg: any) => ({
          id: userOrg.organization_id,
          name: userOrg.organizations?.name || "Unknown Org",
        })) || [];

    const sites =
      userSites
        ?.filter((userSite: any) => userSite.user_id === user.id)
        ?.map((userSite: any) => ({
          id: userSite.site_id,
          name: userSite.sites?.name || "Unknown Site",
          organizationName: userSite.sites?.organizations?.name,
        })) || [];

    return {
      id: user.id,
      email: user.email,
      given_name: profile?.given_name || "-",
      family_name: profile?.family_name || "-",
      role: profile?.role || user.role || "user",
      enabled: Boolean(user.enabled),
      assistance_level: (user.assistance_level || "basic_tutorial") as
        | "basic_tutorial"
        | "smart_support"
        | "advanced_support",
      picture: profile?.picture || null,
      color: profile?.color || null,
      initials: profile?.initials || null,
      organizations,
      sites,
    };
  });

  return (
    <div className="relative z-10 flex flex-col items-center min-h-screen px-4 py-12">
      {/* Header */}
      <div className="w-full max-w-[1650px] mb-8">
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
      <div className="w-full max-w-[1650px]">
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
          <UsersTable
            users={tableUsers}
            isSuperadmin={isSuperadmin}
            currentUserId={currentUserId}
          />
        </div>
      </div>
    </div>
  );
}
