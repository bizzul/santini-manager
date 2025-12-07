import { getSiteById, getSiteUsers, addUserToSiteHelper } from "../actions";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteSiteButton } from "./DeleteSiteButton";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function SiteDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userContext = await getUserContext();

  if (!userContext) {
    redirect("/login");
  }

  const { role, user } = userContext;

  // Only allow admin and superadmin access
  if (role !== "admin" && role !== "superadmin") {
    redirect("/");
  }

  const site = await getSiteById(id);
  if (!site) return <div>Site not found.</div>;

  // Check if user has access to view this site
  if (role === "admin") {
    const supabase = await createClient();
    const { data: currentUserOrgs } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user?.id);

    if (!currentUserOrgs || !site.organization_id) {
      redirect("/administration/sites");
    }

    const currentUserOrgIds = currentUserOrgs.map(
      (uo: any) => uo.organization_id
    );

    // Check if the site belongs to one of the user's organizations
    if (!currentUserOrgIds.includes(site.organization_id)) {
      redirect("/administration/sites");
    }
  }

  const users = await getSiteUsers(id);

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
        {role === "superadmin" && (
          <Link href={`/administration/sites/${site.id}/edit`}>
            <Button variant="secondary" className="ml-4">
              Edit
            </Button>
          </Link>
        )}
        {role === "superadmin" && (
          <DeleteSiteButton siteId={site.id} siteName={site.name} />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{site.name}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Site Image */}
          {site.image && (
            <div className="mb-6">
              <img
                src={site.image}
                alt={`${site.name} image`}
                className="w-full max-w-md h-auto max-h-64 object-contain rounded-lg shadow-sm bg-muted/30"
              />
            </div>
          )}

          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold min-w-[120px]">Subdomain:</span>
              <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded ">
                {site.subdomain}
              </span>
            </div>

            {site.description && (
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[120px]">
                  Description:
                </span>
                <span className="dark:text-white text-black">
                  {site.description}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="font-semibold min-w-[120px]">Organization:</span>
              {site.organization ? (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{site.organization.name}</span>
                  {site.organization.code && (
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {site.organization.code}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-gray-500">No organization assigned</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold min-w-[120px]">Created:</span>
              <span className="dark:text-white text-black">
                {site.created_at
                  ? new Date(site.created_at).toLocaleDateString()
                  : "Unknown"}
              </span>
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="font-semibold text-lg mb-4">Connected Users</h2>
            {users && users.length > 0 ? (
              <div className="space-y-2">
                {users.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {user.userData?.given_name?.[0] ||
                            user.userData?.email?.[0] ||
                            "U"}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium dark:text-black text-black">
                          {user.userData?.given_name &&
                          user.userData?.family_name
                            ? `${user.userData.given_name} ${user.userData.family_name}`
                            : user.userData?.email || "Unknown User"}
                        </div>
                        {user.userData?.email && (
                          <div className="text-sm text-gray-500">
                            {user.userData.email}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === "admin"
                            ? "bg-purple-100 text-purple-700"
                            : user.role === "superadmin"
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">👥</div>
                <p>No users are currently connected to this site.</p>
                <p className="text-sm">
                  Users can be added when editing the site.
                </p>
              </div>
            )}
          </div>

          {/* Debug section - remove in production */}
          <div className="border-t pt-6 mt-6">
            <details className="text-sm text-gray-500">
              <summary className="cursor-pointer font-medium">
                Debug Info (Development Only)
              </summary>
              <div className="mt-2 space-y-2">
                <div>
                  <strong>Site ID:</strong> {site.id}
                </div>
                <div>
                  <strong>Organization ID:</strong> {site.organization_id}
                </div>
                <div>
                  <strong>Image URL:</strong> {site.image || "No image"}
                </div>
                <div>
                  <strong>Organization Data:</strong>{" "}
                  {JSON.stringify(site.organization, null, 2)}
                </div>
                <div>
                  <strong>Users Count:</strong> {users?.length || 0}
                </div>
              </div>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
