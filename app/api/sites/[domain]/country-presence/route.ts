import { NextRequest, NextResponse } from "next/server";
import { getSiteData } from "@/lib/fetchers";
import { createClient } from "@/utils/supabase/server";
import { fetchCountryDashboardData } from "@/lib/country-dashboard.server";

/**
 * Clients + resellers located in a given country (ISO alpha-2), used by the
 * dashboard "click a country" overlay to plot green client dots and red
 * reseller dots. GET `?iso2=DE`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  try {
    const { domain } = await params;
    const { searchParams } = new URL(request.url);
    const iso2 = (searchParams.get("iso2") || "").toUpperCase();

    if (!iso2) {
      return NextResponse.json({ error: "iso2 is required" }, { status: 400 });
    }

    const response = await getSiteData(domain);
    if (!response?.data) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }
    const siteId = response.data.id;
    const supabase = await createClient();

    const [{ data: clientsRaw }, resellersRes] = await Promise.all([
      supabase
        .from("Client")
        .select(
          "id, businessName, individualFirstName, individualLastName, city, address, zipCode, countryCode",
        )
        .eq("site_id", siteId)
        .eq("countryCode", iso2),
      supabase
        .from("Reseller")
        .select("id, name, zip_city, address, country, country_code")
        .eq("site_id", siteId)
        .eq("country_code", iso2),
    ]);

    const clients = (clientsRaw ?? []).map((c) => ({
      id: c.id as number,
      name:
        (c.businessName as string) ||
        [c.individualFirstName, c.individualLastName]
          .filter(Boolean)
          .join(" ") ||
        `Cliente #${c.id}`,
      city: (c.city as string) || "",
      address: (c.address as string) || "",
      zipCode: c.zipCode ?? null,
      countryCode: (c.countryCode as string) || iso2,
    }));

    // Reseller table may not exist in every environment; degrade gracefully.
    const resellers = resellersRes.error
      ? []
      : (resellersRes.data ?? []).map((r) => ({
          id: r.id as number,
          name: (r.name as string) || `Rivenditore #${r.id}`,
          zipCity: (r.zip_city as string) || "",
          address: (r.address as string) || "",
          countryCode: (r.country_code as string) || iso2,
        }));

    // Business activity for the country (offers/projects in progress).
    const cd = await fetchCountryDashboardData(siteId, iso2);
    const stats = {
      activeClients: clients.length,
      activeResellers: resellers.length,
      offersInProgress: cd.dashboard.activeOffers.count,
      projectsInProgress: cd.country.projects,
    };

    return NextResponse.json({ clients, resellers, stats });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
