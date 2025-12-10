import { DateManager } from "../../../../package/utils/dates/date-manager";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import ExcelJS from "exceljs";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

function filterTimetrackings(
  timeTrackingsData: any[],
  userId: string,
  from: Date,
  to: Date,
) {
  return timeTrackingsData.filter(
    (item: any) =>
      //@ts-ignore
      item.users?.id === userId &&
      item.created_at >= from &&
      item.created_at <= to,
  );
}

function getTotalHours(timetrackings: any[]) {
  const total = timetrackings.reduce((acc, cur) => {
    return acc + Number(cur.total_time);
  }, 0);

  return Number(total.toFixed(2));
}

function getUserTasks(timetrackings: any[]) {
  const taskMap = new Map();
  timetrackings.forEach((item) => {
    const taskId = item.task_id;

    if (taskId) {
      const task = {
        date: item.updated_at,
        description: item.description,
        //@ts-ignore
        projectCode: item.tasks?.unique_code
          //@ts-ignore
          ? item.tasks?.unique_code
          : "nessun codice",
        hours: item.hours,
        minutes: item.minutes,
        totalTime: item.total_time,
      };

      // If taskId already exists in the map, push the task into the array
      // Otherwise, create a new array with the task as the first element
      const tasks = taskMap.get(taskId);
      if (tasks) {
        tasks.push(task);
      } else {
        taskMap.set(taskId, [task]);
      }
    }
  });

  // Flatten the array of tasks for each taskId into a single array
  const taskArray = Array.from(taskMap.values()).flat();

  const totalHoursPerDay = new Map();
  taskArray.forEach((task) => {
    const currentHours = totalHoursPerDay.get(task.date) || 0;
    totalHoursPerDay.set(task.date, currentHours + task.totalTime);
  });

  return { tasks: taskArray, totalHoursPerDay };
}

function formatDate(date: Date) {
  const d = new Date(date);
  const day = ("0" + d.getDate()).slice(-2);
  const month = ("0" + (d.getMonth() + 1)).slice(-2);
  const year = d.getFullYear();
  return day + "-" + month + "-" + year;
}

function prepareTimetrackingsData(
  timeTrackingsData: any[],
  from: any,
  to: any,
) {
  const filteredData = timeTrackingsData.filter(
    (item: any) => item.created_at >= from && item.created_at <= to,
  );

  // Sort timetrackings by created_at date
  const sortedTimetrackings = filteredData.sort(
    (a: any, b: any) =>
      //@ts-ignore
      new Date(a.created_at) - new Date(b.created_at),
  );
  // Prepare data for the Excel sheet
  const data = sortedTimetrackings.map((tracking: any) => {
    // Check if there are roles and take the first role's name, if available
    const roleName = tracking.roles && tracking.roles.length > 0
      ? tracking.roles[0].name
      : "No Ruolo";
    const totalTime = (tracking.hours + tracking.minutes / 60).toFixed(2);

    return {
      Data: formatDate(tracking.created_at),
      "Nome Cognome": tracking.users?.given_name + " " + tracking.users?.family_name,
      Reparto: roleName,
      Ore: tracking.hours,
      Minuti: tracking.minutes,
      Totale: Number(totalTime),
      "Codice Progetto": tracking.tasks?.unique_code
        ? tracking.tasks.unique_code
        : "Nessun codice",
    };
  });

  return data;
}

