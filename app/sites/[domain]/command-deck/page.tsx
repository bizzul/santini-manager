import { notFound, redirect } from "next/navigation";
import {
  getServerSiteContext,
  fetchClients,
  fetchSuppliers,
  fetchSellProducts,
  fetchInventoryItems,
  fetchProjectsData,
  fetchFactoryDashboardData,
  fetchUsers,
} from "@/lib/server-data";
import { getUserContext } from "@/lib/auth-utils";
import { CommandDeckView } from "@/components/command-deck/CommandDeckView";
import {
  buildOrbitSet,
  normalizeAdminUsers,
  normalizeClients,
  normalizeFactoryDepartments,
  normalizeInventory,
  normalizeProducts,
  normalizeProjects,
  normalizeSuppliers,
  type OrbitGroups,
} from "@/components/command-deck/orbit-items";
import { getCommandDeckEnabledForSite } from "@/lib/command-deck-settings.server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  try {
    const siteContext = await getServerSiteContext(domain);
    return {
      title: `${siteContext?.siteData?.name || "Site"} · Command Deck`,
    };
  } catch {
    return { title: "Command Deck" };
  }
}

/**
 * Santini Command Deck — user-centric immersive home.
 *
 * Gating (v2.5+):
 *  - Reads `site_settings.command_deck_enabled` for the current site via
 *    `getCommandDeckEnabledForSite()`. When the flag is false we return
 *    `notFound()`, so the route stays invisible on spaces that did not
 *    opt into the feature from the admin settings page.
 *
 * Data:
 *  - Real data only. Each of the 7 module nodes is fed from the existing
 *    server fetchers in `lib/server-data.ts`. Empty categories render as
 *    empty orbits (no demo fallback) — the admin can populate them from
 *    the corresponding module page.
 */
export default async function CommandDeckPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  const siteContext = await getServerSiteContext(domain);
  if (!siteContext) {
    notFound();
  }

  // Per-site feature gate. Kept before any data fetching so non-enabled
  // sites never pay the cost of the orbit fetchers.
  const commandDeckEnabled = await getCommandDeckEnabledForSite(
    siteContext.siteId,
  );
  if (!commandDeckEnabled) {
    notFound();
  }

  const userContext = await getUserContext();
  if (!userContext) {
    redirect("/login");
  }

  const userMetadata = userContext.user?.user_metadata ?? {};

  const commanderName: string =
    userMetadata.full_name ||
    (userMetadata.name && userMetadata.last_name
      ? `${userMetadata.name} ${userMetadata.last_name}`
      : "") ||
    [userMetadata.given_name, userMetadata.family_name]
      .filter(Boolean)
      .join(" ") ||
    userContext.user?.email ||
    "Commander";

  // Supabase user_metadata typically stores the avatar under `picture`
  // (OAuth providers) or `avatar_url` (email/password with custom upload).
  const commanderAvatarUrl: string | null =
    userMetadata.picture || userMetadata.avatar_url || null;

  const siteName: string =
    siteContext.siteData?.name || domain || "Santini";

  const orbitGroups = await buildOrbitGroups(siteContext.siteId);

  return (
    <div className="h-full w-full">
      <CommandDeckView
        siteName={siteName}
        domain={domain}
        commanderName={commanderName}
        commanderRole={userContext.role ?? null}
        commanderAvatarUrl={commanderAvatarUrl}
        orbitGroups={orbitGroups}
        enableModuleOpen={true}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Orbit data assembly
// ---------------------------------------------------------------------------

/**
 * Fetches the 7 real data sources in parallel, normalizes each to the
 * common `OrbitItem` shape and wraps it into an `OrbitSet` with the
 * pre-cap total. Per-source failures are isolated: if any fetcher throws
 * we log and treat that category as empty so the rest of the command
 * deck keeps rendering.
 *
 * There is no demo fallback since v2.5 — when a category has no entities
 * the orbit renders empty and the right panel reads "0 in orbita". This
 * matches the user's intent of showing only real data when the feature
 * toggle is enabled.
 */
async function buildOrbitGroups(siteId: string): Promise<OrbitGroups> {
  const logAndReturn = <T,>(label: string, empty: T) =>
    (err: unknown): T => {
      console.error(`[CommandDeck] ${label} fetch failed:`, err);
      return empty;
    };

  const [
    clients,
    suppliers,
    products,
    inventory,
    projectsData,
    factory,
    users,
  ] = await Promise.all([
    fetchClients(siteId).catch(logAndReturn("clients", [])),
    fetchSuppliers(siteId).catch(logAndReturn("suppliers", [])),
    fetchSellProducts(siteId).catch(logAndReturn("sellProducts", [])),
    fetchInventoryItems(siteId).catch(logAndReturn("inventoryItems", [])),
    fetchProjectsData(siteId).catch(
      logAndReturn("projectsData", {
        clients: [],
        activeProducts: [],
        kanbans: [],
        tasks: [],
        categories: [],
      } as Awaited<ReturnType<typeof fetchProjectsData>>),
    ),
    fetchFactoryDashboardData(siteId).catch(
      logAndReturn(
        "factoryDashboard",
        { departments: [] } as unknown as Awaited<
          ReturnType<typeof fetchFactoryDashboardData>
        >,
      ),
    ),
    fetchUsers(siteId).catch(logAndReturn("users", [])),
  ]);

  const groups: OrbitGroups = {
    clienti: buildOrbitSet(normalizeClients(clients)),
    fornitori: buildOrbitSet(normalizeSuppliers(suppliers)),
    prodotti: buildOrbitSet(normalizeProducts(products)),
    progetti: buildOrbitSet(normalizeProjects(projectsData.tasks ?? [])),
    inventario: buildOrbitSet(normalizeInventory(inventory)),
    fabbrica: buildOrbitSet(
      normalizeFactoryDepartments(factory.departments ?? []),
    ),
    admin: buildOrbitSet(normalizeAdminUsers(users)),
  };

  return groups;
}
