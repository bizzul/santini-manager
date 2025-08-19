import { getSiteData } from "@/lib/fetchers";

// Force dynamic rendering to prevent static/dynamic conflicts
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const siteData = await getSiteData(domain);

  return {
    title: `${siteData?.data?.name || "Site"} - Dashboard`,
  };
}

export default async function SiteDashboardPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const siteData = await getSiteData(domain);

  if (!siteData?.data) {
    return <div>Site not found</div>;
  }

  const site = siteData.data;

  return (
    <div className="space-y-4 p-4 md:p-8 w-full">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          {site.name} Dashboard
        </h2>
      </div>
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Welcome to your site dashboard. Manage your projects, tasks, and
          resources.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Quick Stats Cards */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">
              Active Projects
            </h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-blue-600">12</div>
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Open Tasks</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-green-600">45</div>
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Team Members</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-purple-600">8</div>
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Site Status</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-green-600">Active</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Quick Actions */}
        <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">
              Quick Actions
            </h3>
          </div>
          <div className="p-6 pt-0">
            <div className="space-y-2">
              <a
                href={`/sites/${domain}/kanban`}
                className="block p-3 bg-blue-50 dark:bg-blue-900/20 text-black rounded-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                View Kanban Boards
              </a>
              <a
                href={`/sites/${domain}/projects`}
                className="block p-3 bg-green-50 dark:bg-green-900/20 text-black rounded-sm hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                Manage Projects
              </a>
              <a
                href={`/sites/${domain}/inventory`}
                className="block p-3 bg-orange-50 dark:bg-orange-900/20 text-black rounded-sm hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
              >
                Check Inventory
              </a>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">
              Recent Activity
            </h3>
          </div>
          <div className="p-6 pt-0">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">
                  New task created in Project Alpha
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Kanban board updated</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">Inventory item restocked</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Site Info */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="tracking-tight text-sm font-medium">
            Site Information
          </h3>
        </div>
        <div className="p-6 pt-0">
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div>
              <span className="font-medium">Domain:</span> {domain}
            </div>
            <div>
              <span className="font-medium">Description:</span>{" "}
              {site.description || "No description"}
            </div>
            <div>
              <span className="font-medium">Created:</span>{" "}
              {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
