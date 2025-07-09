import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../prisma-global";
import * as XLSX from "xlsx";
import { Product } from "@prisma/client";

export const dynamic = "force-dynamic";

const filterInventories = (categoryId: number, data: any) => {
  return data
    .filter((item: any) => item.product_category?.id === categoryId)
    .sort((a: any, b: any) =>
      a.product_category?.name.localeCompare(b.product_category?.name)
    );
};

const getCategoryTotalValue = (categoryInventories: any) => {
  return categoryInventories
    .reduce((total: any, item: any) => total + item.total_price, 0)
    .toFixed(2);
};

export const GET = async () => {
  try {
    const products = await prisma.product.findMany({
      include: { product_category: true, supplierInfo: true },
    });
    const categories = await prisma.product_category.findMany();

    const categoryValues = categories.map((category) => ({
      [category.name]: getCategoryTotalValue(
        filterInventories(category.id, products)
      ),
    }));

    // Group inventories by category name
    let groupedInventories: { [key: string]: any[] } = {};

    products.forEach((inventory: Product) => {
      console.log("inventory Item", inventory);
      const categoryName =
        //@ts-ignore
        inventory.product_category?.name || "Nessuna Categoria";
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
        Categoria: item.product_category?.name,
        "Desc no.": item.description,
        Fornitore: item.supplierInfo?.short_name
          ? item.supplierInfo?.short_name
          : item.supplierInfo?.name,
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
      "Totale per Categoria"
    );

    // Set headers to indicate a file download
    const headers = new Headers();
    headers.append(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheet.sheet"
    );
    headers.append(
      "Content-Disposition",
      `attachment; filename="${fileName}${fileExtension}"`
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
