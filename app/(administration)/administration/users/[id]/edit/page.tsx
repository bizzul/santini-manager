import React from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getUsers, updateUser } from "../../../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { validation } from "@/validation/users/editInfo";

export default async function UserEditPage({
  params,
}: {
  params: { id: string };
}) {
  const users = await getUsers();
  const user = users.find((u: any) => u.id === params.id);

  if (!user) return notFound();

  async function handleSubmit(formData: FormData): Promise<void> {
    "use server";
    const data = Object.fromEntries(formData.entries());
    const parsed = validation.safeParse(data);
    if (!parsed.success) {
      // Optionally, handle error (e.g., show toast or set state)
      return;
    }
    await updateUser(params.id, parsed.data);
    redirect(`/administration/users/${params.id}`);
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-lg mx-auto">
      <Link href={`/administration/users/${params.id}`}>
        <Button variant="outline">Back to User</Button>
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Edit User</CardTitle>
        </CardHeader>
        <CardContent>
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
                defaultValue={user.role}
                className="w-full border rounded-sm px-3 py-2"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>
            {/* Add more fields as needed */}
            <Button type="submit" variant="default">
              Save
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
