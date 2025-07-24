import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building,
  Shield,
  Globe,
  Settings,
  Plus,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

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

  // Fetch all sites for the organization
  const supabase = await createClient();
  const { data: sites, error } = await supabase
    .from("sites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching sites:", error);
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
              icon: <Building className="h-4 w-4" />,
              href: "/administration/organizations",
              color:
                "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
            },
            {
              title: "Sites",
              description:
                "Manage all sites and connect them to organizations and users",
              icon: <Globe className="h-4 w-4" />,
              href: "/administration/sites",
              color:
                "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
            },
            {
              title: "Users",
              description: "Manage all users",
              icon: <Users className="h-4 w-4" />,
              href: "/administration/users",
              color:
                "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
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
              icon: <Users className="h-4 w-4" />,
              href: "/users",
              color:
                "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
            },
            {
              title: "Sites",
              description: "Manage organization sites",
              icon: <Globe className="h-4 w-4" />,
              href: "/sites",
              color:
                "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
            },
            {
              title: "Settings",
              description: "Organization settings",
              icon: <Settings className="h-4 w-4" />,
              href: "/settings",
              color:
                "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
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
    <div className="flex-1 space-y-2 p-4 md:p-8 pt-3">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl dark:text-white font-bold tracking-tight">
          {content.title}
        </h2>
      </div>
      <p className="text-muted-foreground">{content.description}</p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {content.cards.map((card, index) => (
          <Card
            key={index}
            className="hover:shadow-lg transition-shadow flex flex-col justify-between min-h-48"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${card.color}`}>
                {card.icon}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 justify-between">
              <p className="text-xs text-muted-foreground mb-4 flex-1">
                {card.description}
              </p>
              <Link href={card.href} className="mt-auto">
                <Button variant="outline" size="sm" className="w-full">
                  View {card.title}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sites Overview */}
      {role === "admin" && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Organization Sites</h3>
            <Link href="/sites">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Site
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sites?.map((site) => (
              <Card
                key={site.id}
                className="hover:shadow-lg transition-shadow flex flex-col justify-between min-h-72"
              >
                <CardHeader>
                  <CardTitle className="text-lg">{site.name}</CardTitle>
                  <CardDescription>{site.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="text-sm">
                      <span className="font-medium">Domain:</span>{" "}
                      {site.subdomain}.{process.env.NEXT_PUBLIC_ROOT_DOMAIN}
                    </div>
                    {site.custom_domain && (
                      <div className="text-sm">
                        <span className="font-medium">Custom Domain:</span>{" "}
                        {site.custom_domain}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2 pt-2 mt-auto">
                    <Link
                      href={`/sites/${site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/dashboard`}
                    >
                      <Button size="sm" variant="outline">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Visit Site
                      </Button>
                    </Link>
                    <Link href={`/sites/${site.id}/settings`}>
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4 mr-1" />
                        Settings
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {(!sites || sites.length === 0) && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Globe className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No sites yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Create your first site to get started
                  </p>
                  <Link href="/sites">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Site
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Welcome Message */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Welcome, {user.email}!</CardTitle>
          <CardDescription>
            You are logged in as a {role}. Use the navigation menu to access
            your available features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                role === "superadmin"
                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              }`}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </span>
            <span className="text-sm text-muted-foreground">
              Role permissions active
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
