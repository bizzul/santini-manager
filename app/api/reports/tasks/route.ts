import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../prisma-global";
import * as XLSX from "xlsx";
import { Task } from "@prisma/client";
import { calculateCurrentValue } from "../../../../package/utils/various/calculateCurrentValue";

export const dynamic = "force-dynamic";
function filterOpenProjects(tasks: Task[]) {
  return tasks.filter((task: Task) => {
    return (
      !task.archived &&
      task.unique_code !== "9999" &&
      //@ts-ignore
      task.column.identifier !== "SPEDITO"
    );
  });
}

export const GET = async () => {
  try {
    const date = new Date();

    const tasks = await prisma.task.findMany({
      include: { client: true, sellProduct: true, column: true, kanban: true },
    });

    const filteredTasks = filterOpenProjects(tasks);

    const fileName = `Rapporto_inventario_al_${date.getFullYear()}-${
      date.getMonth() + 1
    }-${date.getDate()}`;
    const fileExtension = ".xlsx";

    const workbook = XLSX.utils.book_new();

    //Add inventories to the worksheet
    const taskDataSubset = filteredTasks.map((item: Task) => {
      const created = new Date(item.created_at);
      const delivery = item.deliveryDate && new Date(item.deliveryDate);
      return {
        Numero: item.unique_code,
        //@ts-ignore
        Cliente: item.client?.businessName || "",
        //@ts-ignore
        Prodotto: item.sellProduct ? item.sellProduct.name : "Nessun prodotto",
        //@ts-ignore
        Fase: item.column ? item.column?.title : "Nessuna fase",
        "Data Creazione": created.toLocaleString(),
        "Data consegna prevista": delivery
          ? delivery.toLocaleString()
          : "NON ASSEGNATA",
        Percentuale: item.percentStatus,
        // Materiale: item.material ? "Si" : "No",
        Ferramenta: item.ferramenta ? "Si" : "No",
        Metalli: item.metalli ? "Si" : "No",
        Altro: item.other,
        Posizioni: item.positions.join(", "),
        "Prezzo di vendita": item.sellPrice,
        Valore: item.sellPrice
          ? //@ts-ignore
            calculateCurrentValue(item, item.column?.position)
          : 0,
      };
    });

    // Create a summary object
    const summary = {
      "Numero totale di progetti aperti": taskDataSubset.length,
      "Valore in produzione": taskDataSubset.reduce(
        (acc: number, task: any) => acc + task["Prezzo di vendita"],
        0
      ),
    };

    // Create worksheets from the task data and the summary
    const taskWorksheet = XLSX.utils.json_to_sheet(taskDataSubset);
    const summaryWorksheet = XLSX.utils.json_to_sheet([summary]);

    // Append the worksheets to the workbook
    XLSX.utils.book_append_sheet(workbook, taskWorksheet, "Progetti aperti");
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
    if (buf) {
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheet.sheet",
      });
      const stream = blob.stream();

      //@ts-ignore
      return new Response(stream, {
        status: 200,
        headers: headers,
      });
    }
  } catch (err: any) {
    console.log("errore", err);
    return NextResponse.json(err.message);
  }
};
