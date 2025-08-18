import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getUsers,
  getTenants,
  getUserProfiles,
  getOrganizations,
} from "../../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function UserViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [users, tenants, profiles, organizations] = await Promise.all([
    getUsers(),
    getTenants(),
    getUserProfiles(),
    getOrganizations(),
  ]);
  const user = users.find((u: any) => u.id === id);
  if (!user) return notFound();
  const tenant = tenants.find((t: any) => t.user_id === user.id);
  const profile = profiles.find((p: any) => p.authId === user.id);
  const organization = tenant
    ? organizations.find((o: any) => o.id === tenant.organization_id)
    : null;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-lg mx-auto">
      <Link href="/administration/users">
        <Button variant="outline">Back to Users</Button>
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <span className="font-semibold">Email:</span> {user.email}
            </div>
            <div>
              <span className="font-semibold">Role:</span> {user.role}
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
              <span className="font-semibold">Organization:</span>{" "}
              {organization?.name || "-"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
