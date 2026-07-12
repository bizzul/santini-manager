import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { createClient, createServiceClient } from "@/utils/supabase/server";

/**
 * Aggregazione cross-space del Manager Personale.
 *
 * Perimetro: membership ESPLICITA (user_sites + user_organizations), senza
 * il bypass superadmin di user_can_access_site. Anche un superadmin vede
 * nell'aggregato solo gli spazi a cui e' realmente abilitato: il flag
 * abilita una vista, non un permesso.
 *
 * I fetch dei dati usano il client RLS-enforced con filtro esplicito
 * `in('site_id', ...)`: gli spazi non abilitati non entrano nella query e
 * le policy `user_can_access_site` fanno comunque da rete di sicurezza.
 */

export interface AccessibleSite {
  id: string;
  name: string;
  subdomain: string;
  logo: string | null;
}

export interface AggregateContext {
  userId: string;
  /** Tutti gli spazi a cui l'utente e' abilitato. */
  sites: AccessibleSite[];
  /** Spazi attivi nel filtro (default: tutti). */
  selectedSites: AccessibleSite[];
  selectedSiteIds: string[];
  siteById: Map<string, AccessibleSite>;
}

/** Membership esplicita: user_sites diretti + siti delle organizzazioni. */
export async function getAccessibleSites(
  userId: string,
): Promise<AccessibleSite[]> {
  const service = createServiceClient();

  const [siteLinks, orgLinks] = await Promise.all([
    service.from("user_sites").select("site_id").eq("user_id", userId),
    service
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", userId),
  ]);

  const orgIds = (orgLinks.data ?? []).map((r) => String(r.organization_id));
  const directSiteIds = (siteLinks.data ?? []).map((r) => String(r.site_id));

  const ids = new Set<string>(directSiteIds);
  if (orgIds.length > 0) {
    const { data: orgSites } = await service
      .from("sites")
      .select("id")
      .in("organization_id", orgIds);
    (orgSites ?? []).forEach((s) => ids.add(String(s.id)));
  }
  if (ids.size === 0) return [];

  const { data: sites, error } = await service
    .from("sites")
    .select("id, name, subdomain, logo")
    .in("id", Array.from(ids))
    .order("name");
  if (error) {
    console.error("[personale] getAccessibleSites error:", error);
    return [];
  }

  return (sites ?? [])
    .filter((s) => Boolean(s.subdomain))
    .map((s) => ({
      id: String(s.id),
      name: s.name ?? String(s.subdomain),
      subdomain: String(s.subdomain),
      logo: s.logo,
    }));
}

/**
 * Contesto delle pagine aggregate. `spazi` e' il filtro in URL
 * (subdomain separati da virgola); assente = tutti selezionati.
 */