export const POST = async (req: NextRequest) => {
  const dateRange = await req.json();
  const from = new Date(dateRange.data.from);
  const to = new Date(dateRange.data.to);

  logger.debug("range", from, to);

  try {
    const supabase = await createClient();

    const { data: timeTrackingsData, error: timeTrackingError } = await supabase
      .from("timetracking")
      .select(`
        *,
        tasks:task_id(*),
        users:user_id(*),
        roles:role_id(*)
      `);

    if (timeTrackingError) throw timeTrackingError;

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select(`
        *,
        tasks:task_id(*),
        timetracking:user_id(*)
      `);

    if (userError) throw userError;

    // filter out disabled users
    const userEnabled = userData.filter((user: any) => user.enabled);

    const newData = userEnabled.map((user: any) => {
      const userTimetrackings = filterTimetrackings(
        timeTrackingsData,
        user.id,
        from,
        to,
      );

      const userTotalHours = getTotalHours(userTimetrackings);

      const userTasks = getUserTasks(userTimetrackings);
      return {
        user: user.family_name,
        tasks: userTasks.tasks,
        dailyTotal: userTasks.totalHoursPerDay,
        total: userTotalHours,
      };
    });

    const projectData = new Map(); // Holds data organized by project

    timeTrackingsData.forEach((tracking) => {
      const projectName = tracking.tasks?.unique_code
        ? tracking.tasks?.unique_code
        : "No Code";
      const employeeName = tracking.users?.given_name;
      const roles = tracking.roles || []; // Assuming roles is an array
      roles.forEach((role: any) => {
        const projectEntry = projectData.get(projectName) || new Map();
        projectData.set(projectName, projectEntry);

        const roleDescription = role.name; // Assuming each role has a 'name' property
        const employeeRoleKey = `${employeeName}-${roleDescription}`;

        const employeeRoleEntry = projectEntry.get(employeeRoleKey) || {
          employeeName,
          role: roleDescription,
          totalHours: 0,
        };

        employeeRoleEntry.totalHours += tracking.total_time; // Assuming total_time is a number
        projectEntry.set(employeeRoleKey, employeeRoleEntry);
      });
    });

    const fileName = `Report_ore_dal_${from.getFullYear()}-${
      (
        "0" +
        (from.getMonth() + 1)
      ).slice(-2)
    }-${("0" + from.getDate()).slice(-2)}_al_${to.getFullYear()}-${
      (
        "0" +
        (to.getMonth() + 1)
      ).slice(-2)
    }-${("0" + to.getDate()).slice(-2)}.xlsx`;

    const workbook = new ExcelJS.Workbook();

    // Create summary sheet with all timetrackings
    const allTimetrackingsData = prepareTimetrackingsData(
      timeTrackingsData,
      from,
      to,
    );

    const allTimetrackingsSheet = workbook.addWorksheet("A_Riassunto");
    allTimetrackingsSheet.columns = [
      { header: "Data", key: "Data", width: 12 },
      { header: "Nome Cognome", key: "Nome Cognome", width: 20 },
      { header: "Reparto", key: "Reparto", width: 15 },
      { header: "Ore", key: "Ore", width: 8 },
      { header: "Minuti", key: "Minuti", width: 10 },
      { header: "Totale", key: "Totale", width: 10 },
      { header: "Codice Progetto", key: "Codice Progetto", width: 18 },
    ];
    allTimetrackingsSheet.addRows(allTimetrackingsData);

    // Create individual user sheets
    newData.forEach((item: any) => {
      // Summary sheet for each user
      const summarySheet = workbook.addWorksheet(`${item.user} Sommario`);
      summarySheet.columns = [
        { header: "Data creazione", key: "Data creazione", width: 15 },
        { header: "Codice Progetto", key: "Codice Progetto", width: 18 },
        { header: "Note", key: "Note", width: 25 },
        { header: "Ore", key: "Ore", width: 8 },
        { header: "Minuti", key: "Minuti", width: 10 },
        { header: "Tempo totale", key: "Tempo totale", width: 15 },
      ];

      item.tasks.forEach((task: any) => {
        summarySheet.addRow({
          "Data creazione": formatDate(task.date),
          "Codice Progetto": task.projectCode ? task.projectCode : "Nessun Codice",
          Note: task.description,
          Ore: Number(task.hours),
          Minuti: Number(task.minutes),
          "Tempo totale": Number(task.totalTime.toFixed(2)),
        });
      });

      // Add total row
      summarySheet.addRow({
        "Data creazione": "Totale",
        "Codice Progetto": "",
        Note: "",
        Ore: "",
        Minuti: "",
        "Tempo totale": item.total,
      });

      // Daily total sheet for each user
      const totalHoursSheet = workbook.addWorksheet(`${item.user} Giorn.`);
      totalHoursSheet.columns = [
        { header: "Data", key: "Data", width: 15 },
        { header: "Totale ore giornaliero", key: "Totale", width: 25 },
      ];

      Array.from(item.dailyTotal.entries()).forEach(([date, hours]: any) => {
        totalHoursSheet.addRow({
          Data: formatDate(date),
          Totale: Number(hours.toFixed(2)),
        });
      });
    });

    // Create project summary sheet
    const projectSheet = workbook.addWorksheet("Z. Sommario progetti");
    projectSheet.columns = [
      { header: "Progetto/Dipendente", key: "col1", width: 20 },
      { header: "Ruolo", key: "col2", width: 15 },
      { header: "Ore", key: "col3", width: 12 },
    ];

    projectData.forEach((employeeRoles, projectName) => {
      let projectTotalHours = 0;

      // Add project name as a header row
      projectSheet.addRow({ col1: projectName, col2: "", col3: "" });

      // Add each unique employee-role entry
      employeeRoles.forEach((details: any) => {
        projectTotalHours += details.totalHours;

        projectSheet.addRow({
          col1: details.employeeName,
          col2: details.role,
          col3: details.totalHours,
        });
      });

      // Add total hours row for the project
      projectSheet.addRow({
        col1: "Totale Ore",
        col2: "",
        col3: projectTotalHours,
      });

      // Add an empty row after each project for readability
      projectSheet.addRow({ col1: "", col2: "", col3: "" });
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
    console.error("Error generating Excel file:", err);
    return NextResponse.json(err.message);
  }
};
