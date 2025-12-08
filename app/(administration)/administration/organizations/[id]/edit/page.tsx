import React from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building } from "lucide-react";
import {
  getOrganizationById,
  updateOrganization,
  getAvailableAdminUsers,
  getOrganizationAdminUser,
  updateOrganizationAdminUser,
} from "../../../actions";
import { getUserContext } from "@/lib/auth-utils";
import Image from "next/image";

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
    <div className="relative z-10 flex flex-col items-center min-h-screen px-4 py-12">
      {/* Header */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex flex-col items-center justify-center mb-8 space-y-6">
          <Image
            src="/logo-bianco.svg"
            alt="Full Data Manager Logo"
            width={60}
            height={60}
            className="drop-shadow-2xl"
          />
          <Link href={`/administration/organizations/${id}`}>
            <Button
              variant="ghost"
              className="text-white hover:bg-white/20 transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Details
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-center text-white">
            Edit Organization
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-lg">
        <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-white/10">
              <Building className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Edit Organization</h2>
          </div>
          <form action={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium text-white/80 mb-2"
                htmlFor="name"
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={organization.name}
                className="w-full bg-white/10 border border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 rounded-lg px-4 py-3 backdrop-blur-sm"
                required
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium text-white/80 mb-2"
                htmlFor="code"
              >
                Code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                defaultValue={organization.code || ""}
                className="w-full bg-white/10 border border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 rounded-lg px-4 py-3 backdrop-blur-sm"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium text-white/80 mb-2"
                htmlFor="adminUser"
              >
                Admin User
              </label>
              <select
                id="adminUser"
                name="adminUser"
                defaultValue={currentAdmin?.authId || ""}
                className="w-full bg-white/10 border border-white/30 text-white rounded-lg px-4 py-3 backdrop-blur-sm"
                required
              >
                <option value="" className="bg-gray-900 text-white">
                  Select an admin user
                </option>
                {availableAdminUsers.map((user: any) => (
                  <option
                    key={user.authId}
                    value={user.authId}
                    className="bg-gray-900 text-white"
                  >
                    {user.given_name} {user.family_name} ({user.email}) -{" "}
                    {user.role}
                  </option>
                ))}
              </select>
              {currentAdmin && (
                <p className="text-sm text-white/60 mt-2">
                  Current admin: {currentAdmin.given_name}{" "}
                  {currentAdmin.family_name} ({currentAdmin.email})
                </p>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                variant="outline"
                className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white transition-all duration-300 flex-1"
              >
                Save
              </Button>
              <Link href={`/administration/organizations/${id}`}>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-white hover:bg-white/20 transition-all duration-300"
                >
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
