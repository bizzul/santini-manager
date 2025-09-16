import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getUsers,
  getUserOrganizations,
  getUserProfiles,
  getOrganizations,
} from "../../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { CompanyRoleManagement } from "@/components/administration/CompanyRoleManagement";

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
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-4xl mx-auto">
      <Link href="/administration/users">
        <Button variant="outline">Back to Users</Button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>User Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-semibold">Email:</span> {userToView.email}
              </div>
              <div>
                <span className="font-semibold">System Role:</span>{" "}
                {userToView.role}
              </div>
              <div>
                <span className="font-semibold">Given Name:</span>{" "}
                {profile?.given_name || "-"}
              </div>
              <div>
                <span className="font-semibold">Family Name:</span>{" "}
                {profile?.family_name || "-"}
              </div>
              <div>
                <span className="font-semibold">Organizations:</span>{" "}
                {organizationNames}
              </div>
            </div>
          </CardContent>
        </Card>

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
  );
}
