/**
 * Copia immagini profilo da Santini a Scherman per:
 * - sellproduct_categories + SellProduct
 * - inventory_categories + inventory_subcategory_images + inventory_item_variants
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/copy-scherman-images-from-santini.ts
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { extractCategoryImagePath } from "../lib/category-image-constants";

const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
const SERVICE_KEY =
    process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const SOURCE_SUBDOMAIN = "santini";
const TARGET_SUBDOMAIN = "scherman";

const CATEGORY_IMAGE_BUCKET = "category-images";
const DOCUMENTS_BUCKET = "documents";

/** Mappa nomi categoria magazzino Santini → Scherman */
const INVENTORY_CATEGORY_MAP: Record<string, string> = {
    LEGNO: "Legno",
    FERRAMENTA: "Ferramenta",
    VERNICE: "Colle e vernici",
    BORDI: "Guarnizioni",
};

/** Mappa sottocategoria LEGNO Santini → categoria figlia Scherman */
const INVENTORY_SUBCATEGORY_MAP: Record<string, string> = {
    Lamellare: "Lamellare",
    Massiccio: "Massello",
    Pannelli: "Pannelli",
    Impiallacciatura: "Compensato/Multistrato",
    Profili: "Lamellare",
};

/** Categorie rivendita: fallback immagine da altra categoria Santini */
const SELL_CATEGORY_FALLBACK: Record<string, string> = {
    Scale: "Arredamento",
    "Strutture in legno": "Serramenti",
};

function normalizeName(value: string): string {
    return value.trim().toLowerCase();
}

