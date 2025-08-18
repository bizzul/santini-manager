import { getSiteById, getSiteUsers } from "../actions";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function SiteDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const site = await getSiteById(id);
  const users = await getSiteUsers(id);

  console.log("users", users);
  if (!site) return <div>Site not found.</div>;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/administration/sites">
          <Button variant="ghost" size="icon" aria-label="Back to Sites">
            <svg
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Site Details</h1>
        <Link href={`/administration/sites/${site.id}/edit`}>
          <Button variant="secondary" className="ml-4">
            Edit
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{site.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div>
              <span className="font-semibold">Subdomain:</span> {site.subdomain}
            </div>
            <div>
              <span className="font-semibold">Description:</span>{" "}
              {site.description}
            </div>
            <div>
              <span className="font-semibold">Organization:</span>{" "}
              {site.organizations?.name} -{" "}
              {site.organizations?.code && (
                <span className="font-light">({site.organizations?.code})</span>
              )}
            </div>
          </div>
          <div>
            <h2 className="font-semibold mb-2">Users</h2>
            <ul>
              {users?.length > 0 ? (
                users.map((user: any) => (
                  <li key={user.id}>
                    {user.userData?.name || user.userData?.email} -{" "}
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </li>
                ))
              ) : (
                <li>No users found.</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
