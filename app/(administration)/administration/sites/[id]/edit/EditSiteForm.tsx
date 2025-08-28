"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSiteWithUsers } from "../../actions";
import { MultiSelect } from "@/components/ui/multi-select";
import ModuleManagementModal from "@/components/module-management/ModuleManagementModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Saving..." : "Save Changes"}
    </Button>
  );
}

export default function EditSiteForm({
  site,
  siteUsers,
  organizations,
  users,
  userRole,
}: {
  site: any;
  siteUsers: any[];
  organizations: any[];
  users: any[];
  userRole?: string;
}) {
  const [form, setForm] = useState({
    name: site.name || "",
    subdomain: site.subdomain || "",
    description: site.description || "",
    organization_id: site.organization_id || "",
    users: siteUsers.map((u: any) => u.id) || [],
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  // MultiSelect handles add/remove internally, just update form.users
  function handleUsersChange(selected: string[]) {
    setForm((f) => ({ ...f, users: selected }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const formData = new FormData();
    formData.set("name", form.name);
    formData.set("subdomain", form.subdomain);
    formData.set("description", form.description);
    formData.set("organization_id", form.organization_id);
    form.users.forEach((u: string) => formData.append("users", u));
    try {
      const result = await updateSiteWithUsers(site.id, formData);
      if (result.success) {
        router.push(`/administration/sites/${site.id}`);
      } else {
        setMessage(result.message || "Failed to update site");
      }
    } catch (err: any) {
      setMessage(err.message || "Failed to update site");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="max-w-md mx-auto relative z-10">
      <CardHeader>
        <CardTitle>Edit Site</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Site Name</Label>
            <Input
              type="text"
              id="name"
              name="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subdomain">Subdomain</Label>
            <Input
              type="text"
              id="subdomain"
              name="subdomain"
              value={form.subdomain}
              onChange={(e) =>
                setForm((f) => ({ ...f, subdomain: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization_id">Organization</Label>
            <Select
              value={form.organization_id}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, organization_id: value }))
              }
              required
            >
              <SelectTrigger>
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="users">Users</Label>
            <MultiSelect
              options={users.map((user: any) => ({
                value: user.id,
                label: user.email || user.name,
              }))}
              onValueChange={handleUsersChange}
              defaultValue={form.users}
              placeholder="Search users..."
              variant="default"
              animation={2}
              maxCount={3}
              className="w-full"
            />
          </div>
          <SubmitButton pending={pending} />
          {message && (
            <div className="mt-4 p-4 rounded-md bg-green-100 text-green-700 text-sm">
              {message}
            </div>
          )}
        </form>

        {userRole === "superadmin" && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium  mb-4 ">Module Management</h3>
            <p className="text-sm  mb-4">
              Control which modules are available for this site. Only
              superadmins can modify these settings.
            </p>
            <ModuleManagementModal
              siteId={site.id}
              trigger={
                <Button variant="outline" type="button">
                  Manage Modules
                </Button>
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
