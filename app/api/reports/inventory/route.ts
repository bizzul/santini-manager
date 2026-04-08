import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import {
  addWorkbookReportHeader,
  setWorkbookDefaults,
  styleWorkbookTable,
} from "@/lib/workbook-report-branding";
import { getSiteContext, hasSiteId } from "@/lib/site-context";
import { createServiceClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type InventoryRow = {
  Nome: string;
  Categoria: string;
  Fornitore: string;
  Descrizione: string;
  "Codice Interno": string;
  "Codice Fornitore": string;
  "Numero Magazzino": string;
  Unita: string;
  Quantita: number;
  "Prezzo acquisto": number;
  "Prezzo vendita": number;
  "Valore acquisto": number;
  "Valore vendita": number;
};

function sanitizeSheetName(value: string) {
  const sanitized = value.replace(/[\\/*?:[\]]/g, " ").trim();
  return sanitized.slice(0, 31) || "Categoria";
}

function toInventoryRows(items: any[]): InventoryRow[] {
  const rows = items.flatMap((item: any) => {
    const variants = Array.isArray(item.variants) ? item.variants : [];

    if (variants.length === 0) {
      return [
        {
          Nome: item.name || "-",
          Categoria: item.category?.name || "Senza categoria",
          Fornitore: item.supplier?.name || "-",
          Descrizione: item.description || "-",
          "Codice Interno": "-",
          "Codice Fornitore": "-",
          "Numero Magazzino": "-",
          Unita: "-",
          Quantita: 0,
          "Prezzo acquisto": 0,
          "Prezzo vendita": 0,
          "Valore acquisto": 0,
          "Valore vendita": 0,
        },
      ];
    }

    return variants.map((variant: any) => {
      const quantity = Number(variant.stock_quantity || 0);
      const purchasePrice = Number(variant.purchase_unit_price || 0);
      const sellPrice = Number(variant.sell_unit_price || 0);

      return {
        Nome: item.name || "-",
        Categoria: item.category?.name || "Senza categoria",
        Fornitore: item.supplier?.name || "-",
        Descrizione: item.description || "-",
        "Codice Interno": variant.internal_code || "-",
        "Codice Fornitore": variant.supplier_code || "-",
        "Numero Magazzino": variant.warehouse_number || "-",
        Unita:
          variant.unit?.code ||
          variant.unit?.name ||
          variant.attributes?.legacy_unit ||
          "-",
        Quantita: quantity,
        "Prezzo acquisto": purchasePrice,
        "Prezzo vendita": sellPrice,
        "Valore acquisto": Number((quantity * purchasePrice).toFixed(2)),
        "Valore vendita": Number((quantity * sellPrice).toFixed(2)),
      };
    });
  });

  return rows.sort((left, right) => {
    const byCategory = left.Categoria.localeCompare(right.Categoria);
    if (byCategory !== 0) return byCategory;
    return left.Nome.localeCompare(right.Nome);
  });
}

function buildCategorySummary(rows: InventoryRow[]) {
  const categoryMap = new Map<
    string,
    { Categoria: string; Articoli: number; Quantita: number; "Valore acquisto": number; "Valore vendita": number }
  >();

  rows.forEach((row) => {
    const currentRow = categoryMap.get(row.Categoria) || {
      Categoria: row.Categoria,
      Articoli: 0,
      Quantita: 0,
      "Valore acquisto": 0,
      "Valore vendita": 0,
    };

    currentRow.Articoli += 1;
    currentRow.Quantita += Number(row.Quantita || 0);
    currentRow["Valore acquisto"] += Number(row["Valore acquisto"] || 0);
    currentRow["Valore vendita"] += Number(row["Valore vendita"] || 0);
    categoryMap.set(row.Categoria, currentRow);
  });

  return Array.from(categoryMap.values()).sort((left, right) =>
    left.Categoria.localeCompare(right.Categoria),
  );
}

async function buildInventoryReport(req: NextRequest, categoryIds: string[]) {
  const siteContext = await getSiteContext(req);
  if (!hasSiteId(siteContext)) {
    return NextResponse.json(
      { error: "Contesto sito non disponibile" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const selectedCategoryIds = categoryIds.filter(Boolean);

  let itemsQuery = supabase
    .from("inventory_items")
    .select(`
      *,
      category:inventory_categories(*),
      supplier:inventory_suppliers(*),
      variants:inventory_item_variants(
        *,
        unit:inventory_units(*)
      )
    `)
    .eq("site_id", siteContext.siteId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (selectedCategoryIds.length > 0) {
    itemsQuery = itemsQuery.in("category_id", selectedCategoryIds);
  }

  const [{ data: items, error: itemsError }, { data: stock, error: stockError }] =
    await Promise.all([
      itemsQuery,
      supabase
        .from("inventory_stock")
        .select("variant_id, quantity")
        .eq("site_id", siteContext.siteId),
    ]);

  if (itemsError || stockError) {
    return NextResponse.json(
      { error: itemsError?.message || stockError?.message || "Errore export inventario" },
      { status: 500 },
    );
  }

  const stockMap = new Map<string, number>();
  (stock || []).forEach((entry: any) => {
    const currentQuantity = stockMap.get(entry.variant_id) || 0;
    stockMap.set(entry.variant_id, currentQuantity + Number(entry.quantity || 0));
  });

  const itemsWithStock = (items || []).map((item: any) => ({
    ...item,
    variants: (item.variants || []).map((variant: any) => ({
      ...variant,
      stock_quantity: stockMap.get(variant.id) || 0,
    })),
  }));

  const inventoryRows = toInventoryRows(itemsWithStock);
  const categorySummary = buildCategorySummary(inventoryRows);
  const date = new Date();
  const workbook = new ExcelJS.Workbook();
  setWorkbookDefaults(workbook, "Report inventario");

  const summarySheet = workbook.addWorksheet("Inventario completo");
  summarySheet.columns = [
    { header: "Nome", key: "Nome", width: 28 },
    { header: "Categoria", key: "Categoria", width: 20 },
    { header: "Fornitore", key: "Fornitore", width: 22 },
    { header: "Descrizione", key: "Descrizione", width: 30 },
    { header: "Codice Interno", key: "Codice Interno", width: 18 },
    { header: "Codice Fornitore", key: "Codice Fornitore", width: 18 },
    { header: "Numero Magazzino", key: "Numero Magazzino", width: 18 },
    { header: "Unita", key: "Unita", width: 12 },
    { header: "Quantita", key: "Quantita", width: 12 },
    { header: "Prezzo acquisto", key: "Prezzo acquisto", width: 16 },
    { header: "Prezzo vendita", key: "Prezzo vendita", width: 16 },
    { header: "Valore acquisto", key: "Valore acquisto", width: 18 },
    { header: "Valore vendita", key: "Valore vendita", width: 18 },
  ];
  summarySheet.addRows(inventoryRows);
  addWorkbookReportHeader(summarySheet, {
    title: "Report inventario completo",
    subtitle: "Riepilogo generale dell'inventario per il sito corrente",
    metaLines: [
      `Categorie selezionate: ${selectedCategoryIds.length > 0 ? selectedCategoryIds.length : "tutte"}`,
      `Righe esportate: ${inventoryRows.length}`,
    ],
    generatedAt: date,
  });
  styleWorkbookTable(summarySheet, {
    headerRowNumber: 5,
    numericColumns: [
      "Quantita",
      "Prezzo acquisto",
      "Prezzo vendita",
      "Valore acquisto",
      "Valore vendita",
    ],
  });

  const categoriesSheet = workbook.addWorksheet("Riepilogo categorie");
  categoriesSheet.columns = [
    { header: "Categoria", key: "Categoria", width: 24 },
    { header: "Articoli", key: "Articoli", width: 12 },
    { header: "Quantita", key: "Quantita", width: 12 },
    { header: "Valore acquisto", key: "Valore acquisto", width: 18 },
    { header: "Valore vendita", key: "Valore vendita", width: 18 },
  ];
  categoriesSheet.addRows(categorySummary);
  addWorkbookReportHeader(categoriesSheet, {
    title: "Riepilogo categorie inventario",
    subtitle: "Totali per categoria dell'inventario esportato",
    generatedAt: date,
  });
  styleWorkbookTable(categoriesSheet, {
    headerRowNumber: 5,
    numericColumns: ["Articoli", "Quantita", "Valore acquisto", "Valore vendita"],
  });

  categorySummary.forEach((category) => {
    const categoryRows = inventoryRows.filter(
      (row) => row.Categoria === category.Categoria,
    );
    const worksheet = workbook.addWorksheet(
      sanitizeSheetName(category.Categoria),
    );
    worksheet.columns = summarySheet.columns;
    worksheet.addRows(categoryRows);
    addWorkbookReportHeader(worksheet, {
      title: `Categoria - ${category.Categoria}`,
      subtitle: "Dettaglio articoli della categoria selezionata",
      metaLines: [`Righe esportate: ${categoryRows.length}`],
      generatedAt: date,
    });
    styleWorkbookTable(worksheet, {
      headerRowNumber: 5,
      numericColumns: [
        "Quantita",
        "Prezzo acquisto",
        "Prezzo vendita",
        "Valore acquisto",
        "Valore vendita",
      ],
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `report-inventario-${date.toISOString().slice(0, 10)}.xlsx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: NextRequest) {
  return buildInventoryReport(req, []);
}

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null);
  const categoryIds = Array.isArray(payload?.categoryIds)
    ? payload.categoryIds.map((categoryId: unknown) => String(categoryId))
    : [];

  return buildInventoryReport(req, categoryIds);
}
