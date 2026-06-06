import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { isAdminOrSuperadmin } from "@/lib/permissions";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("SellProductSubcategoryReorder");

async function resolveSiteId(req: NextRequest): Promise<string | null> {
  const siteDomain = req.headers.get("x-site-domain");
  if (siteDomain) {
    const context = await getSiteContextFromDomain(siteDomain);
    return context.siteId;
  }
  const context = await getSiteContext(req);
  return context.siteId;
}

function parseCategoryId(rawId: string): number | null {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

interface ReorderItem {
  subcategory_key: string;
  subcategory_name: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userContext = await getUserContext();
    if (!userContext?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminOrSuperadmin(userContext.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: rawCategoryId } = await params;
    const categoryId = parseCategoryId(rawCategoryId);
    if (!categoryId) {
      return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
    }

    const siteId = await resolveSiteId(req);
    if (!siteId) {
      return NextResponse.json({ error: "Site ID required" }, { status: 400 });
    }

    const body = await req.json();
    const items: ReorderItem[] = Array.isArray(body?.items)
      ? body.items.filter(
          (item: unknown): item is ReorderItem =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as ReorderItem).subcategory_key === "string" &&
            typeof (item as ReorderItem).subcategory_name === "string",
        )
      : [];

    if (items.length === 0) {
      return NextResponse.json({ error: "items is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: category, error: categoryError } = await supabase
      .from("sellproduct_categories")
      .select("id")
      .eq("id", categoryId)
      .eq("site_id", siteId)
      .maybeSingle();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: "Categoria non trovata" },
        { status: 404 },
      );
    }

    const now = new Date().toISOString();

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const subcategoryKey = item.subcategory_key.trim();
      const subcategoryName =
        item.subcategory_name.trim() || subcategoryKey;

      const { data: existing, error: lookupError } = await supabase
        .from("sellproduct_subcategory_images")
        .select("id")
        .eq("site_id", siteId)
        .eq("category_id", categoryId)
        .eq("subcategory_key", subcategoryKey)
        .maybeSingle();

      if (lookupError) {
        log.error("Sell subcategory lookup error:", lookupError);
        return NextResponse.json(
          {
            error:
              "Failed to reorder subcategories: " + lookupError.message,
          },
          { status: 500 },
        );
      }

      if (existing) {
        const { error: updateError } = await supabase
          .from("sellproduct_subcategory_images")
          .update({ sort_order: index, updated_at: now })
          .eq("id", existing.id);

        if (updateError) {
          return NextResponse.json(
            {
              error:
                "Failed to reorder subcategories: " + updateError.message,
            },
            { status: 500 },
          );
        }
      } else {
        const { error: insertError } = await supabase
          .from("sellproduct_subcategory_images")
          .insert({
            site_id: siteId,
            category_id: categoryId,
            subcategory_key: subcategoryKey,
            subcategory_name: subcategoryName,
            sort_order: index,
            image_url: null,
            description: null,
          });

        if (insertError) {
          return NextResponse.json(
            {
              error:
                "Failed to reorder subcategories: " + insertError.message,
            },
            { status: 500 },
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    log.error("Sell subcategory reorder error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
