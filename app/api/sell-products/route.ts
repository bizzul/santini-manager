import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";

export const GET = async (req: NextRequest) => {
  try {
    const supabase = await createClient();

    // Get domain from header
    const domain = req.headers.get("host");
    let siteId = null;

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

    let query = supabase.from("SellProduct").select("*").eq("active", true);
    if (siteId) {
      query = query.eq("site_id", siteId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(err.message);
  }
};
