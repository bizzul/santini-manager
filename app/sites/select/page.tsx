import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// You may need to implement or adjust this import based on your backend
import { getUserSites } from "@/lib/auth-utils";

export default async function SelectSitePage() {
  // Fetch the sites the current user has access to
  const sites = await getUserSites();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <h1 className="text-2xl font-bold mb-4">Select a Site</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your Sites</CardTitle>
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
                  </div>
                  <Link
                    href={`/sites/${site.domain || site.subdomain || site.id}`}
                  >
                    <Button size="sm" variant="outline">
                      Enter Site
                    </Button>
                  </Link>
                </li>
              ))
            ) : (
              <li>No sites assigned to your account.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
