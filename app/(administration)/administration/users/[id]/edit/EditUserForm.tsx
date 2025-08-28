"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { validation } from "@/validation/users/editInfo";
import { toast } from "@/components/ui/use-toast";
import { updateUser } from "../../../actions";

interface EditUserFormProps {
  user: any;
  organizations: any[];
  userOrgIds: string[];
  userId: string;
  currentUserRole?: string;
}

export function EditUserForm({
  user,
  organizations,
  userOrgIds,
  userId,
  currentUserRole,
}: EditUserFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Filter available roles based on current user's role
  const availableRoles = currentUserRole === "superadmin" 
    ? ["user", "admin", "superadmin"]
    : ["user", "admin"];

  async function handleSubmit(formData: FormData) {
    setLoading(true);

    try {
      const formDataObj = Object.fromEntries(formData.entries());

      // Handle multiple organization selection
      const organizationInputs = formData.getAll("organization");
      const organizationIds = organizationInputs
        .filter((org) => org !== "")
        .map((org) => String(org));

      const data = {
        ...formDataObj,
        organization: organizationIds,
      };

      const parsed = validation.safeParse(data);
      if (!parsed.success) {
        console.log("Validation errors:", parsed.error);
        toast({
          title: "Validation Error",
          description: `Please check your input: ${parsed.error.errors
            .map((e) => e.message)
            .join(", ")}`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      await updateUser(userId, parsed.data);

      toast({
        title: "Success",
        description: "User updated successfully!",
      });

      router.push(`/administration/users/${userId}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-semibold mb-1">Email</label>
        <input
          name="email"
          type="email"
          defaultValue={user.email}
          className="w-full border rounded-sm px-3 py-2"
        />
      </div>
      <div>
        <label className="block font-semibold mb-1">Given Name</label>
        <input
          name="given_name"
          type="text"
          defaultValue={user.given_name}
          className="w-full border rounded-sm px-3 py-2"
        />
      </div>
      <div>
        <label className="block font-semibold mb-1">Family Name</label>
        <input
          name="family_name"
          type="text"
          defaultValue={user.family_name}
          className="w-full border rounded-sm px-3 py-2"
        />
      </div>
      <div>
        <label className="block font-semibold mb-1">Role</label>
        <select
          name="role"
          defaultValue={availableRoles.includes(user.role) ? user.role : "user"}
          className="w-full border rounded-sm px-3 py-2"
        >
          {availableRoles.map((role) => (
            <option key={role} value={role}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block font-semibold mb-1">Organizations</label>
        <select
          name="organization"
          multiple
          size={4}
          className="w-full border rounded-sm px-3 py-2"
          defaultValue={userOrgIds}
        >
          {organizations.map((org: any) => (
            <option key={org.id} value={org.id}>
              {org.name} ({org.code || "No code"})
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          Hold Ctrl (or Cmd on Mac) to select multiple organizations
        </p>
        {userOrgIds.length > 0 && (
          <p className="mt-1 text-sm text-blue-600">
            Currently connected to: {userOrgIds.length} organization
            {userOrgIds.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
      <Button type="submit" variant="default" disabled={loading}>
        {loading ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
