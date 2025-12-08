"use client";

import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { createOrganizationAndInviteUser } from "../../actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
      className="w-full border-2 border-white/40 text-white hover:bg-white/30 hover:border-white transition-all duration-300 py-3 font-semibold disabled:opacity-50"
    >
      {pending ? "Creating..." : "Create Organization"}
    </Button>
  );
}

export function CreateOrganizationForm() {
  const [state, formAction] = useActionState(
    createOrganizationAndInviteUser,
    initialState
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label
          htmlFor="organizationName"
          className="block text-sm font-medium text-white/80 mb-2"
        >
          Organization Name
        </label>
        <Input
          type="text"
          id="organizationName"
          name="organizationName"
          placeholder="Organization Name"
          required
          className="w-full bg-white/10 border border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 rounded-lg px-4 py-3 backdrop-blur-sm"
        />
      </div>

      <div>
        <label
          htmlFor="adminEmail"
          className="block text-sm font-medium text-white/80 mb-2"
        >
          Admin Email
        </label>
        <Input
          type="email"
          id="adminEmail"
          name="adminEmail"
          placeholder="admin@example.com"
          required
          className="w-full bg-white/10 border border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 rounded-lg px-4 py-3 backdrop-blur-sm"
        />
      </div>

      <div className="pt-2">
        <SubmitButton />
      </div>

      {state?.message && (
        <div
          className={`mt-4 p-4 rounded-xl ${
            state.success
              ? "bg-green-500/20 text-green-200 border border-green-400/50"
              : "bg-red-500/20 text-red-200 border border-red-400/50"
          }`}
        >
          {state.message}
        </div>
      )}
    </form>
  );
}
