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
import { isCommandDeckEnabled } from "@/components/command-deck/feature-gate";
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
  type OrbitItem,
} from "@/components/command-deck/orbit-items";
import { DEMO_ORBIT_ITEMS } from "@/components/command-deck/demo-orbit-items";

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
 * Server component handles auth + site resolution + orbit data fetching,
 * then hands off to the `<CommandDeckView />` client component which mounts
 * the 3D scene via `next/dynamic({ ssr: false })`.
 *
 * Orbit data strategy
 * -------------------
 * On first render we fetch the 7 real data sources in parallel (all of them
 * are `React.cache()`-wrapped, so re-visiting the module page later reuses
 * the same fetch). Each source is normalized to the common `OrbitItem`
 * shape. When a category is empty for the current site (typical on fresh
 * workspaces — see the "Nessun cliente registrato" state), we fall back to
 * a small set of realistic demo items defined in `demo-orbit-items.ts`.
 *
 * As soon as real entities are inserted into the corresponding tables, the
 * demo fallback disappears automatically — the page doesn't need to change.
 */
export default async function CommandDeckPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  // Alpha-demo gate: Command Deck is currently available only on "copia"
  // spaces. Any other subdomain gets a 404 so the feature is invisible on
  // production sites until we promote it.
  if (!isCommandDeckEnabled(domain)) {
    notFound();
  }

  const siteContext = await getServerSiteContext(domain);
  if (!siteContext) {
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
        // Flip to `false` to surface a visible-but-disabled CTA preview,
        // useful for offline demos / screenshots. `true` turns the CTA and
        // the double-click node shortcut into real navigation.
        enableModuleOpen={true}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Orbit data assembly
// ---------------------------------------------------------------------------

/**
 * Fetches the 7 real data sources in parallel, normalizes each to
 * `OrbitItem[]` and falls back to the category-specific demo set when the
 * real source is empty.
 *
 * All fetchers are `React.cache()`-wrapped, so:
 *  - calling `fetchProjectsData` here reuses `fetchClients` and
 *    `fetchSellProducts` if they run concurrently (they share the siteId),
 *  - navigating to the real module pages afterwards hits the same cache.
 *
 * Failures are isolated: if any fetcher throws we log and treat that
 * category as empty (→ demo fallback), so a single flaky table doesn't
 * brick the whole command deck.
 */
async function buildOrbitGroups(siteId: string): Promise<OrbitGroups> {
  // Per-source catch handlers: keep the fetcher's native return type so we
  // don't have to weaken the generic signature of `safe()`. If any single
  // source fails we log and return an "empty" value of the correct shape;
  // the rest of the command deck keeps rendering.
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
        // Minimal safe shape: the normalizer only reads `departments`.
        { departments: [] } as unknown as Awaited<
          ReturnType<typeof fetchFactoryDashboardData>
        >,
      ),
    ),
    fetchUsers(siteId).catch(logAndReturn("users", [])),
  ]);

  const real: Record<string, OrbitItem[]> = {
    clienti: normalizeClients(clients),
    fornitori: normalizeSuppliers(suppliers),
    prodotti: normalizeProducts(products),
    progetti: normalizeProjects(projectsData.tasks ?? []),
    inventario: normalizeInventory(inventory),
    fabbrica: normalizeFactoryDepartments(factory.departments ?? []),
    admin: normalizeAdminUsers(users),
  };

  // For each category: use real if available, otherwise demo fallback.
  const groups: OrbitGroups = {};
  for (const nodeId of Object.keys(real)) {
    const realItems = real[nodeId];
    if (realItems.length > 0) {
      groups[nodeId] = buildOrbitSet(realItems, { isDemo: false });
    } else {
      const demoItems = DEMO_ORBIT_ITEMS[nodeId] ?? [];
      groups[nodeId] = buildOrbitSet(demoItems, { isDemo: true });
    }
  }

  return groups;
}
