import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";
import { logger } from "@/lib/logger";
import {
  buildSellProductImportPlan,
  normalizeSellProductCategory,
  parseSellProductCsv,
  SELL_PRODUCT_IMPORT_HEADERS,
  type SellProductImportExistingRecord,
  type SellProductImportPlanEntry,
} from "@/lib/sell-product-import";
import { formatSellProductCode } from "@/lib/sell-product-code";

const log = logger.scope("SellProductImportCsv");
const SELL_PRODUCT_SELECT =
  "id, internal_code, name, type, subcategory, tipo, product_type, description, price_list, image_url, doc_url, active, category:category_id(id, name)";
const SELL_PRODUCT_LEGACY_SELECT =
  "id, internal_code, name, type, description, price_list, image_url, doc_url, active, category:category_id(id, name)";

interface ImportResult {
  success: boolean;
  mode: "preview" | "apply";
  categoryFilter: string | null;
  totalRows: number;
  filteredOut: number;
  imported: number;
  updated: number;
  deactivated: number;
  skipped: number;
  errors: string[];
  entries: SellProductImportPlanEntry[];
}

function isMissingColumnError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = "message" in error ? String(error.message ?? "") : "";
  const code = "code" in error ? String(error.code ?? "") : "";

  return code === "42703" || message.toLowerCase().includes("does not exist");
}

async function fetchExistingProductsForImport(
  supabase: Awaited<ReturnType<typeof createClient>>,
  siteId: string,
) {
  const result = await supabase
    .from("SellProduct")
    .select(SELL_PRODUCT_SELECT)
    .eq("site_id", siteId);

  if (result.error && isMissingColumnError(result.error)) {
    return supabase
      .from("SellProduct")
      .select(SELL_PRODUCT_LEGACY_SELECT)
      .eq("site_id", siteId);
  }

  return result;
}

async function fetchImportedProduct(
  supabase: Awaited<ReturnType<typeof createClient>>,
  siteId: string,
  productId: number,
) {
  const result = await supabase
    .from("SellProduct")
    .select(SELL_PRODUCT_SELECT)
    .eq("id", productId)
    .eq("site_id", siteId)
    .single();

  if (result.error && isMissingColumnError(result.error)) {
    return supabase
      .from("SellProduct")
      .select(SELL_PRODUCT_LEGACY_SELECT)
      .eq("id", productId)
      .eq("site_id", siteId)
      .single();
  }

  return result;
}

async function ensureCategoryId(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  siteId: string;
  categoryName: string;
  categoryMap: Map<string, number>;
}) {
  const normalizedName = normalizeSellProductCategory(params.categoryName);
  const existingId = params.categoryMap.get(normalizedName);
  if (existingId) {
    return existingId;
  }

  const { data, error } = await params.supabase
    .from("sellproduct_categories")
    .insert({
      site_id: params.siteId,
      name: params.categoryName,
    })
    .select("id, name")
    .single();

  if (error || !data) {
    throw new Error(
      error?.message || `Impossibile creare la categoria ${params.categoryName}`,
    );
  }

  params.categoryMap.set(normalizedName, data.id);
  return data.id;
}

