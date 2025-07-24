"use client";

import { useFormStatus } from "react-dom";
import { useActionState, useEffect, useState } from "react";
import { getOrganizations, getUsers } from "../actions";
import { createSiteWithAssociations } from "./actions";
import { MultiSelect } from "@/components/ui/multi-select";

const initialState = {
  message: "",
  success: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-xs text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
    >
      {pending ? "Creating..." : "Create Site"}
    </button>
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

  useEffect(() => {
    getOrganizations().then((orgs: any[]) => setOrganizations(orgs));
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
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Site Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-xs p-2"
        />
      </div>
      <div>
        <label
          htmlFor="subdomain"
          className="block text-sm font-medium text-gray-700"
        >
          Subdomain
        </label>
        <input
          type="text"
          id="subdomain"
          name="subdomain"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-xs p-2"
        />
      </div>
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-xs p-2"
        />
      </div>
      <div>
        <label
          htmlFor="organizations"
          className="block text-sm font-medium text-gray-700"
        >
          Connect to Organizations
        </label>
        <select
          id="organizations"
          name="organizations"
          multiple
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-xs p-2"
        >
          {organizations.map((org: any) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor="users"
          className="block text-sm font-medium text-gray-700"
        >
          Add Users
        </label>
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
        <input type="hidden" name="users" value={selectedUserIds.join(",")} />
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
