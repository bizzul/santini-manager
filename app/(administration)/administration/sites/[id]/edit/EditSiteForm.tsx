"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSiteWithUsers } from "../../actions";
import { MultiSelect } from "@/components/ui/multi-select";
import ModuleManagementModal from "@/components/module-management/ModuleManagementModal";

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-xs text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
    >
      {pending ? "Saving..." : "Save Changes"}
    </button>
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
    <div className="space-y-4 border border-gray-200 p-6 rounded-lg shadow-md max-w-md mx-auto relative z-10">
      <form onSubmit={handleSubmit} className="space-y-4">
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
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            className="mt-1 block w-full rounded-md border-white shadow-xs p-2 text-black bg-white"
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
            value={form.subdomain}
            onChange={(e) =>
              setForm((f) => ({ ...f, subdomain: e.target.value }))
            }
            required
            className="mt-1 block w-full rounded-md border-white shadow-xs p-2 text-black bg-white"
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
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            className="mt-1 block w-full rounded-md border-white shadow-xs p-2 text-black bg-white"
          />
        </div>
        <div>
          <label
            htmlFor="organization_id"
            className="block text-sm font-medium text-gray-700"
          >
            Organization
          </label>
          <select
            id="organization_id"
            name="organization_id"
            value={form.organization_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, organization_id: e.target.value }))
            }
            required
            className="mt-1 block w-full rounded-md border-white shadow-xs p-2 text-black bg-white"
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
            Users
          </label>
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
            className="w-full "
          />
        </div>
        <SubmitButton pending={pending} />
        {message && (
          <div className="mt-4 p-4 rounded-sm bg-green-100 text-green-700">
            {message}
          </div>
        )}
      </form>

      {userRole === "superadmin" && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Module Management
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Control which modules are available for this site. Only superadmins
            can modify these settings.
          </p>
          <ModuleManagementModal
            siteId={site.id}
            domain={site.subdomain}
            trigger={
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Manage Modules
              </button>
            }
          />
        </div>
      )}
    </div>
  );
}
