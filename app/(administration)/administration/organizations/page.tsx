import React from "react";
import Link from "next/link";
import { getOrganizationsWithUserCount } from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

// Force dynamic rendering to prevent static generation errors with cookies
export const dynamic = "force-dynamic";

export default async function OrganizationsPage() {
  const userContext = await getUserContext();

  if (!userContext) {
    redirect("/login");
  }

  const { role } = userContext;

  // Only allow admin and superadmin access
  if (role !== "admin" && role !== "superadmin") {
    redirect("/");
  }

  const organizations = await getOrganizationsWithUserCount();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Link href="/administration">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back to Administration"
            >
              <svg
                width="24"
                height="24"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            {role === "superadmin"
              ? "Manage All Organizations"
              : "My Organization"}
          </h1>
        </div>
        {role === "superadmin" && (
          <Link href="/administration/organizations/create-organization">
            <Button variant="default">Create Organization</Button>
          </Link>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {role === "superadmin"
              ? "All Organizations"
              : "Organization Details"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul>
            {organizations?.length > 0 ? (
              organizations.map((org: any) => (
                <li
                  key={org.id}
                  className="mb-2 flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold">{org.name}</span>
                    {org.code && (
                      <span className="ml-2 text-gray-500">({org.code})</span>
                    )}
                    <div className="text-sm text-gray-600 mt-1">
                      {org.userCount} user{org.userCount !== 1 ? "s" : ""}{" "}
                      connected
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/administration/organizations/${org.id}`}>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </Link>
                    {role === "superadmin" && (
                      <Link
                        href={`/administration/organizations/${org.id}/edit`}
                      >
                        <Button size="sm" variant="secondary">
                          Edit
                        </Button>
                      </Link>
                    )}
                  </div>
                </li>
              ))
            ) : (
              <li>No organizations found.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
