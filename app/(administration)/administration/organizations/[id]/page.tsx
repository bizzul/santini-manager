import React from "react";
import { notFound } from "next/navigation";
import {
  getOrganizationById,
  getOrganizationSites,
  getOrganizationUsers,
} from "../../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

interface OrganizationPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrganizationDetailsPage({
  params,
}: OrganizationPageProps) {
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

  const organization = await getOrganizationById(id);
  if (!organization) return notFound();

  // Check if user has access to this organization
  if (role === "admin") {
    const supabase = await createClient();
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user?.id)
      .eq("organization_id", id)
      .single();

    if (!userOrg) {
      redirect("/administration");
    }
  }

  const sites = await getOrganizationSites(id);
  const users = await getOrganizationUsers(id);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="mb-4">
        <Link href="/administration/organizations">
          <Button variant="ghost" className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Organizations
          </Button>
        </Link>
        {role === "superadmin" && (
          <Link
            href={`/administration/organizations/${id}/edit`}
            className="ml-2"
          >
            <Button variant="outline">Edit Organization</Button>
          </Link>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div>
              <span className="font-semibold">Name:</span> {organization.name}
            </div>
            {organization.domain && (
              <div>
                <span className="font-semibold">Domain:</span>{" "}
                {organization.domain}
              </div>
            )}
            {organization.code && (
              <div>
                <span className="font-light">Code:</span> {organization.code}
              </div>
            )}
            {organization.description && (
              <div>
                <span className="font-semibold">Description:</span>{" "}
                {organization.description}
              </div>
            )}
          </div>
          <div className="mb-4">
            <h2 className="font-semibold mb-2">Connected Sites</h2>
            <ul>
              {sites?.length > 0 ? (
                sites.map((site: any) => (
                  <li key={site.id}>
                    {site.name}{" "}
                    {site.domain && (
                      <span className="text-gray-500">({site.domain})</span>
                    )}
                  </li>
                ))
              ) : (
                <li>No sites connected.</li>
              )}
            </ul>
          </div>
          <div>
            <h2 className="font-semibold mb-2">Users</h2>
            <ul>
              {users?.length > 0 ? (
                users.map((user: any) => (
                  <li key={user.id} className="mb-2 p-2 border rounded">
                    <div className="font-medium">
                      {user.givenName} {user.familyName}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span>ID: {user.id}</span>
                      {user.email && (
                        <span className="ml-2">• Email: {user.email}</span>
                      )}
                      <span className="ml-2">• Role: {user.role}</span>
                      <span className="ml-2">• Joined: {user.joinedAt}</span>
                    </div>
                  </li>
                ))
              ) : (
                <li>No users connected.</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
