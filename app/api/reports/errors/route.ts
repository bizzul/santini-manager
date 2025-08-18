import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

function filterErrorsTimeRange(errors: any[], from: Date, to: Date) {
  return errors.filter(
    (item: any) => item.updated_at >= from && item.updated_at <= to,
  );
}

export const POST = async (req: NextRequest) => {
  const inputData = await req.json();
  const from = new Date(inputData.data.value.from);
  const to = new Date(inputData.data.value.to);
  const supplierId = inputData.data.supplier;

  try {
    const supabase = await createClient();

    // Get error tracking data with related information
    const { data: errorData, error: errorError } = await supabase
      .from("errortracking")
      .select(`
        *,
        suppliers:supplier_id(name),
        users:user_id(family_name),
        tasks:task_id(unique_code),
        files(url)
      `);

    if (errorError) throw errorError;

    let supplier: any = null;
    if (supplierId) {
      const { data: supplierData, error: supplierError } = await supabase
        .from("suppliers")
        .select("*")
        .eq("id", Number(supplierId))
        .single();

      if (supplierError) throw supplierError;
      supplier = supplierData;
    }

    let filterData: any[] = [];

    if (supplier && supplierId) {
      // Filter by supplier name
      filterData = errorData.filter(
        (error: any) => error.supplier_id === supplier.id,
      );

      // Further filter by time range if 'from' and 'to' are provided
      if (from && to) {
        filterData = filterErrorsTimeRange(filterData, from, to);
      }
    } else if (from && to) {
      // Filter only by time range if 'supplier' is not provided
      filterData = filterErrorsTimeRange(errorData, from, to);
    } else {
      // If neither 'supplier' nor time range is provided, use original data
      filterData = errorData;
    }

    const date = new Date();
    const fileName = `Rapporto_errori_al_${date.getFullYear()}-${
      date.getMonth() + 1
    }-${date.getDate()}`;

    const fileExtension = ".xlsx";

    const workbook = XLSX.utils.book_new();

    //Add inventories to the worksheet
    const taskDataSubset = filterData.map((item: any) => {
      const created = new Date(item.created_at);
      // Concatenating all file URLs into a single string, separated by line breaks.
      const imageLinks = item.files?.map((file: any) => file.url).join(" ") ||
        "";
      return {
        "Data Creazione": created.toLocaleString(),
        Numero: item.tasks?.unique_code,
        Utente: item.users?.family_name,
        Categoria: item.error_category,
        Fornitore: item.error_category === "fornitore"
          ? item.suppliers?.name
          : "",
        Tipo: item.error_type,
        Descrizione: item.description,
        Prodotto: item.sellProduct ? item.sellProduct.name : "Nessun prodotto",
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
    //@ts-ignore
    return new Response(stream, {
      status: 200,
      headers: headers,
    });
  } catch (err: any) {
    return NextResponse.json(err.message);
  }
};