export async function getAggregateContext(
  spazi?: string,
): Promise<AggregateContext> {
  const userContext = await getUserContext();
  if (!userContext?.userId) {
    redirect("/login");
  }

  const sites = await getAccessibleSites(userContext.userId);
  const requested = (spazi ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const selectedSites =
    requested.length > 0
      ? sites.filter((s) => requested.includes(s.subdomain))
      : sites;

  return {
    userId: userContext.userId,
    sites,
    selectedSites,
    selectedSiteIds: selectedSites.map((s) => s.id),
    siteById: new Map(sites.map((s) => [s.id, s])),
  };
}

// ---------------------------------------------------------------------------
// Fetcher aggregati (read-only). Tutti passano dal client RLS-enforced.
// ---------------------------------------------------------------------------

export interface AggregateTask {
  id: number;
  title: string | null;
  unique_code: string | null;
  status: string | null;
  task_type: string | null;
  deliveryDate: string | null;
  site_id: string;
}

export async function getAggregateTasks(
  siteIds: string[],
): Promise<AggregateTask[]> {
  if (siteIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("Task")
    .select("id, title, unique_code, status, task_type, deliveryDate, site_id")
    .in("site_id", siteIds)
    .eq("archived", false)
    .order("updated_at", { ascending: false })
    .limit(300);
  if (error) {
    console.error("[personale] getAggregateTasks error:", error);
    return [];
  }
  return (data ?? []) as AggregateTask[];
}

export interface AggregateInventoryItem {
  id: string;
  name: string;
  description: string | null;
  item_type: string | null;
  site_id: string;
}

export async function getAggregateInventoryItems(
  siteIds: string[],
): Promise<AggregateInventoryItem[]> {
  if (siteIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .select("id, name, description, item_type, site_id")
    .in("site_id", siteIds)
    .eq("is_active", true)
    .order("name")
    .limit(300);
  if (error) {
    console.error("[personale] getAggregateInventoryItems error:", error);
    return [];
  }
  return (data ?? []) as AggregateInventoryItem[];
}

export type ContactKind = "cliente" | "fornitore" | "produttore";

export interface AggregateContact {
  key: string;
  kind: ContactKind;
  name: string;
  email: string | null;
  phone: string | null;
  site_id: string;
  /** Sezione dello spazio nativo per il link del chip. */
  section: string;
}

export async function getAggregateContacts(
  siteIds: string[],
): Promise<AggregateContact[]> {
  if (siteIds.length === 0) return [];
  const supabase = await createClient();

  const [clients, suppliers, manufacturers] = await Promise.all([
    supabase
      .from("Client")
      .select(
        "id, businessName, individualFirstName, individualLastName, email, mobilePhone, site_id",
      )
      .in("site_id", siteIds)
      .limit(300),
    supabase
      .from("Supplier")
      .select("id, name, email, phone, site_id")
      .in("site_id", siteIds)
      .limit(300),
    supabase
      .from("Manufacturer")
      .select("id, name, email, phone, site_id")
      .in("site_id", siteIds)
      .limit(300),
  ]);

  const result: AggregateContact[] = [];

  for (const c of clients.data ?? []) {
    const name =
      c.businessName ||
      [c.individualFirstName, c.individualLastName].filter(Boolean).join(" ") ||
      `Cliente #${c.id}`;
    result.push({
      key: `client-${c.id}`,
      kind: "cliente",
      name,
      email: c.email,
      phone: c.mobilePhone,
      site_id: String(c.site_id),
      section: "clients",
    });
  }
  for (const s of suppliers.data ?? []) {
    result.push({
      key: `supplier-${s.id}`,
      kind: "fornitore",
      name: s.name,
      email: s.email,
      phone: s.phone,
      site_id: String(s.site_id),
      section: "suppliers",
    });
  }
  for (const m of manufacturers.data ?? []) {
    result.push({
      key: `manufacturer-${m.id}`,
      kind: "produttore",
      name: m.name,
      email: m.email,
      phone: m.phone,
      site_id: String(m.site_id),
      section: "manufacturers",
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export interface AggregateProduct {
  id: number;
  name: string;
  type: string | null;
  internal_code: string | null;
  list_price: number | null;
  site_id: string;
}

export async function getAggregateProducts(
  siteIds: string[],
): Promise<AggregateProduct[]> {
  if (siteIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("SellProduct")
    .select("id, name, type, internal_code, list_price, site_id")
    .in("site_id", siteIds)
    .eq("active", true)
    .order("name")
    .limit(300);
  if (error) {
    console.error("[personale] getAggregateProducts error:", error);
    return [];
  }
  return (data ?? []) as AggregateProduct[];
}

export type CategoryKind =
  | "inventario"
  | "prodotti"
  | "fornitori"
  | "produttori";

export interface AggregateCategory {
  key: string;
  kind: CategoryKind;
  name: string;
  description: string | null;
  site_id: string;
  section: string;
}

export async function getAggregateCategories(
  siteIds: string[],
): Promise<AggregateCategory[]> {
  if (siteIds.length === 0) return [];
  const supabase = await createClient();

  const [inventory, products, suppliers, manufacturers] = await Promise.all([
    supabase
      .from("inventory_categories")
      .select("id, name, description, site_id")
      .in("site_id", siteIds)
      .limit(200),
    supabase
      .from("sellproduct_categories")
      .select("id, name, site_id")
      .in("site_id", siteIds)
      .limit(200),
    supabase
      .from("Supplier_category")
      .select("id, name, description, site_id")
      .in("site_id", siteIds)
      .limit(200),
    supabase
      .from("Manufacturer_category")
      .select("id, name, description, site_id")
      .in("site_id", siteIds)
      .limit(200),
  ]);

  const result: AggregateCategory[] = [];
  for (const c of inventory.data ?? []) {
    result.push({
      key: `inv-${c.id}`,
      kind: "inventario",
      name: c.name,
      description: c.description,
      site_id: String(c.site_id),
      section: "categories",
    });
  }
  for (const c of products.data ?? []) {
    result.push({
      key: `prod-${c.id}`,
      kind: "prodotti",
      name: c.name,
      description: null,
      site_id: String(c.site_id),
      section: "product-categories",
    });
  }
  for (const c of suppliers.data ?? []) {
    result.push({
      key: `supp-${c.id}`,
      kind: "fornitori",
      name: c.name,
      description: c.description,
      site_id: String(c.site_id),
      section: "supplier-categories",
    });
  }
  for (const c of manufacturers.data ?? []) {
    result.push({
      key: `manu-${c.id}`,
      kind: "produttori",
      name: c.name,
      description: c.description,
      site_id: String(c.site_id),
      section: "manufacturer-categories",
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export interface SiteKpi {
  site: AccessibleSite;
  tasks: number;
  clients: number;
  inventoryItems: number;
  products: number;
}

export async function getAggregateKpis(
  sites: AccessibleSite[],
): Promise<SiteKpi[]> {
  if (sites.length === 0) return [];
  const supabase = await createClient();

  const countBySite = async (
    table: "Task" | "Client" | "inventory_items" | "SellProduct",
    siteId: string,
  ): Promise<number> => {
    let query = supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("site_id", siteId);
    if (table === "Task") query = query.eq("archived", false);
    if (table === "inventory_items") query = query.eq("is_active", true);
    if (table === "SellProduct") query = query.eq("active", true);
    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  };

  return Promise.all(
    sites.map(async (site) => {
      const [tasks, clients, inventoryItems, products] = await Promise.all([
        countBySite("Task", site.id),
        countBySite("Client", site.id),
        countBySite("inventory_items", site.id),
        countBySite("SellProduct", site.id),
      ]);
      return { site, tasks, clients, inventoryItems, products };
    }),
  );
}
