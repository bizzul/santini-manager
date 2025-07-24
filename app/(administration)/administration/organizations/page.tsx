import React from "react";
import Link from "next/link";
import { getOrganizations } from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ManageOrganizationsPage() {
  const organizations = await getOrganizations();

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
          <h1 className="text-2xl font-bold">Manage Organizations</h1>
        </div>
        <Link href="/administration/create-organization">
          <Button variant="default">Create Organization</Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
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
                    {org.domain && (
                      <span className="ml-2 text-gray-500">({org.domain})</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/administration/organizations/${org.id}`}>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </Link>
                    <Link href={`/administration/organizations/${org.id}/edit`}>
                      <Button size="sm" variant="secondary">
                        Edit
                      </Button>
                    </Link>
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