export async function POST(request: NextRequest) {
  try {
    const userContext = await getUserContext();
    if (!userContext?.user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const siteDomain = request.headers.get("x-site-domain");
    let siteId: string | null = null;

    if (siteDomain) {
      const context = await getSiteContextFromDomain(siteDomain);
      siteId = context.siteId;
    } else {
      const context = await getSiteContext(request);
      siteId = context.siteId;
    }

    if (!siteId) {
      return NextResponse.json(
        { error: "Site ID richiesto per l'importazione" },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mode = formData.get("mode") === "apply" ? "apply" : "preview";
    const categoryFilter =
      String(formData.get("categoryFilter") || "").trim() || null;

    if (!file) {
      return NextResponse.json({ error: "Nessun file fornito" }, { status: 400 });
    }

    const csvText = await file.text();
    const { headers, rows } = parseSellProductCsv(csvText);

    if (headers.length === 0 || rows.length === 0) {
      return NextResponse.json(
        { error: "Il file CSV è vuoto o non valido" },
        { status: 400 },
      );
    }

    const requiredHeaders = ["CATEGORIA", "NOME_PRODOTTO", "SOTTOCATEGORIA"];
    const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { error: `Colonne mancanti nel CSV: ${missingHeaders.join(", ")}` },
        { status: 400 },
      );
    }

    const unknownHeaders = headers.filter(
      (header) => !SELL_PRODUCT_IMPORT_HEADERS.includes(header as never),
    );
    if (unknownHeaders.length > 0) {
      return NextResponse.json(
        {
          error: `Colonne non supportate nel CSV: ${unknownHeaders.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: existingProducts,
      error: existingProductsError,
    } = await fetchExistingProductsForImport(supabase, siteId);

    if (existingProductsError) {
      log.error("Errore recupero prodotti esistenti per import", {
        siteId,
        mode,
        categoryFilter,
        error: existingProductsError,
      });
      return NextResponse.json(
        { error: "Errore nel recupero dei prodotti esistenti" },
        { status: 500 },
      );
    }

    const importPlan = buildSellProductImportPlan({
      headers,
      rows,
      existingProducts: (existingProducts || []) as SellProductImportExistingRecord[],
      categoryFilter,
    });

    if (mode === "preview") {
      const previewResult: ImportResult = {
        success: importPlan.summary.errors.length === 0,
        mode,
        categoryFilter,
        totalRows: importPlan.summary.totalRows,
        filteredOut: importPlan.summary.filteredOut,
        imported: importPlan.summary.plannedInserts,
        updated: importPlan.summary.plannedUpdates,
        deactivated: importPlan.summary.plannedDeactivations,
        skipped: importPlan.summary.skipped,
        errors: importPlan.summary.errors,
        entries: importPlan.entries,
      };

      return NextResponse.json(previewResult);
    }

    const { data: existingCategories, error: categoryError } = await supabase
      .from("sellproduct_categories")
      .select("id, name")
      .eq("site_id", siteId);

    if (categoryError) {
      return NextResponse.json(
        { error: "Errore nel recupero delle categorie prodotto" },
        { status: 500 },
      );
    }

    const categoryMap = new Map<string, number>(
      (existingCategories || []).map((category) => [
        normalizeSellProductCategory(category.name),
        category.id,
      ]),
    );

    const mutableProducts = new Map<number, SellProductImportExistingRecord>(
      ((existingProducts || []) as SellProductImportExistingRecord[]).map((product) => [
        product.id,
        product,
      ]),
    );

    const result: ImportResult = {
      success: true,
      mode,
      categoryFilter,
      totalRows: importPlan.summary.totalRows,
      filteredOut: importPlan.summary.filteredOut,
      imported: 0,
      updated: 0,
      deactivated: 0,
      skipped: importPlan.summary.skipped,
      errors: [...importPlan.summary.errors],
      entries: importPlan.entries.map((entry) => ({ ...entry })),
    };

    for (const entry of result.entries) {
      if (entry.action === "skip" || entry.action === "error") {
        continue;
      }

      try {
        const categoryId = await ensureCategoryId({
          supabase,
          siteId,
          categoryName: entry.csvRow.category_name!,
          categoryMap,
        });

        const targetRecord = entry.targetId ? mutableProducts.get(entry.targetId) : undefined;
        const desiredCode = entry.csvRow.internal_code || null;
        const codeConflict = desiredCode
          ? Array.from(mutableProducts.values()).find((product) => {
              if (product.internal_code !== desiredCode) {
                return false;
              }

              return product.id !== targetRecord?.id;
            })
          : undefined;

        const payload = {
          name: entry.csvRow.name,
          type: entry.csvRow.subcategory || "",
          subcategory: entry.csvRow.subcategory || "",
          tipo: entry.csvRow.tipo || null,
          product_type: entry.csvRow.tipo || null,
          description: entry.csvRow.description || null,
          price_list: entry.csvRow.price_list,
          image_url: entry.csvRow.image_url || null,
          doc_url: entry.csvRow.doc_url || null,
          active: entry.csvRow.active,
          category_id: categoryId,
        };

        let { data: insertedProduct, error: insertError } = await supabase
          .from("SellProduct")
          .insert({
            ...payload,
            site_id: siteId,
          })
          .select(SELL_PRODUCT_SELECT)
          .single();

        if (insertError && isMissingColumnError(insertError)) {
          const legacyPayload = {
            name: entry.csvRow.name,
            type: entry.csvRow.subcategory || "",
            description: entry.csvRow.description || null,
            price_list: entry.csvRow.price_list,
            image_url: entry.csvRow.image_url || null,
            doc_url: entry.csvRow.doc_url || null,
            active: entry.csvRow.active,
            category_id: categoryId,
          };

          const legacyInsertResult = await supabase
            .from("SellProduct")
            .insert({
              ...legacyPayload,
              site_id: siteId,
            })
            .select("id, internal_code, name, type, description, price_list, image_url, doc_url, active, category:category_id(id, name)")
            .single();

          insertedProduct = legacyInsertResult.data as typeof insertedProduct;
          insertError = legacyInsertResult.error;

          if (!legacyInsertResult.error && entry.csvRow.tipo) {
            const tipoUpdateResult = await supabase
              .from("SellProduct")
              .update({
                tipo: entry.csvRow.tipo,
                product_type: entry.csvRow.tipo,
                subcategory: entry.csvRow.subcategory || "",
              })
              .eq("id", legacyInsertResult.data.id)
              .eq("site_id", siteId);

            if (tipoUpdateResult.error && !isMissingColumnError(tipoUpdateResult.error)) {
              throw new Error(
                tipoUpdateResult.error.message ||
                  `Impossibile salvare il tipo per il prodotto ${legacyInsertResult.data.id}`,
              );
            }
          }
        }

        if (insertError || !insertedProduct) {
          throw new Error(insertError?.message || "Impossibile creare il nuovo prodotto");
        }

        const finalCode =
          !desiredCode || codeConflict
            ? formatSellProductCode(entry.csvRow.category_name, insertedProduct.id)
            : desiredCode;
        const { error: codeUpdateError } = await supabase
          .from("SellProduct")
          .update({ internal_code: finalCode })
          .eq("id", insertedProduct.id)
          .eq("site_id", siteId);

        if (codeUpdateError) {
          throw new Error(
            codeUpdateError.message ||
              `Impossibile assegnare il codice al nuovo prodotto ${insertedProduct.id}`,
          );
        }

        const { data: insertedWithCode, error: codeError } = await fetchImportedProduct(
          supabase,
          siteId,
          insertedProduct.id,
        );

        if (codeError || !insertedWithCode) {
          throw new Error(
            codeError?.message || `Impossibile assegnare il codice al nuovo prodotto ${insertedProduct.id}`,
          );
        }

        if (codeConflict) {
          entry.reason = entry.reason
            ? `${entry.reason}. COD_INT assegnato: ${finalCode}`
            : `COD_INT ${desiredCode} gia usato dal prodotto ${codeConflict.id}. Assegnato automaticamente ${finalCode}`;
        }

        entry.targetId = insertedWithCode.id;
        result.imported += 1;
        mutableProducts.set(insertedWithCode.id, insertedWithCode as SellProductImportExistingRecord);
      } catch (error) {
        log.error("Errore applicazione riga import prodotti", {
          siteId,
          mode,
          categoryFilter,
          rowNumber: entry.rowNumber,
          targetId: entry.targetId,
          csvRow: entry.csvRow,
          error,
        });
        entry.action = "error";
        entry.reason =
          error instanceof Error ? error.message : "Errore durante l'applicazione";
        result.errors.push(`Riga ${entry.rowNumber}: ${entry.reason}`);
      }
    }

    await supabase.from("Action").insert({
      type: "sell_product_csv_import",
      user_id: userContext.user.id,
      data: {
        categoryFilter,
        imported: result.imported,
        updated: result.updated,
        deactivated: result.deactivated,
        skipped: result.skipped,
        errors: result.errors.length,
      },
    });

    log.info("Import prodotti completato", {
      siteId,
      mode,
      categoryFilter,
      totalRows: result.totalRows,
      imported: result.imported,
      updated: result.updated,
      deactivated: result.deactivated,
      skipped: result.skipped,
      errors: result.errors.length,
    });

    result.success = result.errors.length === 0;
    return NextResponse.json(result);
  } catch (error) {
    log.error("Errore fatale import prodotti", error);
    return NextResponse.json(
      {
        error: `Errore durante l'importazione: ${
          error instanceof Error ? error.message : "Errore sconosciuto"
        }`,
      },
      { status: 500 },
    );
  }
}
