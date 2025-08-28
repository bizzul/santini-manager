"use client";

import { useFormStatus } from "react-dom";
import { useActionState, useEffect, useState } from "react";
import { getOrganizations, getUsers } from "../actions";
import { createSiteWithAssociations } from "./actions";
import { MultiSelect } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState = {
  message: "",
  success: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      disabled={pending}
      className="w-full flex justify-center py-2 px-4 text-sm font-medium  disabled:opacity-50"
    >
      {pending ? "Creating..." : "Create Site"}
    </Button>
  );
}

export function CreateSiteForm() {
  const [state, formAction] = useActionState(
    createSiteWithAssociations,
    initialState
  );
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("");

  useEffect(() => {
    getOrganizations().then((orgs: any[]) => {
      setOrganizations(orgs);
      // If admin user only has one organization, auto-select it
      if (orgs.length === 1) {
        setSelectedOrganizationId(orgs[0].id);
      }
    });
    getUsers().then((users: any[]) =>
      setUsers(
        // users.filter((u: any) => u.role !== "admin" && u.role !== "superadmin")
        users.filter((u: any) => u.role)
      )
    );
  }, []);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Site Name</Label>
        <Input
          type="text"
          id="name"
          name="name"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-xs p-2"
        />
      </div>
      <div>
        <Label htmlFor="subdomain">Subdomain</Label>
        <Input
          type="text"
          id="subdomain"
          name="subdomain"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-xs p-2"
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-xs p-2"
        />
      </div>
      <div>
        <Label htmlFor="organization">Organization</Label>
        <Select
          name="organization"
          required
          value={selectedOrganizationId}
          onValueChange={setSelectedOrganizationId}
        >
          <SelectTrigger className="mt-1 block w-full rounded-md border-gray-300 shadow-xs p-2">
            <SelectValue placeholder="Select an organization" />
          </SelectTrigger>
          <SelectContent>
            {organizations.map((org: any) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Hidden input for form submission */}
        <Input
          type="hidden"
          name="organization_id"
          value={selectedOrganizationId}
        />
        {organizations.length === 1 && (
          <p className="mt-1 text-sm text-blue-600">
            You can only create sites in your organization:{" "}
            {organizations[0].name}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="users">Add Users</Label>
        <MultiSelect
          options={users.map((user: any) => ({
            label: user.email || user.name,
            value: user.id,
          }))}
          onValueChange={setSelectedUserIds}
          defaultValue={[]}
          placeholder="Select users"
        />
        {/* Hidden input for form submission */}
        <Input type="hidden" name="users" value={selectedUserIds.join(",")} />
      </div>
      <SubmitButton />
      {state?.message && (
        <div
          className={`mt-4 p-4 rounded ${
            state.success
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {state.message}
        </div>
      )}
    </form>
  );
}
