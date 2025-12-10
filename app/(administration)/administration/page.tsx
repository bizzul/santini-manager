import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building,
  Globe,
  Settings,
  Plus,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import { OrganizationSitesGroup } from "./OrganizationSitesGroup";

// Force dynamic rendering to prevent static generation errors with cookies
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const userContext = await getUserContext();

  if (!userContext) {
    redirect("/login");
  }

  const { role, user } = userContext;

  // Only allow admin and superadmin access
  if (role !== "admin" && role !== "superadmin") {
    redirect("/");
  }

  const supabase = await createClient();

  // Get user's organization for admin users and fetch appropriate sites
  let userOrganization = null;
  let sites = [];

  if (role === "admin") {
    // For admin users, get their organization and only sites from that organization
    const { data: orgData, error: orgError } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user?.id)
      .single();

    if (!orgError && orgData) {
      const { data: org, error: orgFetchError } = await supabase
        .from("organizations")
        .select("id, name, code")
        .eq("id", orgData.organization_id)
        .single();

      if (!orgFetchError && org) {
        userOrganization = org;

        // Fetch only sites from this organization
        const { data: orgSites, error: sitesError } = await supabase
          .from("sites")
          .select("*")
          .eq("organization_id", org.id)
          .order("created_at", { ascending: false });

        if (!sitesError) {
          sites = orgSites || [];
        } else {
          console.error("Error fetching organization sites:", sitesError);
        }
      }
    }
  } else if (role === "superadmin") {
    // For superadmin users, fetch all sites with organization info
    const { data: allSites, error: sitesError } = await supabase
      .from("sites")
      .select("*, organization:organizations(id, name, code)")
      .order("created_at", { ascending: false });

    if (!sitesError) {
      sites = allSites || [];
    } else {
      console.error("Error fetching all sites:", sitesError);
    }
  }

  // Group sites by organization for superadmin
  const sitesByOrganization: Record<
    string,
    {
      organization: { id: string; name: string; code: string } | null;
      sites: typeof sites;
    }
  > = {};

  if (role === "superadmin") {
    // First, fetch ALL organizations (including those without sites)
    const { data: allOrganizations } = await supabase
      .from("organizations")
      .select("id, name, code")
      .order("name", { ascending: true });

    // Initialize all organizations in the map (even if they have no sites)
    allOrganizations?.forEach((org: any) => {
      sitesByOrganization[org.id] = {
        organization: org,
        sites: [],
      };
    });

    // Then add sites to their respective organizations
    sites.forEach((site: any) => {
      const orgId = site.organization?.id || "no-organization";
      if (!sitesByOrganization[orgId]) {
        sitesByOrganization[orgId] = {
          organization: site.organization || null,
          sites: [],
        };
      }
      sitesByOrganization[orgId].sites.push(site);
    });
  }

  // Dashboard content based on role
  const getDashboardContent = () => {
    switch (role) {
      case "superadmin":
        return {
          title: "Superadmin Dashboard",
          description: "Manage all organizations and system-wide settings",
          cards: [
            {
              title: "Organizations",
              description: "Manage all organizations",
              icon: <Building className="h-5 w-5" />,
              href: "/administration/organizations",
            },
            {
              title: "Sites",
              description:
                "Manage all sites and connect them to organizations and users",
              icon: <Globe className="h-5 w-5" />,
              href: "/administration/sites",
            },
            {
              title: "Users",
              description: "Manage all users",
              icon: <Users className="h-5 w-5" />,
              href: "/administration/users",
            },
          ],
        };

      case "admin":
        return {
          title: "Admin Dashboard",
          description: "Manage your organization and sites",
          cards: [
            {
              title: "Users",
              description: "Manage organization users",
              icon: <Users className="h-5 w-5" />,
              href: "/administration/users",
            },
            {
              title: "Sites",
              description: "Manage organization sites",
              icon: <Globe className="h-5 w-5" />,
              href: "/administration/sites",
            },
            {
              title: "Edit Organization",
              description: userOrganization
                ? `Manage ${userOrganization.name} (${userOrganization.code})`
                : "Manage your organization details",
              icon: <Building className="h-5 w-5" />,
              href: userOrganization
                ? `/administration/organizations/${userOrganization.id}/edit`
                : "/administration/organizations",
            },
          ],
        };

      default:
        return {
          title: "Dashboard",
          description: "Manage your organization",
          cards: [],
        };
    }
  };

  const content = getDashboardContent();

  return (
    <div className="relative z-10 flex flex-col items-center min-h-screen px-4 py-12">
      {/* Logo and Header */}
      <div className="w-full max-w-6xl mb-8">
        <div className="flex flex-col items-center justify-center mb-8 space-y-6">
          <Image
            src="/logo-bianco.svg"
            alt="Full Data Manager Logo"
            width={80}
            height={80}
            className="drop-shadow-2xl"
          />
          <h1 className="text-4xl md:text-5xl font-bold text-center text-white">
            {content.title}
          </h1>
          <p className="text-white/70 text-center text-lg">
            {content.description}
          </p>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="w-full max-w-6xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {content.cards.map((card, index) => (
            <Link key={index} href={card.href}>
              <div className="group backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6 hover:bg-white/20 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-white/60 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-white/10 group-hover:bg-white/20 transition-all">
                    <div className="text-white">{card.icon}</div>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-white transition-all">
                  {card.title}
                </h3>
                <p className="text-white/70 group-hover:text-white/90 text-sm transition-all">
                  {card.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Organization Information for Admin Users */}
        {role === "admin" && userOrganization && (
          <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-white/10">
                <Building className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Organization Information
                </h3>
                <p className="text-white/70 text-sm">
                  Details about your organization
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-white/60">
                  Organization Name
                </label>
                <p className="text-lg font-semibold text-white">
                  {userOrganization.name}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-white/60">
                  Organization Code
                </label>
                <p className="text-lg font-mono bg-white/10 px-3 py-1 rounded text-white inline-block">
                  {userOrganization.code}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20">
              <Link
                href={`/administration/organizations/${userOrganization.id}/edit`}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white hover:scale-105 transition-all duration-300"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Organization
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Sites Overview */}
        {role === "admin" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">
                {userOrganization
                  ? `${userOrganization.name} Sites`
                  : "Organization Sites"}
              </h3>
              <Link href="/administration/sites/create">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white hover:scale-105 transition-all duration-300"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Site
                </Button>
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sites?.map((site) => (
                <div
                  key={site.id}
                  className="group backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6 hover:bg-white/20 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-white/60"
                >
                  {/* Site Image */}
                  {site.image && (
                    <div className="mb-4 -mx-2 -mt-2">
                      <img
                        src={site.image}
                        alt={`${site.name} image`}
                        className="w-full h-32 object-contain rounded-xl bg-white/5"
                      />
                    </div>
                  )}
                  <h4 className="text-lg font-bold text-white mb-2">
                    {site.name}
                  </h4>
                  <p className="text-white/70 text-sm mb-4">
                    {site.description}
                  </p>
                  <div className="space-y-2 mb-4">
                    <div className="text-sm text-white/60">
                      <span className="font-medium text-white/80">Domain:</span>{" "}
                      {site.subdomain}.{process.env.NEXT_PUBLIC_ROOT_DOMAIN}
                    </div>
                    {site.custom_domain && (
                      <div className="text-sm text-white/60">
                        <span className="font-medium text-white/80">
                          Custom Domain:
                        </span>{" "}
                        {site.custom_domain}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Link
                      href={`/sites/${site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/dashboard`}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white transition-all duration-300"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Visit
                      </Button>
                    </Link>
                    <Link href={`/administration/sites/${site.id}/edit`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white transition-all duration-300"
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Settings
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {(!sites || sites.length === 0) && (
              <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-12 text-center">
                <Globe className="h-12 w-12 mx-auto text-white/40 mb-4" />
                <h3 className="text-lg font-medium mb-2 text-white">
                  No sites yet
                </h3>
                <p className="text-white/60 mb-4">
                  Create your first site to get started
                </p>
                <Link href="/administration/sites/create">
                  <Button
                    variant="outline"
                    className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white transition-all duration-300"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Site
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Sites Overview for Superadmin */}
        {role === "superadmin" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">
                All System Sites
              </h3>
              <div className="flex gap-2">
                <Link href="/administration/sites">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white transition-all duration-300"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Sites
                  </Button>
                </Link>
                <Link href="/administration/sites/create">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white transition-all duration-300"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Site
                  </Button>
                </Link>
              </div>
            </div>

            {/* Sites grouped by organization */}
            <div className="space-y-4">
              {Object.entries(sitesByOrganization).map(([orgId, group]) => (
                <OrganizationSitesGroup
                  key={orgId}
                  organization={group.organization}
                  sites={group.sites}
                />
              ))}
            </div>

            {(!sites || sites.length === 0) && (
              <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-12 text-center">
                <Globe className="h-12 w-12 mx-auto text-white/40 mb-4" />
                <h3 className="text-lg font-medium mb-2 text-white">
                  No sites in system
                </h3>
                <p className="text-white/60 mb-4">
                  No sites have been created yet
                </p>
                <Link href="/administration/sites">
                  <Button
                    variant="outline"
                    className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white transition-all duration-300"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Site
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Welcome Message */}
        <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-2">
            Welcome, {user.email}!
          </h3>
          <p className="text-white/70 mb-4">
            You are logged in as a {role}. Use the navigation menu to access
            your available features.
          </p>
          <div className="flex items-center space-x-2">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                role === "superadmin"
                  ? "bg-red-500/20 text-red-200 border border-red-400/50"
                  : "bg-blue-500/20 text-blue-200 border border-blue-400/50"
              }`}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </span>
            <span className="text-sm text-white/60">
              Role permissions active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
