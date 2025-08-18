import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import * as XLSX from "xlsx";

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
      [category.name]: getCategoryTotalValue(
        filterInventories(category.id, products),
      ),
    }));

    // Group inventories by category name
    let groupedInventories: { [key: string]: any[] } = {};

    products.forEach((inventory: any) => {
      console.log("inventory Item", inventory);
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

    //Add inventories to the worksheet
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

    const date = new Date();
    const fileName = `Rapporto_inventario_al_${date.getFullYear()}-${
      date.getMonth() + 1
    }-${date.getDate()}`;
    const fileExtension = ".xlsx";

    const workbook = XLSX.utils.book_new();
    const inventoryWorksheet = XLSX.utils.json_to_sheet(inventoryDataSubset);
    XLSX.utils.book_append_sheet(workbook, inventoryWorksheet, "Inventario");
    //Add the sum of the category values to the worksheet
    const categoryValueWorksheet = XLSX.utils.json_to_sheet(categoryValues);
    XLSX.utils.book_append_sheet(
      workbook,
      categoryValueWorksheet,
      "Totale per Categoria",
    );

    // Set headers to indicate a file download
    const headers = new Headers();
    headers.append(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheet.sheet",
    );
    headers.append(
      "Content-Disposition",
      `attachment; filename="${fileName}${fileExtension}"`,
    );

    // Convert workbook to binary to send in response
    const buf = await XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheet.sheet",
    });
    const stream = blob.stream();
    console.log("stream", stream);
    //@ts-ignore
    return new Response(stream, {
      status: 200,
      headers: headers,
    });
  } catch (err: any) {
    return NextResponse.json(err.message);
  }
};
