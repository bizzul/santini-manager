import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getOrganizations } from "../actions";
import { CreateUserForm } from "./form";

export default async function CreateUserPage() {
  const organizations = await getOrganizations();

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Link href="/administration/users">
        <Button variant="outline">Back to Users</Button>
      </Link>
      <h1 className="text-2xl font-bold mb-6">Create New User</h1>
      <CreateUserForm organizations={organizations} />
    </div>
  );
}
