"use client";

import { useActionState } from "react";
import { createUser } from "../actions";
import { useSearchParams } from "next/navigation";

const initialState = {
  success: false,
  message: "",
};

interface CreateUserFormProps {
  organizations: any[];
  userRole?: string;
}

export function CreateUserForm({ organizations, userRole }: CreateUserFormProps) {
  const [state, formAction] = useActionState(createUser, initialState);
  const searchParams = useSearchParams();
  
  // Filter roles based on user's role
  const availableRoles = userRole === "superadmin" 
    ? ["user", "admin", "superadmin"]
    : ["user", "admin"];
  
  const defaultRole = searchParams.get("role") || "user";

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <input
          type="email"
          name="email"
          id="email"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-xs p-2"
        />
      </div>

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Name
        </label>
        <input
          type="text"
          name="name"
          id="name"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-xs p-2"
        />
      </div>

      <div>
        <label
          htmlFor="last_name"
          className="block text-sm font-medium text-gray-700"
        >
          Last Name
        </label>
        <input
          type="text"
          name="last_name"
          id="last_name"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-xs p-2"
        />
      </div>

      <div>
        <label
          htmlFor="organization"
          className="block text-sm font-medium text-gray-700"
        >
          Organizations
        </label>
        <select
          name="organization"
          id="organization"
          required
          multiple
          size={4}
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-xs p-2"
        >
          {organizations?.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          Hold Ctrl (or Cmd on Mac) to select multiple organizations
        </p>
      </div>

      <div>
        <label
          htmlFor="role"
          className="block text-sm font-medium text-gray-700"
        >
          Role
        </label>
        <select
          name="role"
          id="role"
          required
          defaultValue={availableRoles.includes(defaultRole) ? defaultRole : "user"}
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-xs p-2"
        >
          {availableRoles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-xs text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Create User
      </button>

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
