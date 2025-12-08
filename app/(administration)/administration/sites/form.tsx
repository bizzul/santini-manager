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
      className="w-full border-2 border-white/40 text-white hover:bg-white/30 hover:border-white transition-all duration-300 py-3 font-semibold disabled:opacity-50"
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
    <form action={formAction} className="space-y-5">
      <div>
        <Label htmlFor="name" className="text-white/80 text-sm font-medium">
          Site Name
        </Label>
        <Input
          type="text"
          id="name"
          name="name"
          required
          className="mt-2 w-full bg-white/10 border border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 rounded-lg px-4 py-3 backdrop-blur-sm"
        />
      </div>
      <div>
        <Label htmlFor="subdomain" className="text-white/80 text-sm font-medium">
          Subdomain
        </Label>
        <Input
          type="text"
          id="subdomain"
          name="subdomain"
          required
          className="mt-2 w-full bg-white/10 border border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 rounded-lg px-4 py-3 backdrop-blur-sm"
        />
      </div>
      <div>
        <Label htmlFor="description" className="text-white/80 text-sm font-medium">
          Description
        </Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          className="mt-2 w-full bg-white/10 border border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 rounded-lg px-4 py-3 backdrop-blur-sm"
        />
      </div>
      <div>
        <Label htmlFor="organization" className="text-white/80 text-sm font-medium">
          Organization
        </Label>
        <Select
          name="organization"
          required
          value={selectedOrganizationId}
          onValueChange={setSelectedOrganizationId}
        >
          <SelectTrigger className="mt-2 w-full bg-white/10 border border-white/30 text-white rounded-lg px-4 py-3 backdrop-blur-sm">
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
          <p className="mt-2 text-sm text-blue-300">
            You can only create sites in your organization:{" "}
            {organizations[0].name}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="users" className="text-white/80 text-sm font-medium">
          Add Users
        </Label>
        <div className="mt-2">
          <MultiSelect
            options={users.map((user: any) => ({
              label: user.email || user.name,
              value: user.id,
            }))}
            onValueChange={setSelectedUserIds}
            defaultValue={[]}
            placeholder="Select users"
          />
        </div>
        {/* Hidden input for form submission */}
        <Input type="hidden" name="users" value={selectedUserIds.join(",")} />
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
