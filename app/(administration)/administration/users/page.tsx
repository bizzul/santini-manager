import React from "react";
import Link from "next/link";
import {
  getUsers,
  getTenants,
  getUserProfiles,
  getOrganizations,
} from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import { getUserContext } from "@/lib/auth-utils";
import ImpersonateButton from "@/components/users/impersonateButton";

export default async function UsersPage() {
  const [users, tenants, profiles, organizations] = await Promise.all([
    getUsers(),
    getTenants(),
    getUserProfiles(),
    getOrganizations(),
  ]);
  const userContext = await getUserContext();
  const isSuperadmin =
    userContext?.role === "superadmin" && !userContext.isImpersonating;
  const currentUserId = userContext?.user?.id;

  // Merge user, tenant, profile, and organization data by auth id
  const mergedUsers = users.map((user: any) => {
    const tenant = tenants.find((t: any) => t.user_id === user.id);
    const profile = profiles.find((p: any) => p.authId === user.id);
    const organization = tenant
      ? organizations.find((o: any) => o.id === tenant.organization_id)
      : null;
    return {
      ...user,
      tenant,
      given_name: profile?.given_name || "-",
      family_name: profile?.family_name || "-",
      organization_name: organization?.name || "-",
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
        <h1 className="text-2xl font-bold">Manage Users</h1>
        <Link href="/administration/create-user">
          <Button variant="default">
            <Plus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
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
                    Organization Name
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.organization_name}
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
                          u.role !== "superadmin" &&
                          u.id !== currentUserId && (
                            <ImpersonateButton userId={u.id} />
                          )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
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
