import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";

export const GET = async (req: NextRequest) => {
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

    // Fetch categories filtered by site_id if available
    let categoryQuery = supabase
      .from("Product_category")
      .select("*")
      .order("name", { ascending: true });

    if (siteId) {
      categoryQuery = categoryQuery.eq("site_id", siteId);
    }

    const { data: categories, error } = await categoryQuery;

    if (error) throw error;

    return NextResponse.json(categories);
  } catch (err: any) {
    return NextResponse.json(err.message);
  }
};
