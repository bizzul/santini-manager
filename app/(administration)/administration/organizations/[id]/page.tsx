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

interface OrganizationPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrganizationDetailsPage({
  params,
}: OrganizationPageProps) {
  const { id } = await params;
  const organization = await getOrganizationById(id);
  if (!organization) return notFound();

  const sites = await getOrganizationSites(id);
  const users = await getOrganizationUsers(id);

  console.log("users", users);
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="mb-4">
        <Link href="/administration/organizations">
          <Button variant="ghost" className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Organizations
          </Button>
        </Link>
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
                  <li key={user.id}>
                    <div>
                      {user.given_name} {user.family_name}{" "}
                      <span className="text-gray-500">({user.authId})</span>
                    </div>
                    {user.email && (
                      <span className="text-gray-500">
                        Email: ({user.email})
                      </span>
                    )}
                    {user.role && (
                      <span className="text-gray-500"> Role:({user.role})</span>
                    )}
                  </li>
                ))
              ) : (
                <li>No users found.</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
