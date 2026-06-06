import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createServiceClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { isAdminOrSuperadmin } from "@/lib/permissions";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";
import { logger } from "@/lib/logger";
import {
  CATEGORY_IMAGE_BUCKET,
  CATEGORY_IMAGE_MAX_SIZE_BYTES,
  extractCategoryImagePath,
  inferCategoryImageMimeType,
} from "@/lib/category-image-constants";
import { processCategoryImage } from "@/lib/category-image-processing.server";

const log = logger.scope("SellProductSubcategoryImage");

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

export async function POST(
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

    const formData = await req.formData();
    const file = formData.get("image");
    const subcategoryKey = String(formData.get("subcategory_key") ?? "").trim();
    const subcategoryName = String(
      formData.get("subcategory_name") ?? subcategoryKey,
    ).trim();

    if (!subcategoryKey) {
      return NextResponse.json(
        { error: "subcategory_key is required" },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 },
      );
    }

    if (!inferCategoryImageMimeType(file)) {
      return NextResponse.json(
        {
          error:
            "Formato non supportato. Usa file JPEG, PNG, GIF o WebP (.jpg, .jpeg, .png, .gif, .webp).",
        },
        { status: 400 },
      );
    }

    if (file.size > CATEGORY_IMAGE_MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    const { data: category, error: categoryError } = await supabase
      .from("sellproduct_categories")
      .select("id, site_id")
      .eq("id", categoryId)
      .eq("site_id", siteId)
      .maybeSingle();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: "Categoria non trovata" },
        { status: 404 },
      );
    }

    const { data: existingRow } = await supabase
      .from("sellproduct_subcategory_images")
      .select("image_url")
      .eq("site_id", siteId)
      .eq("category_id", categoryId)
      .eq("subcategory_key", subcategoryKey)
      .maybeSingle();

    const processedBuffer = await processCategoryImage(file);
    const fileName = `${siteId}/sell-subcategories/${categoryId}/${uuidv4()}.webp`;

    const { error: uploadError } = await supabase.storage
      .from(CATEGORY_IMAGE_BUCKET)
      .upload(fileName, processedBuffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/webp",
      });

    if (uploadError) {
      log.error("Sell subcategory upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload image: " + uploadError.message },
        { status: 500 },
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(CATEGORY_IMAGE_BUCKET).getPublicUrl(fileName);

    const { error: upsertError } = await supabase
      .from("sellproduct_subcategory_images")
      .upsert(
        {
          site_id: siteId,
          category_id: categoryId,
          subcategory_key: subcategoryKey,
          subcategory_name: subcategoryName || subcategoryKey,
          image_url: publicUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "site_id,category_id,subcategory_key" },
      );

    if (upsertError) {
      await supabase.storage.from(CATEGORY_IMAGE_BUCKET).remove([fileName]);
      return NextResponse.json(
        { error: "Failed to save subcategory image: " + upsertError.message },
        { status: 500 },
      );
    }

    if (existingRow?.image_url) {
      const oldPath = extractCategoryImagePath(existingRow.image_url);
      if (oldPath) {
        await supabase.storage.from(CATEGORY_IMAGE_BUCKET).remove([oldPath]);
      }
    }

    return NextResponse.json({ success: true, imageUrl: publicUrl });
  } catch (error: unknown) {
    log.error("Sell subcategory image upload error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
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

    const { searchParams } = new URL(req.url);
    const subcategoryKey = searchParams.get("subcategory_key")?.trim();

    if (!subcategoryKey) {
      return NextResponse.json(
        { error: "subcategory_key is required" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    const { data: existingRow } = await supabase
      .from("sellproduct_subcategory_images")
      .select("image_url")
      .eq("site_id", siteId)
      .eq("category_id", categoryId)
      .eq("subcategory_key", subcategoryKey)
      .maybeSingle();

    if (existingRow?.image_url) {
      const imagePath = extractCategoryImagePath(existingRow.image_url);
      if (imagePath) {
        await supabase.storage.from(CATEGORY_IMAGE_BUCKET).remove([imagePath]);
      }
    }

    const { error: deleteError } = await supabase
      .from("sellproduct_subcategory_images")
      .delete()
      .eq("site_id", siteId)
      .eq("category_id", categoryId)
      .eq("subcategory_key", subcategoryKey);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to remove subcategory image: " + deleteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    log.error("Sell subcategory image delete error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
