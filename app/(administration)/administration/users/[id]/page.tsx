import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getUsers,
  getUserOrganizations,
  getUserProfiles,
  getOrganizations,
} from "../../actions";
import { Button } from "@/components/ui/button";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { CompanyRoleManagement } from "@/components/administration/CompanyRoleManagement";
import { ArrowLeft, User } from "lucide-react";
import Image from "next/image";

export default async function UserViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userContext = await getUserContext();

  if (!userContext) {
    redirect("/login");
  }

  const { role, user } = userContext;

  // Only allow admin and superadmin access
  if (role !== "admin" && role !== "superadmin") {
    redirect("/");
  }

  const [users, userOrgs, profiles, organizations] = await Promise.all([
    getUsers(),
    getUserOrganizations(id),
    getUserProfiles(),
    getOrganizations(),
  ]);
  const userToView = users.find((u: any) => u.id === id);
  if (!userToView) return notFound();

  // Check if user has access to view this user
  if (role === "admin") {
    const supabase = await createClient();
    const { data: currentUserOrgs } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user?.id);

    const { data: targetUserOrgs } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", id);

    if (!currentUserOrgs || !targetUserOrgs) {
      redirect("/administration/users");
    }

    const currentUserOrgIds = currentUserOrgs.map(
      (uo: any) => uo.organization_id
    );
    const targetUserOrgIds = targetUserOrgs.map(
      (uo: any) => uo.organization_id
    );

    // Check if they share any organizations
    const hasSharedOrg = currentUserOrgIds.some((orgId: string) =>
      targetUserOrgIds.includes(orgId)
    );

    if (!hasSharedOrg) {
      redirect("/administration/users");
    }
  }

  const profile = profiles.find((p: any) => p.authId === userToView.id);
  const userOrganizations = userOrgs || [];
  const organizationNames =
    userOrganizations.length > 0
      ? userOrganizations
          .map((userOrg: any) => userOrg.organizations?.name)
          .filter(Boolean)
          .join(", ")
      : "-";

  // Get the first organization ID for role management (for now)
  const primaryOrganizationId =
    userOrganizations.length > 0
      ? userOrganizations[0].organization_id
      : undefined;

  return (
    <div className="relative z-10 flex flex-col items-center min-h-screen px-4 py-12">
      {/* Header */}
      <div className="w-full max-w-4xl mb-8">
        <div className="flex flex-col items-center justify-center mb-8 space-y-6">
          <Image
            src="/logo-bianco.svg"
            alt="Full Data Manager Logo"
            width={60}
            height={60}
            className="drop-shadow-2xl"
          />
          <Link href="/administration/users">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/20 transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-center text-white">
            User Details
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Details Card */}
          <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-white/10">
                <User className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">User Details</h2>
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-white/60 text-sm">Email</span>
                <p className="text-white font-medium">{userToView.email}</p>
              </div>
              <div>
                <span className="text-white/60 text-sm">System Role</span>
                <p className="text-white font-medium">{userToView.role}</p>
              </div>
              <div>
                <span className="text-white/60 text-sm">Given Name</span>
                <p className="text-white font-medium">
                  {profile?.given_name || "-"}
                </p>
              </div>
              <div>
                <span className="text-white/60 text-sm">Family Name</span>
                <p className="text-white font-medium">
                  {profile?.family_name || "-"}
                </p>
              </div>
              <div>
                <span className="text-white/60 text-sm">Organizations</span>
                <p className="text-white font-medium">{organizationNames}</p>
              </div>
            </div>
          </div>

          {/* Company Role Management */}
          <div>
            <CompanyRoleManagement
              userId={id}
              organizationId={primaryOrganizationId}
              currentUserRole={userContext?.role}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
