import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getUsers, getOrganizations } from "../../../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { EditUserForm } from "./EditUserForm";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

export default async function UserEditPage({
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

  const [users, organizations] = await Promise.all([
    getUsers(),
    getOrganizations(),
  ]);
  const userToEdit = users.find((u: any) => u.id === id);

  if (!userToEdit) return notFound();

  // Check if user has access to edit this user
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

  // Get user's current organizations
  const supabase = await createClient();
  const { data: userOrgs } = await supabase
    .from("user_organizations")
    .select("organization_id")
    .eq("user_id", id);

  const userOrgIds = userOrgs?.map((uo: any) => uo.organization_id) || [];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-lg mx-auto">
      <Link href={`/administration/users/${id}`}>
        <Button variant="outline">Back to User</Button>
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Edit User</CardTitle>
        </CardHeader>
        <CardContent>
          <EditUserForm
            user={userToEdit}
            organizations={organizations}
            userOrgIds={userOrgIds}
            userId={id}
            currentUserRole={userContext?.role}
          />
        </CardContent>
      </Card>
    </div>
  );
}
