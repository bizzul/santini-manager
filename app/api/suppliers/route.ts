import { createClient } from "../../../utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getSiteData } from "@/lib/fetchers";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Extract domain from request headers
    const domain = req.headers.get("host");
    let siteId = null;

    // Get site information
    if (domain) {
      try {
        const siteResult = await getSiteData(domain);
        if (siteResult?.data) {
          siteId = siteResult.data.id;
        }
      } catch (error) {
        console.error("Error fetching site data:", error);
      }
    }

    // Fetch suppliers filtered by site_id if available
    let supplierQuery = supabase
      .from("Supplier")
      .select("*")
      .order("name", { ascending: true });

    if (siteId) {
      supplierQuery = supplierQuery.eq("site_id", siteId);
    }

    const { data: suppliers, error } = await supplierQuery;

    if (error) {
      throw error;
    }

    // Poi riordiniamo manualmente mettendo i default prima
    const orderedSuppliers = suppliers.sort((a, b) => {
      // Altrimenti manteniamo l'ordine alfabetico
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json(orderedSuppliers);
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching suppliers" },
      { status: 500 },
    );
  }
}
