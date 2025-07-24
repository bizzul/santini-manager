"use client";

import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { createOrganizationAndInviteUser } from "../actions";

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
      {pending ? "Creating..." : "Create Organization"}
    </button>
  );
}

export function CreateOrganizationForm() {
  const [state, formAction] = useActionState(
    createOrganizationAndInviteUser,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="organizationName"
          className="block text-sm font-medium text-gray-700"
        >
          Organization Name
        </label>
        <input
          type="text"
          id="organizationName"
          name="organizationName"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label
          htmlFor="adminEmail"
          className="block text-sm font-medium text-gray-700"
        >
          Admin Email
        </label>
        <input
          type="email"
          id="adminEmail"
          name="adminEmail"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-indigo-500 focus:ring-indigo-500"
        />
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
