import React from "react";
import Link from "next/link";
import { getSites } from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ManageSitesPage() {
  const sites = await getSites();

  console.log("sites", sites);
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
          <h1 className="text-2xl font-bold">Manage Sites</h1>
        </div>
        <Link href="/administration/sites/create">
          <Button variant="default">Create Site</Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Sites</CardTitle>
        </CardHeader>
        <CardContent>
          <ul>
            {sites?.length > 0 ? (
              sites.map((site: any) => (
                <li
                  key={site.id}
                  className="mb-2 flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold">{site.name}</span>
                    {site.subdomain && (
                      <span className="ml-2 text-gray-500">
                        ({site.subdomain})
                      </span>
                    )}
                    {site.description && (
                      <span className="ml-2 text-gray-400">
                        - {site.description}
                      </span>
                    )}
                    {site.organization && (
                      <span className="ml-2 text-gray-400">
                        - Organization connected: {site.organization.name}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/administration/sites/${site.id}`}>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </Link>
                    <Link href={`/administration/sites/${site.id}/edit`}>
                      <Button size="sm" variant="secondary">
                        Edit
                      </Button>
                    </Link>
                  </div>
                </li>
              ))
            ) : (
              <li>No sites found.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
