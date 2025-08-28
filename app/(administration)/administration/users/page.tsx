import React from "react";
import Link from "next/link";
import { getUsers, getUserProfiles, getOrganizations } from "../actions";
import { createClient } from "@/utils/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import { getUserContext } from "@/lib/auth-utils";
import ImpersonateButton from "@/components/users/impersonateButton";
import { redirect } from "next/navigation";

// Force dynamic rendering to prevent static generation errors with cookies
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const userContext = await getUserContext();

  if (!userContext) {
    redirect("/login");
  }

  const { role } = userContext;

  // Only allow admin and superadmin access
  if (role !== "admin" && role !== "superadmin") {
    redirect("/");
  }

  const [users, profiles] = await Promise.all([getUsers(), getUserProfiles()]);
  const isSuperadmin =
    userContext?.role === "superadmin" && !userContext.isImpersonating;
  const currentUserId = userContext?.user?.id;

  // Get user-organization relationships with organization information
  const supabase = await createClient();
  const { data: userOrgs } = await supabase.from("user_organizations").select(`
      user_id,
      organization_id,
      organizations (
        id,
        name
      )
    `);

  // Merge user, profile, and organization data using direct joins
  const mergedUsers = users.map((user: any) => {
    const profile = profiles.find((p: any) => p.authId === user.id);

    // Get all organizations for this user from user_organizations table
    const userOrganizations =
      userOrgs
        ?.filter((userOrg: any) => userOrg.user_id === user.id)
        ?.map((userOrg: any) => ({
          organization_id: userOrg.organization_id,
          organization: userOrg.organizations,
          organization_name: userOrg.organizations?.name || "Unknown Org",
          role: profile?.role || "user",
        })) || [];

    return {
      ...user,
      userOrganizations,
      given_name: profile?.given_name || "-",
      family_name: profile?.family_name || "-",
    };
  });

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="mb-2">
        <Link
          href="/administration"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
      </div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          {role === "superadmin"
            ? "Manage All Users"
            : "Manage Organization Users"}
        </h1>
        <div className="flex gap-2">
          <Link href="/administration/create-user">
            <Button variant="default">
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </Link>
          {isSuperadmin && (
            <Link href="/administration/create-user?role=superadmin">
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Superadmin
              </Button>
            </Link>
          )}
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {role === "superadmin" ? "All Users" : "Organization Users"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className=" dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Given Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Family Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organizations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className=" dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {mergedUsers.length > 0 ? (
                  mergedUsers.map((u: any) => (
                    <tr key={u.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{u.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.given_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.family_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{u.role}</td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {u.userOrganizations?.map(
                            (userOrg: any, index: number) => (
                              <div
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <span className="text-sm font-medium">
                                  {userOrg.organization?.name || "Unknown Org"}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                        <Link href={`/administration/users/${u.id}`}>
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </Link>
                        <Link href={`/administration/users/${u.id}/edit`}>
                          <Button size="sm" variant="secondary">
                            Edit
                          </Button>
                        </Link>
                        {isSuperadmin &&
                          !u.userOrganizations?.some(
                            (userOrg: any) => userOrg.role === "superadmin"
                          ) &&
                          u.id !== currentUserId && (
                            <ImpersonateButton userId={u.id} />
                          )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
