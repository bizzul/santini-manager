import { getSiteById, getSiteUsers, addUserToSiteHelper } from "../actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DeleteSiteButton } from "./DeleteSiteButton";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ArrowLeft, ExternalLink, Globe, Settings, Users } from "lucide-react";
import Image from "next/image";

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
  if (!site)
    return (
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-12 text-center">
          <p className="text-white text-lg">Site not found.</p>
        </div>
      </div>
    );

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
    <div className="relative z-10 flex flex-col items-center min-h-screen px-4 py-12">
      {/* Header */}
      <div className="w-full max-w-4xl mb-8">
        <div className="flex flex-col items-center justify-center mb-8 space-y-6">
          <Image
            src="/logo-bianco.svg"
            alt="Full Data Manager Logo"
            width={60}
            height={60}
            className="drop-shadow-2xl"
          />
          <div className="flex items-center gap-4">
            <Link href="/administration/sites">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/20 transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sites
              </Button>
            </Link>
            <Link href={`/sites/${site.subdomain}`}>
              <Button
                variant="outline"
                className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white transition-all duration-300"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Vai al sito
              </Button>
            </Link>
            {role === "superadmin" && (
              <>
                <Link href={`/administration/sites/${site.id}/edit`}>
                  <Button
                    variant="outline"
                    className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white transition-all duration-300"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </Link>
                <DeleteSiteButton siteId={site.id} siteName={site.name} />
              </>
            )}
          </div>
          <h1 className="text-4xl font-bold text-center text-white">
            Site Details
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-4xl">
        <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-white/10">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">{site.name}</h2>
          </div>

          {/* Site Image */}
          {site.image && (
            <div className="mb-6">
              <img
                src={site.image}
                alt={`${site.name} image`}
                className="w-full max-w-md h-auto max-h-64 object-contain rounded-xl shadow-lg bg-white/5"
              />
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-white/60 min-w-[120px]">Subdomain:</span>
              <span className="font-mono bg-white/10 px-3 py-1 rounded text-white">
                {site.subdomain}
              </span>
            </div>

            {site.description && (
              <div className="flex items-start gap-2">
                <span className="text-white/60 min-w-[120px]">Description:</span>
                <span className="text-white">{site.description}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-white/60 min-w-[120px]">Organization:</span>
              {site.organization ? (
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">
                    {site.organization.name}
                  </span>
                  {site.organization.code && (
                    <span className="text-sm bg-white/10 px-2 py-1 rounded text-white/70">
                      {site.organization.code}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-white/60">No organization assigned</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-white/60 min-w-[120px]">Created:</span>
              <span className="text-white">
                {site.created_at
                  ? new Date(site.created_at).toLocaleDateString()
                  : "Unknown"}
              </span>
            </div>
          </div>
        </div>

        {/* Connected Users */}
        <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-white/10">
              <Users className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Connected Users</h2>
          </div>

          {users && users.length > 0 ? (
            <div className="space-y-3">
              {users.map((user: any) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {user.userData?.given_name?.[0] ||
                          user.userData?.email?.[0] ||
                          "U"}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-white">
                        {user.userData?.given_name && user.userData?.family_name
                          ? `${user.userData.given_name} ${user.userData.family_name}`
                          : user.userData?.email || "Unknown User"}
                      </div>
                      {user.userData?.email && (
                        <div className="text-sm text-white/60">
                          {user.userData.email}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-purple-500/20 text-purple-200 border border-purple-400/50"
                          : user.role === "superadmin"
                          ? "bg-red-500/20 text-red-200 border border-red-400/50"
                          : "bg-green-500/20 text-green-200 border border-green-400/50"
                      }`}
                    >
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">👥</div>
              <p className="text-white/70">
                No users are currently connected to this site.
              </p>
              <p className="text-sm text-white/50">
                Users can be added when editing the site.
              </p>
            </div>
          )}
        </div>

        {/* Debug section - remove in production */}
        <div className="mt-6 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
          <details className="text-sm text-white/50">
            <summary className="cursor-pointer font-medium text-white/70">
              Debug Info (Development Only)
            </summary>
            <div className="mt-4 space-y-2">
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
      </div>
    </div>
  );
}
