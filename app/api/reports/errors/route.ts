import { Errortracking, Supplier } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../prisma-global";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

function filterErrorsTimeRange(errors: Errortracking[], from: Date, to: Date) {
  return errors.filter(
    (item: Errortracking) => item.updated_at >= from && item.updated_at <= to
  );
}

export const POST = async (req: NextRequest) => {
  const inputData = await req.json();
  const from = new Date(inputData.data.value.from);
  const to = new Date(inputData.data.value.to);
  const supplierId = inputData.data.supplier;

  try {
    const data = await prisma.errortracking.findMany({
      include: { supplier: true, user: true, task: true, files: true },
    });
    let supplier: Supplier | null = null;
    if (supplierId) {
      supplier = await prisma.supplier.findUnique({
        where: { id: Number(supplierId) },
      });
    }

    let filterData: Errortracking[] = [];

    if (supplier && supplierId) {
      // Filter by supplier name
      filterData = data.filter(
        //@ts-ignore
        (error: Errortracking) => error.supplier_id === supplier.id
      );

      // Further filter by time range if 'from' and 'to' are provided
      if (from && to) {
        filterData = filterErrorsTimeRange(filterData, from, to);
      }
    } else if (from && to) {
      // Filter only by time range if 'supplier' is not provided
      filterData = filterErrorsTimeRange(data, from, to);
    } else {
      // If neither 'supplier' nor time range is provided, use original data
      filterData = data;
    }

    const date = new Date();
    const fileName = `Rapporto_errori_al_${date.getFullYear()}-${
      date.getMonth() + 1
    }-${date.getDate()}`;

    const fileExtension = ".xlsx";

    const workbook = XLSX.utils.book_new();

    //Add inventories to the worksheet
    const taskDataSubset = filterData.map((item: Errortracking) => {
      const created = new Date(item.created_at);
      // Concatenating all file URLs into a single string, separated by line breaks.
      //@ts-ignore
      const imageLinks = item.files.map((file: any) => file.url).join(" ");
      return {
        "Data Creazione": created.toLocaleString(),
        //@ts-ignore
        Numero: item.task?.unique_code,
        //@ts-ignore
        Utente: item.user?.family_name,
        Categoria: item.error_category,
        Fornitore:
          //@ts-ignore
          item.error_category === "fornitore" ? item.supplier?.name : "",
        Tipo: item.error_type,
        Descrizione: item.description,
        //@ts-ignore
        Prodotto: item.sellProduct ? item.sellProduct.name : "Nessun prodotto",
        //@ts-ignore
        Immagini: imageLinks,
      };
    });

    // Create a summary object
    const summary = {
      "Numero totale di errori": taskDataSubset.length,
      // "Valore in produzione": taskDataSubset.reduce(
      //   (acc: number, task: any) => acc + task["Prezzo di vendita"],
      //   0
      // ),
    };

    // Create worksheets from the task data and the summary
    const taskWorksheet = XLSX.utils.json_to_sheet(taskDataSubset);
    const summaryWorksheet = XLSX.utils.json_to_sheet([summary]);

    // Append the worksheets to the workbook
    XLSX.utils.book_append_sheet(workbook, taskWorksheet, "Errori");
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Riepilogo");

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
    //@ts-ignore
    return new Response(stream, {
      status: 200,
      headers: headers,
    });
  } catch (err: any) {
    return NextResponse.json(err.message);
  }
};
