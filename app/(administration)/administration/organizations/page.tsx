import React from "react";
import Link from "next/link";
import { getOrganizationsWithUserCount } from "../actions";
import { Button } from "@/components/ui/button";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { Plus, ArrowLeft, Building, Users } from "lucide-react";
import Image from "next/image";

// Force dynamic rendering to prevent static generation errors with cookies
export const dynamic = "force-dynamic";

export default async function OrganizationsPage() {
  const userContext = await getUserContext();

  if (!userContext) {
    redirect("/login");
  }

  const { role } = userContext;

  // Only allow admin and superadmin access
  if (role !== "admin" && role !== "superadmin") {
    redirect("/");
  }

  const organizations = await getOrganizationsWithUserCount();

  return (
    <div className="relative z-10 flex flex-col items-center min-h-screen px-4 py-12">
      {/* Header */}
      <div className="w-full max-w-6xl mb-8">
        <div className="flex flex-col items-center justify-center mb-8 space-y-6">
          <Image
            src="/logo-bianco.svg"
            alt="Full Data Manager Logo"
            width={60}
            height={60}
            className="drop-shadow-2xl"
          />
          <div className="flex items-center gap-4">
            <Link href="/administration">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/20 transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-center text-white">
            {role === "superadmin"
              ? "Manage All Organizations"
              : "My Organization"}
          </h1>
        </div>

        {role === "superadmin" && (
          <div className="flex justify-center gap-3 mb-8">
            <Link href="/administration/organizations/create-organization">
              <Button
                variant="outline"
                className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white hover:scale-105 transition-all duration-300 font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Organization
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Organizations List */}
      <div className="w-full max-w-6xl">
        <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-white/10">
                <Building className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">
                {role === "superadmin"
                  ? "All Organizations"
                  : "Organization Details"}
              </h2>
            </div>
          </div>
          <div className="p-6">
            {organizations?.length > 0 ? (
              <div className="space-y-4">
                {organizations.map((org: any) => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-white text-lg">
                          {org.name}
                        </span>
                        {org.code && (
                          <span className="text-white/60 bg-white/10 px-2 py-1 rounded text-sm">
                            {org.code}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/60 mt-2">
                        <Users className="h-4 w-4" />
                        <span>
                          {org.userCount} user{org.userCount !== 1 ? "s" : ""}{" "}
                          connected
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/administration/organizations/${org.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border border-white/40 text-white hover:bg-white/20"
                        >
                          View
                        </Button>
                      </Link>
                      {role === "superadmin" && (
                        <Link
                          href={`/administration/organizations/${org.id}/edit`}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="border border-white/40 text-white hover:bg-white/20"
                          >
                            Edit
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Building className="h-12 w-12 mx-auto text-white/40 mb-4" />
                <p className="text-white/70">No organizations found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
