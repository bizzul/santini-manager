import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import ExcelJS from "exceljs";
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
    }-${date.getDate()}.xlsx`;

    const workbook = new ExcelJS.Workbook();

    // Create task worksheet
    const taskWorksheet = workbook.addWorksheet("Progetti aperti");

    // Define columns
    taskWorksheet.columns = [
      { header: "Numero", key: "Numero", width: 12 },
      { header: "Cliente", key: "Cliente", width: 25 },
      { header: "Prodotto", key: "Prodotto", width: 20 },
      { header: "Fase", key: "Fase", width: 15 },
      { header: "Data Creazione", key: "Data Creazione", width: 18 },
      { header: "Data consegna prevista", key: "Data consegna prevista", width: 22 },
      { header: "Percentuale", key: "Percentuale", width: 12 },
      { header: "Ferramenta", key: "Ferramenta", width: 12 },
      { header: "Metalli", key: "Metalli", width: 10 },
      { header: "Altro", key: "Altro", width: 15 },
      { header: "Posizioni", key: "Posizioni", width: 20 },
      { header: "Prezzo di vendita", key: "Prezzo di vendita", width: 18 },
      { header: "Valore", key: "Valore", width: 12 },
    ];

    // Add task data
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

    taskWorksheet.addRows(taskDataSubset);

    // Create summary worksheet
    const summaryWorksheet = workbook.addWorksheet("Riepilogo");
    summaryWorksheet.columns = [
      { header: "Numero totale di progetti aperti", key: "totale", width: 35 },
      { header: "Valore in produzione", key: "valore", width: 25 },
    ];
    summaryWorksheet.addRow({
      totale: taskDataSubset.length,
      valore: taskDataSubset.reduce(
        (acc: number, task: any) => acc + task["Prezzo di vendita"],
        0,
      ),
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
    console.log("errore", err);
    return NextResponse.json(err.message);
  }
};
