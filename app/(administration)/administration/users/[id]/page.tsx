import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getUsers,
  getUserOrganizations,
  getUserProfiles,
  getOrganizations,
} from "../../actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ArrowLeft, User, MapPin, Briefcase, Building2, Edit } from "lucide-react";
import Image from "next/image";

export default async function UserViewPage({
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

  const [users, userOrgs, profiles, organizations] = await Promise.all([
    getUsers(),
    getUserOrganizations(id),
    getUserProfiles(),
    getOrganizations(),
  ]);
  const userToView = users.find((u: any) => u.id === id);
  if (!userToView) return notFound();

  // Check if user has access to view this user
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

  const profile = profiles.find((p: any) => p.authId === userToView.id);
  const userOrganizations = userOrgs || [];
  const organizationNames =
    userOrganizations.length > 0
      ? userOrganizations
          .map((userOrg: any) => userOrg.organizations?.name)
          .filter(Boolean)
      : [];

  // Get user's sites
  const { data: userSites } = await supabase
    .from("user_sites")
    .select(`
      site_id,
      sites (
        id,
        name,
        subdomain
      )
    `)
    .eq("user_id", id);

  // Get user's internal ID for role lookup
  const { data: userDbData } = await supabase
    .from("User")
    .select("id")
    .eq("authId", id)
    .single();

  // Get user's assigned roles
  let assignedRoles: { id: number; name: string; site_id: string | null }[] = [];
  if (userDbData?.id) {
    const { data: roleLinks } = await supabase
      .from("_RolesToUser")
      .select("A")
      .eq("B", userDbData.id);

    if (roleLinks && roleLinks.length > 0) {
      const roleIds = roleLinks.map((link: any) => link.A);
      const { data: roles } = await supabase
        .from("Roles")
        .select("id, name, site_id")
        .in("id", roleIds);
      assignedRoles = roles || [];
    }
  }

  // Get site names for roles
  const siteIds = assignedRoles
    .map((r) => r.site_id)
    .filter(Boolean) as string[];
  let sitesMap = new Map<string, string>();
  if (siteIds.length > 0) {
    const { data: sitesData } = await supabase
      .from("sites")
      .select("id, name, subdomain")
      .in("id", siteIds);
    sitesData?.forEach((site: any) => {
      sitesMap.set(site.id, site.name || site.subdomain);
    });
  }

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
          <div className="flex items-center gap-3">
            <Link href="/administration/users">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/20 transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Torna agli Utenti
              </Button>
            </Link>
            <Link href={`/administration/users/${id}/edit`}>
              <Button
                variant="outline"
                className="border-white/40 text-white hover:bg-white/20 transition-all duration-300"
              >
                <Edit className="h-4 w-4 mr-2" />
                Modifica
              </Button>
            </Link>
          </div>
          <h1 className="text-4xl font-bold text-center text-white">
            Dettagli Utente
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Details Card */}
          <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-white/10">
                <User className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Informazioni Utente</h2>
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-white/60 text-sm">Email</span>
                <p className="text-white font-medium">{userToView.email}</p>
              </div>
              <div>
                <span className="text-white/60 text-sm">Ruolo Sistema</span>
                <p className="text-white font-medium capitalize">{userToView.role}</p>
              </div>
              <div>
                <span className="text-white/60 text-sm">Nome</span>
                <p className="text-white font-medium">
                  {profile?.given_name || "-"}
                </p>
              </div>
              <div>
                <span className="text-white/60 text-sm">Cognome</span>
                <p className="text-white font-medium">
                  {profile?.family_name || "-"}
                </p>
              </div>
              <div>
                <span className="text-white/60 text-sm">Stato</span>
                <div className="mt-1">
                  {userToView.enabled ? (
                    <Badge className="bg-green-500/20 text-green-200 border border-green-400/50">
                      Attivo
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-200 border border-red-400/50">
                      Disabilitato
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Organizations Card */}
          <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-white/10">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Organizzazioni</h2>
            </div>
            {organizationNames.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {organizationNames.map((name: string, index: number) => (
                  <Badge
                    key={index}
                    className="bg-blue-500/20 text-blue-200 border border-blue-400/50"
                  >
                    {name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-white/60">Nessuna organizzazione</p>
            )}
          </div>

          {/* Sites Card */}
          <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-white/10">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Siti Collegati</h2>
            </div>
            {userSites && userSites.length > 0 ? (
              <div className="space-y-2">
                {userSites.map((us: any) => (
                  <div
                    key={us.site_id}
                    className="p-3 rounded-xl bg-white/5 border border-white/10"
                  >
                    <span className="text-white font-medium">
                      {us.sites?.name || us.sites?.subdomain || "Sito sconosciuto"}
                    </span>
                    {us.sites?.subdomain && (
                      <span className="text-white/50 text-sm ml-2">
                        ({us.sites.subdomain})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/60">Nessun sito collegato</p>
            )}
          </div>

          {/* Company Roles Card */}
          <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-white/10">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Ruoli Aziendali</h2>
            </div>
            {assignedRoles.length > 0 ? (
              <div className="space-y-2">
                {assignedRoles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                  >
                    <span className="text-white font-medium">{role.name}</span>
                    {role.site_id ? (
                      <Badge className="bg-blue-500/20 text-blue-200 border border-blue-400/50 text-xs">
                        {sitesMap.get(role.site_id) || "Sito"}
                      </Badge>
                    ) : (
                      <Badge className="bg-purple-500/20 text-purple-200 border border-purple-400/50 text-xs">
                        Globale
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/60">Nessun ruolo assegnato</p>
            )}
            <div className="mt-4 pt-4 border-t border-white/10">
              <Link href={`/administration/users/${id}/edit`}>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/20 w-full"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Gestisci Ruoli
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
