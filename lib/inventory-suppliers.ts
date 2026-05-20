import { createServiceClient } from "@/utils/supabase/server";

/**
 * Inventory items reference `inventory_suppliers`, while the main Suppliers
 * module stores the customer-facing supplier registry in `Supplier`.
 * Keep the inventory list in sync so selects can use the registered suppliers.
 */
export async function syncRegisteredSuppliersIntoInventorySuppliers(
  siteId: string,
) {
  const supabase = createServiceClient();

  const { data: registeredSuppliers, error: suppliersError } = await supabase
    .from("Supplier")
    .select(
      `
        name,
        short_name,
        description,
        address,
        location,
        phone,
        email,
        website,
        contact,
        cap,
        supplier_image,
        supplier_category_id,
        created_at,
        updated_at
      `,
    )
    .eq("site_id", siteId);

  if (suppliersError) {
    throw suppliersError;
  }

  const rows = (registeredSuppliers || [])
    .filter((supplier) => supplier.name)
    .map((supplier) => ({
      site_id: siteId,
      name: supplier.name,
      code: supplier.short_name || null,
      notes: supplier.description || null,
      short_name: supplier.short_name || null,
      address: supplier.address || null,
      location: supplier.location || null,
      phone: supplier.phone || null,
      email: supplier.email || null,
      website: supplier.website || null,
      contact: supplier.contact || null,
      cap: supplier.cap || null,
      supplier_image: supplier.supplier_image || null,
      supplier_category_id: supplier.supplier_category_id || null,
      created_at: supplier.created_at || undefined,
      updated_at: supplier.updated_at || undefined,
    }));

  if (rows.length === 0) {
    return;
  }

  const { error: upsertError } = await supabase
    .from("inventory_suppliers")
    .upsert(rows, {
      onConflict: "site_id,name",
      ignoreDuplicates: false,
    });

  if (upsertError) {
    throw upsertError;
  }
}

export async function fetchSyncedInventorySuppliers(siteId: string) {
  const supabase = createServiceClient();

  await syncRegisteredSuppliersIntoInventorySuppliers(siteId);

  const { data: suppliers, error } = await supabase
    .from("inventory_suppliers")
    .select("*")
    .eq("site_id", siteId)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return suppliers || [];
}
