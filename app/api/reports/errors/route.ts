import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import ExcelJS from "exceljs";

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
    }-${date.getDate()}.xlsx`;

    const workbook = new ExcelJS.Workbook();

    // Create errors worksheet
    const taskWorksheet = workbook.addWorksheet("Errori");
    taskWorksheet.columns = [
      { header: "Data Creazione", key: "Data Creazione", width: 20 },
      { header: "Numero", key: "Numero", width: 12 },
      { header: "Utente", key: "Utente", width: 15 },
      { header: "Categoria", key: "Categoria", width: 15 },
      { header: "Fornitore", key: "Fornitore", width: 20 },
      { header: "Tipo", key: "Tipo", width: 15 },
      { header: "Descrizione", key: "Descrizione", width: 30 },
      { header: "Prodotto", key: "Prodotto", width: 20 },
      { header: "Immagini", key: "Immagini", width: 50 },
    ];

    // Add error data
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

    taskWorksheet.addRows(taskDataSubset);

    // Create summary worksheet
    const summaryWorksheet = workbook.addWorksheet("Riepilogo");
    summaryWorksheet.columns = [
      { header: "Numero totale di errori", key: "totale", width: 30 },
    ];
    summaryWorksheet.addRow({
      totale: taskDataSubset.length,
    });

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
