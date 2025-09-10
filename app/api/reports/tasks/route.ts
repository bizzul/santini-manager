import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import * as XLSX from "xlsx";
import { calculateCurrentValue } from "../../../../package/utils/various/calculateCurrentValue";

export const dynamic = "force-dynamic";

function filterOpenProjects(tasks: any[]) {
  return tasks.filter((task: any) => {
    return (
      !task.archived &&
      task.unique_code !== "9999" &&
      //@ts-ignore
      task.kanban_columns?.identifier !== "SPEDITO"
    );
  });
}

export const GET = async () => {
  try {
    const supabase = await createClient();
    const date = new Date();

    const { data: tasks, error: tasksError } = await supabase
      .from("Task")
      .select(`
        *,
        clients:clientId(*),
        sell_products:sellProductId(*),
        kanban_columns:kanbanColumnId(*),
        kanbans:kanbanId(*)
      `);

    if (tasksError) throw tasksError;

    const filteredTasks = filterOpenProjects(tasks);

    const fileName = `Rapporto_inventario_al_${date.getFullYear()}-${
      date.getMonth() + 1
    }-${date.getDate()}`;
    const fileExtension = ".xlsx";

    const workbook = XLSX.utils.book_new();

    //Add inventories to the worksheet
    const taskDataSubset = filteredTasks.map((item: any) => {
      const created = new Date(item.created_at);
      const delivery = item.delivery_date && new Date(item.delivery_date);
      return {
        Numero: item.unique_code,
        //@ts-ignore
        Cliente: item.clients?.business_name || "",
        //@ts-ignore
        Prodotto: item.sell_products
          ? item.sell_products.name
          : "Nessun prodotto",
        //@ts-ignore
        Fase: item.kanban_columns ? item.kanban_columns?.title : "Nessuna fase",
        "Data Creazione": created.toLocaleString(),
        "Data consegna prevista": delivery
          ? delivery.toLocaleString()
          : "NON ASSEGNATA",
        Percentuale: item.percent_status,
        // Materiale: item.material ? "Si" : "No",
        Ferramenta: item.ferramenta ? "Si" : "No",
        Metalli: item.metalli ? "Si" : "No",
        Altro: item.other,
        Posizioni: item.positions?.join(", ") || "",
        "Prezzo di vendita": item.sell_price,
        Valore: item.sell_price
          //@ts-ignore
          ? calculateCurrentValue(item, item.kanban_columns?.position)
          : 0,
      };
    });

    // Create a summary object
    const summary = {
      "Numero totale di progetti aperti": taskDataSubset.length,
      "Valore in produzione": taskDataSubset.reduce(
        (acc: number, task: any) => acc + task["Prezzo di vendita"],
        0,
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
