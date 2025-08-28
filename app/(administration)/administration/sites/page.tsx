import React from "react";
import Link from "next/link";
import { getSites } from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SitesList } from "./SitesList";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

// Force dynamic rendering to prevent static generation errors with cookies
export const dynamic = "force-dynamic";

export default async function SitesPage() {
  const userContext = await getUserContext();

  if (!userContext) {
    redirect("/login");
  }

  const { role } = userContext;

  // Only allow admin and superadmin access
  if (role !== "admin" && role !== "superadmin") {
    redirect("/");
  }

  const sites = await getSites();

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
              ? "Manage All Sites"
              : "My Organization Sites"}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/administration/sites/create">
            <Button variant="default">Create Site</Button>
          </Link>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {role === "superadmin" ? "All Sites" : "Organization Sites"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SitesList sites={sites} />
        </CardContent>
      </Card>
    </div>
  );
}
