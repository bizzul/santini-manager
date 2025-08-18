import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import * as XLSX from "xlsx";
import { DateManager } from "../../../../package/utils/dates/date-manager";

export const dynamic = "force-dynamic";

export const GET = async () => {
  try {
    const supabase = await createClient();

    const { data: qc, error: qcError } = await supabase
      .from("quality_control")
      .select(`
        *,
        qc_items:quality_control_id(*),
        users:user_id(*),
        tasks:task_id(*)
      `);

    if (qcError) throw qcError;

    const { data: imballaggio, error: imbError } = await supabase
      .from("packing_control")
      .select(`
        *,
        packing_items:packing_control_id(*),
        users:user_id(*),
        tasks:task_id(*)
      `);

    if (imbError) throw imbError;

    const buildExcelDataImb = (data: any) => {
      // Sort the data by date in descending order
      data.sort(
        //@ts-ignore
        (a: any, b: any) => new Date(b.created_at) - new Date(a.created_at),
      );
      // Create a set of unique item names
      const uniqueItemNames: any = new Set(
        data.flatMap((item: any) =>
          item.packing_items.map((subItem: any) => subItem.name)
        ),
      );

      // Create the header row with "Date", "Project Code", "User", and item names
      const headerRow = [
        "Data",
        "Progetto",
        "Utente",
        "Terminato?",
        ...uniqueItemNames,
      ];

      // Create the Excel data array starting with the header row
      const excelData = [
        headerRow,
        ...data.map((item: any) => {
          // Extract the date, project code, and user information
          const row = [
            DateManager.formatEUDate(item.created_at),
            item.tasks?.unique_code,
            item.users?.family_name,
            item.passed === "DONE" ? "SI" : "NO",
          ];

          // For each item, mark it with "X" if checked, or leave it blank if not checked
          // For each item, add the number value
          uniqueItemNames.forEach((itemName: any) => {
            const number = item.packing_items.find(
              (subItem: any) => subItem.name === itemName,
            )?.number;
            row.push(number || ""); // Use the number value or leave it blank if undefined
          });

          return row;
        }),
      ];

      return excelData;
    };

    const buildExcelDataQc = (data: any) => {
      // Sort the data by date in descending order
      data.sort(
        //@ts-ignore
        (a: any, b: any) => new Date(b.created_at) - new Date(a.created_at),
      );
      // Create a set of unique item names
      const uniqueItemNames: any = new Set(
        data.flatMap((item: any) =>
          item.qc_items.map((subItem: any) => subItem.name)
        ),
      );

      // Create the header row with "Date", "Project Code", "User", and item names
      const headerRow = [
        "Data",
        "Progetto",
        "Utente",
        "Terminato?",
        ...uniqueItemNames,
      ];

      // Create the Excel data array starting with the header row
      const excelData = [
        headerRow,
        ...data.map((item: any) => {
          // Extract the date, project code, and user information
          const row = [
            DateManager.formatEUDate(item.created_at),
            item.tasks?.unique_code,
            item.users?.family_name,
            item.passed === "DONE" ? "SI" : "NO",
          ];

          // For each item, mark it with "X" if checked, or leave it blank if not checked
          uniqueItemNames.forEach((itemName: any) => {
            const checked = item.qc_items.find(
              (subItem: any) => subItem.name === itemName,
            )?.checked;

            row.push(checked ? "X" : "");
          });

          return row;
        }),
      ];

      return excelData;
    };

    const qcExcelData = buildExcelDataQc(qc);

    const imbExcelData = buildExcelDataImb(imballaggio);

    const date = new Date();
    const fileName =
      `Rapporto_imballaggio_qc_interno_al_${date.getFullYear()}-${
        date.getMonth() + 1
      }-${date.getDate()}`;
    const fileExtension = ".xlsx";

    const workbook = XLSX.utils.book_new();

    const qcWorksheet = XLSX.utils.aoa_to_sheet(qcExcelData);
    XLSX.utils.book_append_sheet(workbook, qcWorksheet, "Quality Control");

    const imbWorksheet = XLSX.utils.aoa_to_sheet(imbExcelData);
    XLSX.utils.book_append_sheet(workbook, imbWorksheet, "Imballaggio");

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
    console.log(err);
    return NextResponse.json(err.message);
  }
};
