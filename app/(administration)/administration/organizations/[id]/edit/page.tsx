import React from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import {
  getOrganizationById,
  updateOrganization,
  getAvailableAdminUsers,
  getOrganizationAdminUser,
  updateOrganizationAdminUser,
} from "../../../actions";
import { getUserContext } from "@/lib/auth-utils";

interface EditOrganizationPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditOrganizationPage({
  params,
}: EditOrganizationPageProps) {
  const { id } = await params;
  const userContext = await getUserContext();
  
  if (!userContext) {
    redirect("/login");
  }

  const { role } = userContext;
  
  // Only allow superadmin access
  if (role !== "superadmin") {
    redirect("/administration/organizations");
  }

  const organization = await getOrganizationById(id);
  if (!organization) return notFound();

  // Get available admin users and current admin
  const [availableAdminUsers, currentAdmin] = await Promise.all([
    getAvailableAdminUsers().catch(() => []),
    getOrganizationAdminUser(id).catch(() => null),
  ]);

  async function handleSubmit(formData: FormData) {
    "use server";
    const updates = {
      name: formData.get("name"),
      code: formData.get("code"),
    };
    await updateOrganization(id, updates);

    // Handle admin user change if different
    const newAdminUserId = formData.get("adminUser");
    if (newAdminUserId && newAdminUserId !== currentAdmin?.authId) {
      await updateOrganizationAdminUser(id, newAdminUserId as string);
    }

    redirect(`/administration/organizations/${id}`);
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="mb-4">
        <Link href={`/administration/organizations/${id}`}>
          <Button variant="ghost" className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Details
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Edit Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4 max-w-lg">
            <div>
              <label className="block font-semibold mb-1" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={organization.name}
                className="w-full border rounded-sm px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1" htmlFor="code">
                Code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                defaultValue={organization.code || ""}
                className="w-full border rounded-sm px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1" htmlFor="adminUser">
                Admin User
              </label>
              <select
                id="adminUser"
                name="adminUser"
                defaultValue={currentAdmin?.authId || ""}
                className="w-full border rounded-sm px-3 py-2"
                required
              >
                <option value="">Select an admin user</option>
                {availableAdminUsers.map((user: any) => (
                  <option key={user.authId} value={user.authId}>
                    {user.given_name} {user.family_name} ({user.email}) -{" "}
                    {user.role}
                  </option>
                ))}
              </select>
              {currentAdmin && (
                <p className="text-sm text-gray-600 mt-1">
                  Current admin: {currentAdmin.given_name}{" "}
                  {currentAdmin.family_name} ({currentAdmin.email})
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="default">
                Save
              </Button>
              <Link href={`/administration/organizations/${id}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
