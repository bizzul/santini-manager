import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import ExcelJS from "exceljs";
import {
  addWorkbookReportHeader,
  setWorkbookDefaults,
  styleWorkbookTable,
} from "@/lib/workbook-report-branding";

export const dynamic = "force-dynamic";

function filterErrorsTimeRange(errors: any[], from: Date, to: Date) {
  return errors.filter(
    (item: any) => item.updated_at >= from && item.updated_at <= to,
  );
}

function formatDateForFilename(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function sanitizeFilenamePart(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]+/g, "")
    .replace(/-+/g, "-");
}

export const POST = async (req: NextRequest) => {
  const inputData = await req.json();
  const from = new Date(inputData.data.value.from);
  const to = new Date(inputData.data.value.to);
  const rawSupplierId = inputData.data.supplier;
  const supplierId =
    rawSupplierId && rawSupplierId !== "all" ? Number(rawSupplierId) : null;

  try {
    const supabase = await createClient();

    // Get error tracking data with related information
    const { data: errorData, error: errorError } = await supabase
      .from("Errortracking")
      .select(`
        *,
        suppliers:supplier_id(name),
        users:employee_id(family_name),
        tasks:task_id(unique_code),
        files(url)
      `);

    if (errorError) throw errorError;

    let supplier: any = null;
    if (supplierId) {
      const { data: supplierData, error: supplierError } = await supabase
        .from("suppliers")
        .select("*")
        .eq("id", supplierId)
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
    const fileName = `Report_errori_dal_${formatDateForFilename(from)}_al_${formatDateForFilename(to)}${
      supplier?.name ? `_${sanitizeFilenamePart(supplier.name)}` : ""
    }.xlsx`;

    const workbook = new ExcelJS.Workbook();
    setWorkbookDefaults(workbook, "Report errori");

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
    addWorkbookReportHeader(taskWorksheet, {
      title: "Report errori",
      subtitle: "Elenco anomalie filtrate per periodo e fornitore",
      metaLines: [
        supplier?.name ? `Fornitore: ${supplier.name}` : "Fornitore: tutti",
      ],
      generatedAt: date,
    });
    styleWorkbookTable(taskWorksheet, { headerRowNumber: 5 });

    // Create summary worksheet
    const summaryWorksheet = workbook.addWorksheet("Riepilogo");
    summaryWorksheet.columns = [
      { header: "Numero totale di errori", key: "totale", width: 30 },
    ];
    summaryWorksheet.addRow({
      totale: taskDataSubset.length,
    });
    addWorkbookReportHeader(summaryWorksheet, {
      title: "Riepilogo errori",
      subtitle: "Conteggio complessivo del report esportato",
      generatedAt: date,
    });
    styleWorkbookTable(summaryWorksheet, { headerRowNumber: 5 });

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
