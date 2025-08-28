"use client";

import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { createOrganizationAndInviteUser } from "../../actions";
import { Input } from "@/components/ui/input";

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
    <form action={formAction} className="space-y-4 ">
      <div>
        <Input
          type="text"
          id="organizationName"
          name="organizationName"
          placeholder="Organization Name"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-indigo-500 focus:ring-indigo-500 dark:bg-black"
        />
      </div>

      <div>
        <Input
          type="email"
          id="adminEmail"
          name="adminEmail"
          placeholder="Admin Email"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-indigo-500 focus:ring-indigo-500 dark:bg-black dark:border-white dark:text-white"
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
