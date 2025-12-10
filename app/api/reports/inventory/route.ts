import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import ExcelJS from "exceljs";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const filterInventories = (categoryId: number, data: any) => {
  return data
    .filter((item: any) => item.product_categories?.id === categoryId)
    .sort((a: any, b: any) =>
      a.product_categories?.name.localeCompare(b.product_categories?.name)
    );
};

const getCategoryTotalValue = (categoryInventories: any) => {
  return categoryInventories
    .reduce((total: any, item: any) => total + item.total_price, 0)
    .toFixed(2);
};

export const GET = async () => {
  try {
    const supabase = await createClient();

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select(`
        *,
        product_categories:product_category_id(*),
        suppliers:supplier_id(*)
      `);

    if (productsError) throw productsError;

    const { data: categories, error: categoriesError } = await supabase
      .from("product_categories")
      .select("*");

    if (categoriesError) throw categoriesError;

    const categoryValues = categories.map((category) => ({
      name: category.name,
      value: getCategoryTotalValue(filterInventories(category.id, products)),
    }));

    // Group inventories by category name
    let groupedInventories: { [key: string]: any[] } = {};

    products.forEach((inventory: any) => {
      logger.debug("inventory Item", inventory);
      const categoryName =
        //@ts-ignore
        inventory.product_categories?.name || "Nessuna Categoria";
      if (!groupedInventories[categoryName]) {
        groupedInventories[categoryName] = [];
      }
      groupedInventories[categoryName].push(inventory);
    });

    // Sort inventories by category name and convert to a flat array
    const sortedInventories = Object.entries(groupedInventories)
      .sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([_, inventories]) => inventories);

    const date = new Date();
    const fileName = `Rapporto_inventario_al_${date.getFullYear()}-${
      date.getMonth() + 1
    }-${date.getDate()}.xlsx`;

    const workbook = new ExcelJS.Workbook();

    // Create inventory worksheet
    const inventoryWorksheet = workbook.addWorksheet("Inventario");
    inventoryWorksheet.columns = [
      { header: "Nome", key: "Nome", width: 25 },
      { header: "Categoria", key: "Categoria", width: 20 },
      { header: "Desc no.", key: "Desc no.", width: 15 },
      { header: "Fornitore", key: "Fornitore", width: 20 },
      { header: "Altezza", key: "Altezza", width: 10 },
      { header: "Lunghezza", key: "Lunghezza", width: 12 },
      { header: "Profondita", key: "Profondita", width: 12 },
      { header: "Quantita", key: "Quantita", width: 10 },
      { header: "Prezzo", key: "Prezzo", width: 12 },
      { header: "Prezzo Totale", key: "Prezzo Totale", width: 15 },
    ];

    // Add inventory data
    const inventoryDataSubset = sortedInventories.map((item: any) => {
      return {
        Nome: item.name,
        Categoria: item.product_categories?.name,
        "Desc no.": item.description,
        Fornitore: item.suppliers?.short_name
          ? item.suppliers?.short_name
          : item.suppliers?.name,
        Altezza: item.height,
        Lunghezza: item.length,
        Profondita: item.width,
        Quantita: item.quantity,
        Prezzo: item.unit_price,
        "Prezzo Totale": item.total_price,
      };
    });

    inventoryWorksheet.addRows(inventoryDataSubset);

    // Create category values worksheet
    const categoryValueWorksheet = workbook.addWorksheet("Totale per Categoria");
    categoryValueWorksheet.columns = [
      { header: "Categoria", key: "name", width: 25 },
      { header: "Valore Totale", key: "value", width: 20 },
    ];
    categoryValueWorksheet.addRows(categoryValues);

    // Set headers to indicate a file download
    const headers = new Headers();
    headers.append(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    headers.append(
      "Content-Disposition",
      `attachment; filename="${fileName}"`,
    );

    // Convert workbook to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: headers,
    });
  } catch (err: any) {
    return NextResponse.json(err.message);
  }
};
