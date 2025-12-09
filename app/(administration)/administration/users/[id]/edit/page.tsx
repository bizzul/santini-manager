import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getUsers, getOrganizations, getUserOrganizations, getSites, getUserSites } from "../../../actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { EditUserForm } from "./EditUserForm";
import { CompanyRoleManagement } from "@/components/administration/CompanyRoleManagement";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { ArrowLeft, UserCog, Briefcase } from "lucide-react";
import Image from "next/image";

export default async function UserEditPage({
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

  const [users, organizations, userOrgs, sites, userSites] = await Promise.all([
    getUsers(),
    getOrganizations(),
    getUserOrganizations(id),
    getSites(),
    getUserSites(id),
  ]);
  const userToEdit = users.find((u: any) => u.id === id);

  if (!userToEdit) return notFound();

  // Check if user has access to edit this user
  const supabase = await createClient();
  
  if (role === "admin") {
    const { data: currentUserOrgs } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user?.id);

    const { data: targetUserOrgs } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", id);

    if (!currentUserOrgs || !targetUserOrgs) {
      redirect("/administration/users");
    }

    const currentUserOrgIds = currentUserOrgs.map(
      (uo: any) => uo.organization_id
    );
    const targetUserOrgIds = targetUserOrgs.map(
      (uo: any) => uo.organization_id
    );

    // Check if they share any organizations
    const hasSharedOrg = currentUserOrgIds.some((orgId: string) =>
      targetUserOrgIds.includes(orgId)
    );

    if (!hasSharedOrg) {
      redirect("/administration/users");
    }
  }

  // Get user's current organizations
  const { data: userOrgsData } = await supabase
    .from("user_organizations")
    .select("organization_id")
    .eq("user_id", id);

  const userOrgIds = userOrgsData?.map((uo: any) => uo.organization_id) || [];

  // Get user's site IDs
  const userSiteIds = userSites?.map((us: any) => us.site_id) || [];

  // Get the primary organization ID for role management
  const primaryOrganizationId =
    userOrgs && userOrgs.length > 0
      ? userOrgs[0].organization_id
      : undefined;

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
          <Link href={`/administration/users/${id}`}>
            <Button
              variant="ghost"
              className="text-white hover:bg-white/20 transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna ai Dettagli
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-center text-white">
            Modifica Utente
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Edit Form Card */}
          <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-white/10">
                <UserCog className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Dati Utente</h2>
            </div>
            <EditUserForm
              user={userToEdit}
              organizations={organizations}
              sites={sites || []}
              userOrgIds={userOrgIds}
              userSiteIds={userSiteIds}
              userId={id}
              currentUserRole={userContext?.role}
            />
          </div>

          {/* Company Role Management */}
          <div>
            <CompanyRoleManagement
              userId={id}
              organizationId={primaryOrganizationId}
              currentUserRole={userContext?.role}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
