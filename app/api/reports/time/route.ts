import { DateManager } from "../../../../package/utils/dates/date-manager";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import * as XLSX from "xlsx";

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

    //const totalTimeInMinutes = tracking.hours * 60 + tracking.minutes;
    // const roundedTotalTime = Math.round(totalTime * 2) / 2;
    // const totalTime = tracking.hours + tracking.minutes / 100;
    return [
      formatDate(tracking.created_at),
      tracking.users?.given_name + " " + tracking.users?.family_name,
      roleName,
      tracking.hours,
      tracking.minutes,
      totalTime,
      tracking.tasks?.unique_code
        ? tracking.tasks.unique_code
        : "Nessun codice",
    ];
  });

  return data;
}

export const POST = async (req: NextRequest) => {
  const dateRange = await req.json();
  const from = new Date(dateRange.data.from);
  const to = new Date(dateRange.data.to);

  console.log("range", from, to);

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
    }-${("0" + to.getDate()).slice(-2)}`;

    const fileExtension = ".xlsx";

    const workbook = XLSX.utils.book_new();

    const sheetNames: string[] = []; // Used to keep track of sheet names

    const allTimetrackingsData = prepareTimetrackingsData(
      timeTrackingsData,
      from,
      to,
    );

    const allTimetrackingsSheet = XLSX.utils.aoa_to_sheet([
      [
        "Data",
        "Nome Cognome",
        "Reparto",
        "Ore",
        "Minuti",
        "Totale",
        "Codice Progetto",
      ],
      ...allTimetrackingsData,
    ]);

    XLSX.utils.book_append_sheet(
      workbook,
      allTimetrackingsSheet,
      "A_Riassunto",
    );

    sheetNames.push(`A_Riassunto`);

    newData.forEach((item: any) => {
      // Add summary sheet for each
      const summarySheet = XLSX.utils.aoa_to_sheet([
        [
          "Data creazione",
          "Codice Progetto",
          "Note",
          "Ore",
          "Minuti",
          "Tempo totale",
        ],
        // ["Codice Progetto", "Note", "Inizio", "Fine", "Tempo totale"],
        ...item.tasks.map((task: any) => [
          { v: formatDate(task.date), t: "s" }, // 's' is for string
          { v: task.projectCode ? task.projectCode : "Nessun Codice", t: "s" }, // assuming projectCode is a string
          { v: task.description, t: "s" },
          { v: Number(task.hours), t: "n" }, // 'n' is for number
          { v: Number(task.minutes), t: "n" },
          { v: Number(task.totalTime.toFixed(2)), t: "n" },
          // task.start,
          // task.end,
          // timeToString(task.totalTime),
          // task.totalHoursPerDay,
        ]),
        // ["Totale", timeToString(item.total)],
        ["Totale", { v: item.total, t: "n" }],
      ]);

      const totalHoursSheetData = Array.from(item.dailyTotal.entries()).map(
        ([date, hours]: any) => [
          { v: formatDate(date), t: "s" },
          { v: Number(hours.toFixed(2)), t: "n" },
        ],
      );

      // Creating the totalHoursSheet with explicit types
      const totalHoursSheet = XLSX.utils.aoa_to_sheet([
        [
          { v: "Data", t: "s" },
          { v: "Totale ore giornaliero", t: "s" },
        ],
        ...totalHoursSheetData,
      ]);

      // Add the sheet names to an array for later sorting
      sheetNames.push(`${item.user} Sommario`);
      sheetNames.push(`${item.user} Giorn.`);

      XLSX.utils.book_append_sheet(
        workbook,
        summarySheet,
        `${item.user} Sommario`,
      );
      XLSX.utils.book_append_sheet(
        workbook,
        totalHoursSheet,
        `${item.user} Giorn.`,
      );
    });

    sheetNames.push(`Z. Sommario progetti`);

    const projectSheetData: any = [];

    projectData.forEach((employeeRoles, projectName) => {
      let projectTotalHours = 0; // Reset for each project
      // Add project name as a header

      projectSheetData.push([{ v: projectName, t: "s" }]);

      // Add each unique employee-role entry
      employeeRoles.forEach((details: any) => {
        projectTotalHours += details.totalHours; // Accumulate hours

        projectSheetData.push([
          { v: details.employeeName, t: "s" },
          { v: details.role, t: "s" },
          { v: `${details.totalHours}`, t: "n" },
        ]);
      });

      // Add total hours row for the project
      projectSheetData.push([
        { v: "Totale Ore", t: "s", style: { font: { bold: true } } },
        { v: "", t: "s" },
        { v: `${projectTotalHours}`, t: "n" },
      ]);

      // Add an empty row after each project for readability
      projectSheetData.push(["", "", ""]);
    });

    const projectSheet = XLSX.utils.aoa_to_sheet(projectSheetData);

    XLSX.utils.book_append_sheet(
      workbook,
      projectSheet,
      `Z. Sommario progetti`,
    );

    // Reorder the sheets based on sorted sheet names
    workbook.SheetNames = sheetNames;

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
    console.error("Error generating Excel file:", err);
    return NextResponse.json(err.message);
  }
};