function extractBucketPath(publicUrl: string, bucket: string): string | null {
    const marker = `/${bucket}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return publicUrl.slice(idx + marker.length);
}

function extensionFromUrl(url: string): string {
    const clean = url.split("?")[0];
    const ext = clean.split(".").pop()?.toLowerCase();
    if (ext && ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return ext;
    return "webp";
}

async function copyStorageImage(
    supabase: SupabaseClient,
    sourceUrl: string,
    bucket: string,
    destPath: string,
): Promise<string> {
    const response = await fetch(sourceUrl);
    if (!response.ok) {
        throw new Error(`Download failed (${response.status}): ${sourceUrl}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType =
        response.headers.get("content-type") ||
        (destPath.endsWith(".png") ? "image/png" : "image/webp");

    const { error } = await supabase.storage.from(bucket).upload(destPath, buffer, {
        contentType,
        cacheControl: "3600",
        upsert: true,
    });

    if (error) {
        throw new Error(`Upload ${destPath}: ${error.message}`);
    }

    const {
        data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(destPath);

    return publicUrl;
}

async function getSiteId(supabase: SupabaseClient, subdomain: string) {
    const { data, error } = await supabase
        .from("sites")
        .select("id, subdomain")
        .eq("subdomain", subdomain)
        .single();

    if (error || !data) {
        throw new Error(`Site "${subdomain}" non trovato: ${error?.message}`);
    }

    return data.id;
}

async function copySellProductCategoryImages(
    supabase: SupabaseClient,
    sourceSiteId: string,
    targetSiteId: string,
) {
    const { data: sourceCategories } = await supabase
        .from("sellproduct_categories")
        .select("id, name, image_url")
        .eq("site_id", sourceSiteId)
        .not("image_url", "is", null);

    const { data: targetCategories } = await supabase
        .from("sellproduct_categories")
        .select("id, name, image_url")
        .eq("site_id", targetSiteId);

    const targetByName = new Map(
        (targetCategories || []).map((c) => [normalizeName(c.name), c]),
    );

    const copiedByTargetName = new Map<string, string>();
    let count = 0;

    for (const source of sourceCategories || []) {
        const target = targetByName.get(normalizeName(source.name));
        if (!target || !source.image_url) continue;

        const sourcePath = extractCategoryImagePath(source.image_url);
        if (!sourcePath) continue;

        const destPath = `${targetSiteId}/sell-categories/${target.id}/${randomUUID()}.webp`;
        const publicUrl = await copyStorageImage(
            supabase,
            source.image_url,
            CATEGORY_IMAGE_BUCKET,
            destPath,
        );

        const { error } = await supabase
            .from("sellproduct_categories")
            .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
            .eq("id", target.id)
            .eq("site_id", targetSiteId);

        if (error) throw new Error(`sellproduct_categories ${target.name}: ${error.message}`);

        copiedByTargetName.set(normalizeName(target.name), publicUrl);
        count++;
        console.log(`  ✓ Categoria rivendita: ${target.name}`);
    }

    // Fallback: Scale e Strutture in legno da categorie correlate
    for (const [targetName, fallbackName] of Object.entries(SELL_CATEGORY_FALLBACK)) {
        const target = targetByName.get(normalizeName(targetName));
        if (!target || target.image_url) continue;

        const fallbackUrl = copiedByTargetName.get(normalizeName(fallbackName));
        if (!fallbackUrl) continue;

        const sourcePath = extractCategoryImagePath(fallbackUrl);
        if (!sourcePath) continue;

        const destPath = `${targetSiteId}/sell-categories/${target.id}/${randomUUID()}.webp`;
        const publicUrl = await copyStorageImage(
            supabase,
            fallbackUrl,
            CATEGORY_IMAGE_BUCKET,
            destPath,
        );

        await supabase
            .from("sellproduct_categories")
            .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
            .eq("id", target.id);

        copiedByTargetName.set(normalizeName(targetName), publicUrl);
        count++;
        console.log(`  ✓ Categoria rivendita (fallback): ${targetName}`);
    }

    return copiedByTargetName;
}

async function copySellProductImages(
    supabase: SupabaseClient,
    sourceSiteId: string,
    targetSiteId: string,
    categoryImages: Map<string, string>,
) {
    const { data: sourceProducts } = await supabase
        .from("SellProduct")
        .select("id, name, image_url, category_id, sellproduct_categories(name)")
        .eq("site_id", sourceSiteId)
        .not("image_url", "is", null);

    const { data: targetProducts } = await supabase
        .from("SellProduct")
        .select("id, name, image_url, category_id, sellproduct_categories(name)")
        .eq("site_id", targetSiteId);

    const sourceByCategory = new Map<string, string[]>();
    for (const product of sourceProducts || []) {
        const catName = (product.sellproduct_categories as { name?: string } | null)?.name;
        if (!catName || !product.image_url) continue;
        const list = sourceByCategory.get(normalizeName(catName)) || [];
        list.push(product.image_url);
        sourceByCategory.set(normalizeName(catName), list);
    }

    let count = 0;
    const categoryImageIndex = new Map<string, number>();

    for (const product of targetProducts || []) {
        if (product.image_url) continue;

        const catName = (product.sellproduct_categories as { name?: string } | null)?.name;
        if (!catName) continue;

        const normalizedCat = normalizeName(catName);
        let sourceUrl: string | undefined;

        const directSources = sourceByCategory.get(normalizedCat);
        if (directSources?.length) {
            const idx = categoryImageIndex.get(normalizedCat) || 0;
            sourceUrl = directSources[idx % directSources.length];
            categoryImageIndex.set(normalizedCat, idx + 1);
        }

        if (!sourceUrl) {
            sourceUrl = categoryImages.get(normalizedCat);
        }

        if (!sourceUrl) {
            const fallback = SELL_CATEGORY_FALLBACK[catName];
            if (fallback) {
                sourceUrl = categoryImages.get(normalizeName(fallback));
            }
        }

        if (!sourceUrl) continue;

        const bucket = sourceUrl.includes(`/${DOCUMENTS_BUCKET}/`)
            ? DOCUMENTS_BUCKET
            : CATEGORY_IMAGE_BUCKET;

        const ext = extensionFromUrl(sourceUrl);
        const destPath =
            bucket === DOCUMENTS_BUCKET
                ? `${targetSiteId}/sell-products/images/${product.id}-${randomUUID()}.${ext}`
                : `${targetSiteId}/sell-products/images/${product.id}-${randomUUID()}.webp`;
        const publicUrl = await copyStorageImage(
            supabase,
            sourceUrl,
            bucket,
            destPath,
        );

        const { error } = await supabase
            .from("SellProduct")
            .update({ image_url: publicUrl })
            .eq("id", product.id)
            .eq("site_id", targetSiteId);

        if (error) throw new Error(`SellProduct ${product.name}: ${error.message}`);

        count++;
        console.log(`  ✓ Prodotto rivendita: ${product.name}`);
    }

    return count;
}

async function copyInventoryCategoryImages(
    supabase: SupabaseClient,
    sourceSiteId: string,
    targetSiteId: string,
) {
    const { data: sourceCategories } = await supabase
        .from("inventory_categories")
        .select("id, name, image_url")
        .eq("site_id", sourceSiteId)
        .not("image_url", "is", null);

    const { data: targetCategories } = await supabase
        .from("inventory_categories")
        .select("id, name, image_url, parent_id")
        .eq("site_id", targetSiteId);

    const targetByName = new Map(
        (targetCategories || []).map((c) => [normalizeName(c.name), c]),
    );

    const copiedByTargetName = new Map<string, string>();
    let count = 0;

    for (const source of sourceCategories || []) {
        const mappedName = INVENTORY_CATEGORY_MAP[source.name] || source.name;
        const target = targetByName.get(normalizeName(mappedName));
        if (!target || !source.image_url) continue;

        const destPath = `${targetSiteId}/categories/${target.id}/${randomUUID()}.webp`;
        const publicUrl = await copyStorageImage(
            supabase,
            source.image_url,
            CATEGORY_IMAGE_BUCKET,
            destPath,
        );

        const { error } = await supabase
            .from("inventory_categories")
            .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
            .eq("id", target.id)
            .eq("site_id", targetSiteId);

        if (error) throw new Error(`inventory_categories ${target.name}: ${error.message}`);

        copiedByTargetName.set(normalizeName(target.name), publicUrl);
        count++;
        console.log(`  ✓ Categoria magazzino: ${target.name}`);
    }

    return { copiedByTargetName, targetByName };
}

async function copyInventorySubcategoryImages(
    supabase: SupabaseClient,
    sourceSiteId: string,
    targetSiteId: string,
    targetByName: Map<string, { id: string; name: string }>,
) {
    const { data: sourceSubcats } = await supabase
        .from("inventory_subcategory_images")
        .select("category_id, subcategory_key, subcategory_name, image_url, description, sort_order")
        .eq("site_id", sourceSiteId)
        .not("image_url", "is", null);

    let count = 0;

    for (const source of sourceSubcats || []) {
        const mappedName =
            INVENTORY_SUBCATEGORY_MAP[source.subcategory_name] ||
            INVENTORY_SUBCATEGORY_MAP[source.subcategory_key] ||
            source.subcategory_name;

        const targetCat = targetByName.get(normalizeName(mappedName));
        if (!targetCat || !source.image_url) continue;

        const destPath = `${targetSiteId}/subcategories/${targetCat.id}/${randomUUID()}.webp`;
        const publicUrl = await copyStorageImage(
            supabase,
            source.image_url,
            CATEGORY_IMAGE_BUCKET,
            destPath,
        );

        const subcategoryKey = normalizeName(mappedName).replace(/\s+/g, "-");

        const { error } = await supabase
            .from("inventory_subcategory_images")
            .upsert(
                {
                    site_id: targetSiteId,
                    category_id: targetCat.id,
                    subcategory_key: subcategoryKey,
                    subcategory_name: targetCat.name,
                    image_url: publicUrl,
                    description: source.description,
                    sort_order: source.sort_order ?? 0,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "site_id,category_id,subcategory_key" },
            );

        if (error) {
            throw new Error(`inventory_subcategory_images ${targetCat.name}: ${error.message}`);
        }

        // Aggiorna anche image_url sulla categoria figlia (usata come profilo in UI)
        await supabase
            .from("inventory_categories")
            .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
            .eq("id", targetCat.id)
            .eq("site_id", targetSiteId);

        count++;
        console.log(`  ✓ Sottocategoria magazzino: ${targetCat.name}`);
    }

    return count;
}

async function propagateParentCategoryImages(
    supabase: SupabaseClient,
    targetSiteId: string,
    categoryImages: Map<string, string>,
) {
    const { data: categories } = await supabase
        .from("inventory_categories")
        .select("id, name, parent_id, image_url")
        .eq("site_id", targetSiteId);

    const byId = new Map((categories || []).map((c) => [c.id, c]));
    let count = 0;

    for (const cat of categories || []) {
        if (cat.image_url || !cat.parent_id) continue;

        const parent = byId.get(cat.parent_id);
        if (!parent?.image_url) continue;

        const destPath = `${targetSiteId}/categories/${cat.id}/${randomUUID()}.webp`;
        const publicUrl = await copyStorageImage(
            supabase,
            parent.image_url,
            CATEGORY_IMAGE_BUCKET,
            destPath,
        );

        await supabase
            .from("inventory_categories")
            .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
            .eq("id", cat.id);

        categoryImages.set(normalizeName(cat.name), publicUrl);
        count++;
        console.log(`  ✓ Categoria figlia (da padre): ${cat.name}`);
    }

    return count;
}

async function copyInventoryItemVariantImages(
    supabase: SupabaseClient,
    targetSiteId: string,
    categoryImages: Map<string, string>,
    targetByName: Map<string, { id: string; name: string }>,
) {
    const { data: items } = await supabase
        .from("inventory_items")
        .select("id, name, category_id, inventory_categories(name)")
        .eq("site_id", targetSiteId);

    const { data: variants } = await supabase
        .from("inventory_item_variants")
        .select("id, item_id, image_url")
        .eq("site_id", targetSiteId);

    const variantsByItem = new Map<string, Array<{ id: string; image_url: string | null }>>();
    for (const variant of variants || []) {
        const list = variantsByItem.get(variant.item_id) || [];
        list.push(variant);
        variantsByItem.set(variant.item_id, list);
    }

    let count = 0;

    for (const item of items || []) {
        const catName = (item.inventory_categories as { name?: string } | null)?.name;
        if (!catName) continue;

        const imageUrl = categoryImages.get(normalizeName(catName));
        if (!imageUrl) continue;

        const itemVariants = variantsByItem.get(item.id) || [];
        for (const variant of itemVariants) {
            if (variant.image_url) continue;

            const bucket = CATEGORY_IMAGE_BUCKET;
            const ext = extensionFromUrl(imageUrl);
            const destPath = `${targetSiteId}/items/${variant.id}/${randomUUID()}.${ext}`;
            const publicUrl = await copyStorageImage(supabase, imageUrl, bucket, destPath);

            const { error } = await supabase
                .from("inventory_item_variants")
                .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
                .eq("id", variant.id)
                .eq("site_id", targetSiteId);

            if (error) {
                throw new Error(`inventory_item_variants ${item.name}: ${error.message}`);
            }

            count++;
            console.log(`  ✓ Articolo magazzino: ${item.name}`);
        }
    }

    return count;
}

async function main() {
    if (!SUPABASE_URL || !SERVICE_KEY) {
        console.error("Missing Supabase env vars. Run with --env-file=.env.local");
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const sourceSiteId = await getSiteId(supabase, SOURCE_SUBDOMAIN);
    const targetSiteId = await getSiteId(supabase, TARGET_SUBDOMAIN);

    console.log(`📷 Copia immagini ${SOURCE_SUBDOMAIN} → ${TARGET_SUBDOMAIN}\n`);

    console.log("Categorie rivendita:");
    const sellCategoryImages = await copySellProductCategoryImages(
        supabase,
        sourceSiteId,
        targetSiteId,
    );

    console.log("\nProdotti rivendita:");
    const sellProductCount = await copySellProductImages(
        supabase,
        sourceSiteId,
        targetSiteId,
        sellCategoryImages,
    );

    console.log("\nCategorie magazzino:");
    const { copiedByTargetName, targetByName } = await copyInventoryCategoryImages(
        supabase,
        sourceSiteId,
        targetSiteId,
    );

    console.log("\nSottocategorie magazzino:");
    const subcatCount = await copyInventorySubcategoryImages(
        supabase,
        sourceSiteId,
        targetSiteId,
        targetByName,
    );

    console.log("\nCategorie figlie (propagazione da padre):");
    const childCount = await propagateParentCategoryImages(
        supabase,
        targetSiteId,
        copiedByTargetName,
    );

    // Unisci immagini categorie padre e figlie per gli articoli
    const allCategoryImages = new Map(copiedByTargetName);
    const { data: allTargetCats } = await supabase
        .from("inventory_categories")
        .select("name, image_url")
        .eq("site_id", targetSiteId)
        .not("image_url", "is", null);

    for (const cat of allTargetCats || []) {
        if (cat.image_url) {
            allCategoryImages.set(normalizeName(cat.name), cat.image_url);
        }
    }

    console.log("\nArticoli magazzino (varianti):");
    const variantCount = await copyInventoryItemVariantImages(
        supabase,
        targetSiteId,
        allCategoryImages,
        targetByName,
    );

    console.log(`\n✅ Completato:`);
    console.log(`   Categorie rivendita: ${sellCategoryImages.size}`);
    console.log(`   Prodotti rivendita: ${sellProductCount}`);
    console.log(`   Categorie magazzino: ${copiedByTargetName.size}`);
    console.log(`   Sottocategorie magazzino: ${subcatCount}`);
    console.log(`   Categorie figlie propagate: ${childCount}`);
    console.log(`   Varianti magazzino: ${variantCount}`);
}

main().catch((err) => {
    console.error("\n❌ Copia immagini fallita:", err);
    process.exit(1);
});
