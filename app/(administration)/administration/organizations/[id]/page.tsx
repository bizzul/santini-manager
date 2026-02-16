import React from "react";
import { notFound } from "next/navigation";
import {
  getOrganizationById,
  getOrganizationSites,
  getOrganizationUsers,
} from "../../actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building, Globe, Users, Settings } from "lucide-react";
import { DuplicateOrganizationButton } from "../DuplicateOrganizationButton";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";

interface OrganizationPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrganizationDetailsPage({
  params,
}: OrganizationPageProps) {
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

  const organization = await getOrganizationById(id);
  if (!organization) return notFound();

  // Check if user has access to this organization
  if (role === "admin") {
    const supabase = await createClient();
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user?.id)
      .eq("organization_id", id)
      .single();

    if (!userOrg) {
      redirect("/administration");
    }
  }

  const sites = await getOrganizationSites(id);
  const users = await getOrganizationUsers(id);

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
            <Link href="/administration/organizations">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/20 transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Organizations
              </Button>
            </Link>
            {role === "superadmin" && (
              <>
                <DuplicateOrganizationButton organizationId={id} />
                <Link href={`/administration/organizations/${id}/edit`}>
                  <Button
                    variant="outline"
                    className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white transition-all duration-300"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Organization
                  </Button>
                </Link>
              </>
            )}
          </div>
          <h1 className="text-4xl font-bold text-center text-white">
            Organization Details
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-4xl space-y-6">
        {/* Organization Info */}
        <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-white/10">
              <Building className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">{organization.name}</h2>
          </div>
          <div className="space-y-4">
            <div>
              <span className="text-white/60 text-sm">Name</span>
              <p className="text-white font-medium">{organization.name}</p>
            </div>
            {organization.domain && (
              <div>
                <span className="text-white/60 text-sm">Domain</span>
                <p className="text-white font-medium">{organization.domain}</p>
              </div>
            )}
            {organization.code && (
              <div>
                <span className="text-white/60 text-sm">Code</span>
                <p className="font-mono bg-white/10 px-3 py-1 rounded text-white inline-block">
                  {organization.code}
                </p>
              </div>
            )}
            {organization.description && (
              <div>
                <span className="text-white/60 text-sm">Description</span>
                <p className="text-white">{organization.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Connected Sites */}
        <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-white/10">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Connected Sites</h2>
          </div>
          {sites?.length > 0 ? (
            <div className="space-y-3">
              {sites.map((site: any) => (
                <div
                  key={site.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10"
                >
                  <div>
                    <span className="text-white font-medium">{site.name}</span>
                    {site.domain && (
                      <span className="text-white/60 ml-2">({site.domain})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Globe className="h-12 w-12 mx-auto text-white/40 mb-4" />
              <p className="text-white/70">No sites connected.</p>
            </div>
          )}
        </div>

        {/* Users */}
        <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-white/10">
              <Users className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Users</h2>
          </div>
          {users?.length > 0 ? (
            <div className="space-y-3">
              {users.map((user: any) => (
                <div
                  key={user.id}
                  className="p-4 bg-white/5 rounded-xl border border-white/10"
                >
                  <div className="font-medium text-white">
                    {user.givenName} {user.familyName}
                  </div>
                  <div className="text-sm text-white/60 mt-1 space-x-4">
                    <span>ID: {user.id}</span>
                    {user.email && <span>• Email: {user.email}</span>}
                    <span>
                      •{" "}
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          user.role === "admin"
                            ? "bg-purple-500/20 text-purple-200"
                            : user.role === "superadmin"
                            ? "bg-red-500/20 text-red-200"
                            : "bg-green-500/20 text-green-200"
                        }`}
                      >
                        {user.role}
                      </span>
                    </span>
                    <span>• Joined: {user.joinedAt}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-white/40 mb-4" />
              <p className="text-white/70">No users connected.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
