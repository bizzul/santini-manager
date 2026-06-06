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
  isMissingImageUrlColumnError,
} from "@/lib/category-image-constants";
import { processCategoryImage } from "@/lib/category-image-processing.server";

const log = logger.scope("InventoryCategoryImage");

async function resolveSiteId(req: NextRequest): Promise<string | null> {
  const siteDomain = req.headers.get("x-site-domain");
  if (siteDomain) {
    const context = await getSiteContextFromDomain(siteDomain);
    return context.siteId;
  }
  const context = await getSiteContext(req);
  return context.siteId;
}

async function fetchCategoryForUpload(
  supabase: ReturnType<typeof createServiceClient>,
  categoryId: string,
  siteId: string,
) {
  const { data: category, error } = await supabase
    .from("inventory_categories")
    .select("id, site_id")
    .eq("id", categoryId)
    .maybeSingle();

  if (error) {
    log.error("Category lookup error:", error);
    return {
      error: NextResponse.json(
        { error: `Errore database: ${error.message}` },
        { status: 500 },
      ),
    };
  }

  if (!category) {
    return {
      error: NextResponse.json(
        { error: "Categoria non trovata" },
        { status: 404 },
      ),
    };
  }

  if (category.site_id !== siteId) {
    return {
      error: NextResponse.json(
        { error: "La categoria non appartiene a questo sito" },
        { status: 403 },
      ),
    };
  }

  const { data: imageRow, error: imageError } = await supabase
    .from("inventory_categories")
    .select("image_url")
    .eq("id", categoryId)
    .maybeSingle();

  if (imageError) {
    if (isMissingImageUrlColumnError(imageError.message)) {
      return {
        error: NextResponse.json(
          {
            error:
              "Colonna image_url mancante nel database. Applica le migration Supabase (20260606160000_add_image_url_to_inventory_categories.sql).",
          },
          { status: 503 },
        ),
      };
    }

    log.error("Category image_url lookup error:", imageError);
    return {
      error: NextResponse.json(
        { error: `Errore database: ${imageError.message}` },
        { status: 500 },
      ),
    };
  }

  return {
    category,
    existingImageUrl: imageRow?.image_url ?? null,
  };
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

    const { id: categoryId } = await params;
    const siteId = await resolveSiteId(req);

    if (!siteId) {
      return NextResponse.json(
        { error: "Site ID required" },
        { status: 400 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 },
      );
    }

    const mimeType = inferCategoryImageMimeType(file);
    if (!mimeType) {
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
    const lookup = await fetchCategoryForUpload(supabase, categoryId, siteId);
    if ("error" in lookup && lookup.error) {
      return lookup.error;
    }

    const { existingImageUrl } = lookup as {
      category: { id: string; site_id: string };
      existingImageUrl: string | null;
    };

    const processedBuffer = await processCategoryImage(file);
    const fileName = `${siteId}/${uuidv4()}.webp`;

    const { error: uploadError } = await supabase.storage
      .from(CATEGORY_IMAGE_BUCKET)
      .upload(fileName, processedBuffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/webp",
      });

    if (uploadError) {
      log.error("Upload error:", uploadError);
      const message = uploadError.message.toLowerCase().includes("bucket")
        ? `Bucket "${CATEGORY_IMAGE_BUCKET}" non configurato. Applica la migration 20260606160100_create_category_images_bucket.sql.`
        : `Failed to upload image: ${uploadError.message}`;
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(CATEGORY_IMAGE_BUCKET).getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from("inventory_categories")
      .update({
        image_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", categoryId)
      .eq("site_id", siteId);

    if (updateError) {
      await supabase.storage.from(CATEGORY_IMAGE_BUCKET).remove([fileName]);

      if (isMissingImageUrlColumnError(updateError.message)) {
        return NextResponse.json(
          {
            error:
              "Colonna image_url mancante nel database. Applica le migration Supabase (20260606160000_add_image_url_to_inventory_categories.sql).",
          },
          { status: 503 },
        );
      }

      return NextResponse.json(
        { error: "Failed to update category: " + updateError.message },
        { status: 500 },
      );
    }

    if (existingImageUrl) {
      const oldPath = extractCategoryImagePath(existingImageUrl);
      if (oldPath) {
        await supabase.storage.from(CATEGORY_IMAGE_BUCKET).remove([oldPath]);
      }
    }

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
    });
  } catch (error: unknown) {
    log.error("Category image upload error:", error);
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

    const { id: categoryId } = await params;
    const siteId = await resolveSiteId(req);

    if (!siteId) {
      return NextResponse.json(
        { error: "Site ID required" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const lookup = await fetchCategoryForUpload(supabase, categoryId, siteId);
    if ("error" in lookup && lookup.error) {
      return lookup.error;
    }

    const { existingImageUrl } = lookup as {
      category: { id: string; site_id: string };
      existingImageUrl: string | null;
    };

    if (existingImageUrl) {
      const imagePath = extractCategoryImagePath(existingImageUrl);
      if (imagePath) {
        await supabase.storage.from(CATEGORY_IMAGE_BUCKET).remove([imagePath]);
      }
    }

    const { error: updateError } = await supabase
      .from("inventory_categories")
      .update({
        image_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", categoryId)
      .eq("site_id", siteId);

    if (updateError) {
      if (isMissingImageUrlColumnError(updateError.message)) {
        return NextResponse.json(
          {
            error:
              "Colonna image_url mancante nel database. Applica le migration Supabase.",
          },
          { status: 503 },
        );
      }

      return NextResponse.json(
        { error: "Failed to update category: " + updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    log.error("Category image delete error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
