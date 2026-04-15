import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import ExcelJS from "exceljs";
import { DateManager } from "../../../../package/utils/dates/date-manager";
import { logger } from "@/lib/logger";
import {
  addWorkbookReportHeader,
  setWorkbookDefaults,
  styleWorkbookTable,
} from "@/lib/workbook-report-branding";

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

    const date = new Date();
    const fileName =
      `Report_imballaggio_qc_al_${date.getFullYear()}-${String(
        date.getMonth() + 1,
      ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}.xlsx`;

    const workbook = new ExcelJS.Workbook();
    setWorkbookDefaults(workbook, "Report imballaggio e quality control");

    // Build QC Excel data
    const buildQcWorksheet = (data: any) => {
      // Sort the data by date in descending order
      data.sort(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: legacy typing constraint
        (a: any, b: any) => new Date(b.created_at) - new Date(a.created_at),
      );

      // Create a set of unique item names
      const uniqueItemNames: string[] = Array.from(
        new Set(
          data.flatMap((item: any) =>
            item.qc_items.map((subItem: any) => subItem.name)
          )
        )
      );

      const worksheet = workbook.addWorksheet("Quality Control");

      // Define columns dynamically
      const columns = [
        { header: "Data", key: "Data", width: 15 },
        { header: "Progetto", key: "Progetto", width: 15 },
        { header: "Utente", key: "Utente", width: 15 },
        { header: "Terminato?", key: "Terminato", width: 12 },
        ...uniqueItemNames.map((name) => ({ header: name, key: name, width: 12 })),
      ];
      worksheet.columns = columns;

      // Add data rows
      data.forEach((item: any) => {
        const rowData: any = {
          Data: DateManager.formatEUDate(item.created_at),
          Progetto: item.tasks?.unique_code,
          Utente: item.users?.family_name,
          Terminato: item.passed === "DONE" ? "SI" : "NO",
        };

        // For each item, mark it with "X" if checked, or leave it blank
        uniqueItemNames.forEach((itemName: string) => {
          const checked = item.qc_items.find(
            (subItem: any) => subItem.name === itemName
          )?.checked;
          rowData[itemName] = checked ? "X" : "";
        });

        worksheet.addRow(rowData);
      });

      addWorkbookReportHeader(worksheet, {
        title: "Report quality control",
        subtitle: "Storico controlli qualita",
        generatedAt: date,
      });
      styleWorkbookTable(worksheet, { headerRowNumber: 5 });

      return worksheet;
    };

    // Build Imballaggio Excel data
    const buildImbWorksheet = (data: any) => {
      // Sort the data by date in descending order
      data.sort(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: legacy typing constraint
        (a: any, b: any) => new Date(b.created_at) - new Date(a.created_at),
      );

      // Create a set of unique item names
      const uniqueItemNames: string[] = Array.from(
        new Set(
          data.flatMap((item: any) =>
            item.packing_items.map((subItem: any) => subItem.name)
          )
        )
      );

      const worksheet = workbook.addWorksheet("Imballaggio");

      // Define columns dynamically
      const columns = [
        { header: "Data", key: "Data", width: 15 },
        { header: "Progetto", key: "Progetto", width: 15 },
        { header: "Utente", key: "Utente", width: 15 },
        { header: "Terminato?", key: "Terminato", width: 12 },
        ...uniqueItemNames.map((name) => ({ header: name, key: name, width: 12 })),
      ];
      worksheet.columns = columns;

      // Add data rows
      data.forEach((item: any) => {
        const rowData: any = {
          Data: DateManager.formatEUDate(item.created_at),
          Progetto: item.tasks?.unique_code,
          Utente: item.users?.family_name,
          Terminato: item.passed === "DONE" ? "SI" : "NO",
        };

        // For each item, add the number value
        uniqueItemNames.forEach((itemName: string) => {
          const number = item.packing_items.find(
            (subItem: any) => subItem.name === itemName
          )?.number;
          rowData[itemName] = number || "";
        });

        worksheet.addRow(rowData);
      });

      addWorkbookReportHeader(worksheet, {
        title: "Report imballaggio",
        subtitle: "Storico controlli imballaggio",
        generatedAt: date,
      });
      styleWorkbookTable(worksheet, { headerRowNumber: 5 });

      return worksheet;
    };

    buildQcWorksheet(qc);
    buildImbWorksheet(imballaggio);

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
    logger.error(err);
    return NextResponse.json(err.message);
  }
};
