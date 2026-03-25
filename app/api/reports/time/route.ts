import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import ExcelJS from "exceljs";
import { logger } from "@/lib/logger";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteContextFromDomain } from "@/lib/site-context";
import { startOfLocalDay, endOfLocalDay } from "@/lib/utils";

export const dynamic = "force-dynamic";

type TimeReportSelection = {
  from: Date;
  to: Date;
  selectedMonths: number[];
  year?: number;
};

function normalizeSelectedMonths(months: unknown) {
  if (!Array.isArray(months)) return [];

  return Array.from(
    new Set(
      months
        .map((month) => Number(month))
        .filter((month) => Number.isInteger(month) && month >= 1 && month <= 12),
    ),
  ).sort((a, b) => a - b);
}

function buildTimeReportSelection(data: any): TimeReportSelection {
  const selectedMonths = normalizeSelectedMonths(data?.months);
  const year = Number(data?.year);

  if (selectedMonths.length > 0 && Number.isInteger(year)) {
    return {
      from: startOfLocalDay(new Date(year, selectedMonths[0] - 1, 1)),
      to: endOfLocalDay(
        new Date(year, selectedMonths[selectedMonths.length - 1], 0),
      ),
      selectedMonths,
      year,
    };
  }

  if (!data?.from || !data?.to) {
    throw new Error("Intervallo report ore non valido");
  }

  return {
    from: startOfLocalDay(data.from),
    to: endOfLocalDay(data.to),
    selectedMonths: [],
  };
}

function isDateInSelection(
  date: Date | string,
  selection: TimeReportSelection,
) {
  const currentDate = new Date(date);

  if (selection.selectedMonths.length > 0 && selection.year !== undefined) {
    return currentDate.getFullYear() === selection.year &&
      selection.selectedMonths.includes(currentDate.getMonth() + 1);
  }

  return currentDate >= selection.from && currentDate <= selection.to;
}

function formatSelectedMonthsForFileName(selection: TimeReportSelection) {
  if (selection.selectedMonths.length === 0 || selection.year === undefined) {
    return null;
  }

  const monthPart = selection.selectedMonths.map((month) =>
    String(month).padStart(2, "0")
  ).join("_");

  return `Report_ore_${selection.year}_mesi_${monthPart}.xlsx`;
}

function filterTimetrackings(
  timeTrackingsData: any[],
  userId: number,
  selection: TimeReportSelection,
) {
  return timeTrackingsData.filter(
    (item: any) =>
      item.user?.id === userId &&
      isDateInSelection(item.created_at, selection),
  );
}

function getTotalHours(timetrackings: any[]) {
  const total = timetrackings.reduce((acc, cur) => {
    return acc + Number(cur.totalTime || 0);
  }, 0);

  return Number(total.toFixed(2));
}

function getUserTasks(timetrackings: any[]) {
  const taskMap = new Map();
  timetrackings.forEach((item) => {
    const taskId = item.task_id;

    if (taskId) {
      const schedule = getWorkSchedule(item.created_at);
      const task = {
        date: item.created_at,
        description: item.description,
        projectCode: item.task?.unique_code || "nessun codice",
        siteName: item.task?.name || "",
        location: item.task?.luogo || "",
        startTimeMorning: schedule.startTimeMorning,
        endTimeMorning: schedule.endTimeMorning,
        startTimeAfternoon: schedule.startTimeAfternoon,
        endTimeAfternoon: schedule.endTimeAfternoon,
        hours: item.hours,
        minutes: item.minutes,
        totalTime: item.totalTime || 0,
      };

      const tasks = taskMap.get(taskId);
      if (tasks) {
        tasks.push(task);
      } else {
        taskMap.set(taskId, [task]);
      }
    }
  });

  const taskArray = Array.from(taskMap.values()).flat().sort(
    (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const totalHoursPerDay = new Map();
  taskArray.forEach((task) => {
    const dateKey = new Date(task.date).toDateString();
    const currentHours = totalHoursPerDay.get(dateKey) || 0;
    totalHoursPerDay.set(dateKey, currentHours + task.totalTime);
  });

  return { tasks: taskArray, totalHoursPerDay };
}

function formatDate(date: Date | string) {
  const d = new Date(date);
  const day = ("0" + d.getDate()).slice(-2);
  const month = ("0" + (d.getMonth() + 1)).slice(-2);
  const year = d.getFullYear();
  return day + "-" + month + "-" + year;
}

function getDateKey(date: Date | string) {
  const d = new Date(date);
  const day = ("0" + d.getDate()).slice(-2);
  const month = ("0" + (d.getMonth() + 1)).slice(-2);
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

function getMonthKey(date: Date | string) {
  return getDateKey(date).slice(0, 7);
}

function formatMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return `${month}-${year}`;
}

function getWeekKey(date: Date | string) {
  const d = new Date(date);
  const weekStart = new Date(d);
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  weekStart.setDate(weekStart.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);

  return getDateKey(weekStart);
}

function getWorkSchedule(date: Date | string) {
  const day = new Date(date).getDay();

  if (day >= 1 && day <= 4) {
    return {
      startTimeMorning: "07:00",
      endTimeMorning: "12:00",
      startTimeAfternoon: "13:00",
      endTimeAfternoon: "17:00",
    };
  }

  if (day === 5) {
    return {
      startTimeMorning: "07:00",
      endTimeMorning: "13:00",
      startTimeAfternoon: "",
      endTimeAfternoon: "",
    };
  }

  return {
    startTimeMorning: "",
    endTimeMorning: "",
    startTimeAfternoon: "",
    endTimeAfternoon: "",
  };
}

function buildDailyRows(dailyTotal: Map<string, number>) {
  const dailyEntries = Array.from(dailyTotal.entries()).sort(
    ([dateA], [dateB]) =>
      new Date(dateA).getTime() - new Date(dateB).getTime(),
  );

  const rows: Array<{ Data: string; Totale: number | string }> = [];

  let weekTotal = 0;
  let monthTotal = 0;
  let weekStartDate: string | null = dailyEntries[0]?.[0] || null;

  dailyEntries.forEach(([date, hours], index) => {
    const roundedHours = Number(hours.toFixed(2));
    const nextDate = dailyEntries[index + 1]?.[0] || null;
    const currentWeekKey = getWeekKey(date);
    const nextWeekKey = nextDate ? getWeekKey(nextDate) : null;
    const currentMonthKey = getMonthKey(date);
    const nextMonthKey = nextDate ? getMonthKey(nextDate) : null;

    rows.push({
      Data: formatDate(date),
      Totale: roundedHours,
    });

    weekTotal += roundedHours;
    monthTotal += roundedHours;

    const shouldCloseWeek = nextWeekKey !== currentWeekKey ||
      nextMonthKey !== currentMonthKey;
    const shouldCloseMonth = nextMonthKey !== currentMonthKey;

    if (shouldCloseWeek && weekStartDate) {
      rows.push({
        Data: `Totale settimana ${formatDate(weekStartDate)} - ${formatDate(date)}`,
        Totale: Number(weekTotal.toFixed(2)),
      });
      weekTotal = 0;
      weekStartDate = nextDate;
    }

    if (shouldCloseMonth) {
      rows.push({
        Data: `Totale mese ${formatMonthKey(currentMonthKey)}`,
        Totale: Number(monthTotal.toFixed(2)),
      });
      monthTotal = 0;
    }
  });

  return rows;
}

function styleWorksheet(
  worksheet: ExcelJS.Worksheet,
  options: {
    numericColumns?: string[];
    emphasizeProjectHeaders?: boolean;
  } = {},
) {
  const border = {
    top: { style: "thin" as const, color: { argb: "FFD9D9D9" } },
    left: { style: "thin" as const, color: { argb: "FFD9D9D9" } },
    bottom: { style: "thin" as const, color: { argb: "FFD9D9D9" } },
    right: { style: "thin" as const, color: { argb: "FFD9D9D9" } },
  };

  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.height = 22;

  for (let col = 1; col <= worksheet.columnCount; col++) {
    const cell = headerRow.getCell(col);
    cell.font = { bold: true };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFEFEF" },
    };
    cell.border = border;
  }

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    for (let col = 1; col <= worksheet.columnCount; col++) {
      const cell = row.getCell(col);
      cell.border = border;
      cell.alignment = {
        vertical: "middle",
        wrapText: true,
        horizontal: typeof cell.value === "number" ? "right" : "left",
      };
    }

    const firstCellValue = row.getCell(1).value;
    const secondCellValue = row.getCell(2).value;
    const thirdCellValue = row.getCell(3).value;
    const isTotalRow = typeof firstCellValue === "string" &&
      firstCellValue.startsWith("Totale");
    const isProjectHeaderRow = options.emphasizeProjectHeaders &&
      !!firstCellValue &&
      !secondCellValue &&
      !thirdCellValue;

    if (isTotalRow) {
      row.font = { bold: true };
      const fill = {
        type: "pattern" as const,
        pattern: "solid" as const,
        fgColor: {
          argb: firstCellValue.startsWith("Totale mese")
            ? "FFD9EAD3"
            : "FFFCE5CD",
        },
      };
      for (let col = 1; col <= worksheet.columnCount; col++) {
        row.getCell(col).fill = fill;
      }
    }

    if (isProjectHeaderRow) {
      row.font = { bold: true };
      const fill = {
        type: "pattern" as const,
        pattern: "solid" as const,
        fgColor: { argb: "FFDCE6F1" },
      };
      for (let col = 1; col <= worksheet.columnCount; col++) {
        row.getCell(col).fill = fill;
      }
    }
  });

  options.numericColumns?.forEach((columnKey) => {
    const column = worksheet.getColumn(columnKey);
    column.numFmt = "0.00";
  });
}

function prepareTimetrackingsData(
  timeTrackingsData: any[],
  selection: TimeReportSelection,
) {
  const filteredData = timeTrackingsData.filter(
    (item: any) => isDateInSelection(item.created_at, selection),
  );

  const sortedTimetrackings = filteredData.sort(
    (a: any, b: any) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const data = sortedTimetrackings.map((tracking: any) => {
    const roles = tracking.roles || [];
    const roleName = roles.length > 0 && roles[0]?.role?.name
      ? roles[0].role.name
      : "No Ruolo";
    const totalTime = (tracking.hours + tracking.minutes / 60).toFixed(2);
    const schedule = getWorkSchedule(tracking.created_at);

    return {
      Data: formatDate(tracking.created_at),
      "Ora inizio Mattina": schedule.startTimeMorning,
      "Ora fine Mattina": schedule.endTimeMorning,
      "Ora inizio Pomeriggio": schedule.startTimeAfternoon,
      "Ora fine Pomeriggio": schedule.endTimeAfternoon,
      "Nome Cognome": (tracking.user?.given_name || "") +
        " " +
        (tracking.user?.family_name || ""),
      Reparto: roleName,
      Ore: tracking.hours,
      Minuti: tracking.minutes,
      Totale: Number(totalTime),
      "Codice Progetto": tracking.task?.unique_code || "Nessun codice",
      Cantiere: tracking.task?.name || "",
      Luogo: tracking.task?.luogo || "",
      "Attività Interna": tracking.internal_activity || "",
      "Pranzo Fuori Sede": tracking.lunch_offsite ? "Sì" : "",
      "Luogo Pranzo": tracking.lunch_location || "",
    };
  });

  return data;
}

export const POST = async (req: NextRequest) => {
  const requestBody = await req.json();
  const selection = buildTimeReportSelection(requestBody.data);
  const { from, to } = selection;

  logger.debug("range", from, to);

  try {
    const supabase = await createClient();

    // Get user context for role-based filtering
    const userContext = await getUserContext();
    if (!userContext?.user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const isRegularUser = userContext.role === "user";

    // Get site context from header
    const siteDomain = req.headers.get("x-site-domain");
    let siteId: string | null = null;

    if (siteDomain) {
      const context = await getSiteContextFromDomain(siteDomain);
      siteId = context.siteId;
    }

    // Fetch timetracking data with proper relations (filter by site_id only)
    let query = supabase
      .from("Timetracking")
      .select(`
        *,
        task:task_id(*, site_id),
        user:employee_id(id, given_name, family_name, email),
        roles:_RolesToTimetracking(role:Roles(id, name))
      `)
      .order("created_at", { ascending: false });

    if (siteId) {
      query = query.eq("site_id", siteId);
    }

    const { data: timeTrackingsData, error: timeTrackingError } = await query;

    if (timeTrackingError) throw timeTrackingError;

    // Filter by user role (site already filtered in query)
    let filteredTimetrackings = (timeTrackingsData || []).filter((t: any) => {
      if (isRegularUser) {
        return t.user?.id && t.employee_id;
      }
      return true;
    });

    // For regular users, filter to only their entries
    if (isRegularUser) {
      // Get the user's internal ID from the User table
      const { data: userData } = await supabase
        .from("User")
        .select("id")
        .eq("authId", userContext.user.id)
        .single();

      if (userData) {
        filteredTimetrackings = filteredTimetrackings.filter(
          (t: any) => t.employee_id === userData.id,
        );
      } else {
        filteredTimetrackings = [];
      }
    }

    // Get users for the report (only enabled users)
    let userQuery = supabase.from("User").select("*").eq("enabled", true);

    if (siteId) {
      // Get users associated with this site
      // user_sites.user_id contains auth UUIDs, so we filter on User.authId
      const { data: siteUsers } = await supabase
        .from("user_sites")
        .select("user_id")
        .eq("site_id", siteId);

      if (siteUsers && siteUsers.length > 0) {
        const userAuthIds = siteUsers.map((su: any) => su.user_id);
        userQuery = userQuery.in("authId", userAuthIds);
      }
    }

    const { data: userData, error: userError } = await userQuery;

    if (userError) throw userError;

    // For regular users, only include themselves
    let userEnabled = userData || [];
    if (isRegularUser) {
      const { data: currentUser } = await supabase
        .from("User")
        .select("*")
        .eq("authId", userContext.user.id)
        .single();

      userEnabled = currentUser ? [currentUser] : [];
    }

    const newData = userEnabled.map((user: any) => {
      const userTimetrackings = filterTimetrackings(
        filteredTimetrackings,
        user.id,
        selection,
      );

      const userTotalHours = getTotalHours(userTimetrackings);

      const userTasks = getUserTasks(userTimetrackings);
      return {
        user: user.family_name || user.given_name || "Utente",
        tasks: userTasks.tasks,
        dailyTotal: userTasks.totalHoursPerDay,
        total: userTotalHours,
      };
    });

    const projectData = new Map(); // Holds data organized by project

    // Filter timetrackings by date range for project summary
    const dateFilteredTimetrackings = filteredTimetrackings.filter(
      (t: any) => isDateInSelection(t.created_at, selection),
    );

    dateFilteredTimetrackings.forEach((tracking: any) => {
      const projectName = tracking.task?.unique_code ||
        tracking.internal_activity || "No Code";
      const employeeName = tracking.user?.given_name || "Utente";
      const roles = tracking.roles || [];

      if (roles.length > 0) {
        roles.forEach((roleEntry: any) => {
          const projectEntry = projectData.get(projectName) || new Map();
          projectData.set(projectName, projectEntry);

          const roleDescription = roleEntry.role?.name || "No Ruolo";
          const employeeRoleKey = `${employeeName}-${roleDescription}`;

          const employeeRoleEntry = projectEntry.get(employeeRoleKey) || {
            employeeName,
            role: roleDescription,
            totalHours: 0,
          };

          employeeRoleEntry.totalHours += tracking.totalTime || 0;
          projectEntry.set(employeeRoleKey, employeeRoleEntry);
        });
      } else {
        // Handle entries without roles
        const projectEntry = projectData.get(projectName) || new Map();
        projectData.set(projectName, projectEntry);

        const employeeRoleKey = `${employeeName}-No Ruolo`;
        const employeeRoleEntry = projectEntry.get(employeeRoleKey) || {
          employeeName,
          role: "No Ruolo",
          totalHours: 0,
        };

        employeeRoleEntry.totalHours += tracking.totalTime || 0;
        projectEntry.set(employeeRoleKey, employeeRoleEntry);
      }
    });

    const fileName = formatSelectedMonthsForFileName(selection) ||
      `Report_ore_dal_${from.getFullYear()}-${
        ("0" + (from.getMonth() + 1)).slice(-2)
      }-${("0" + from.getDate()).slice(-2)}_al_${to.getFullYear()}-${
        ("0" + (to.getMonth() + 1)).slice(-2)
      }-${("0" + to.getDate()).slice(-2)}.xlsx`;

    const workbook = new ExcelJS.Workbook();

    // Create summary sheet with all timetrackings
    const allTimetrackingsData = prepareTimetrackingsData(
      filteredTimetrackings,
      selection,
    );

    const allTimetrackingsSheet = workbook.addWorksheet("A_Riassunto");
    allTimetrackingsSheet.columns = [
      { header: "Data", key: "Data", width: 12 },
      { header: "Ora inizio mattina", key: "Ora inizio Mattina", width: 16 },
      { header: "Ora fine mattina", key: "Ora fine Mattina", width: 16 },
      {
        header: "Ora inizio pomeriggio",
        key: "Ora inizio Pomeriggio",
        width: 18,
      },
      {
        header: "Ora fine pomeriggio",
        key: "Ora fine Pomeriggio",
        width: 18,
      },
      { header: "Nome Cognome", key: "Nome Cognome", width: 22 },
      { header: "Reparto", key: "Reparto", width: 15 },
      { header: "Ore", key: "Ore", width: 8 },
      { header: "Minuti", key: "Minuti", width: 10 },
      { header: "Totale", key: "Totale", width: 10 },
      { header: "Codice Progetto", key: "Codice Progetto", width: 18 },
      { header: "Cantiere", key: "Cantiere", width: 28 },
      { header: "Luogo", key: "Luogo", width: 26 },
      { header: "Attività Interna", key: "Attività Interna", width: 18 },
      { header: "Pranzo Fuori", key: "Pranzo Fuori Sede", width: 12 },
      { header: "Luogo Pranzo", key: "Luogo Pranzo", width: 20 },
    ];
    allTimetrackingsSheet.addRows(allTimetrackingsData);
    styleWorksheet(allTimetrackingsSheet, { numericColumns: ["Totale"] });

    // Create individual user sheets
    newData.forEach((item: any) => {
      // Summary sheet for each user
      const summarySheet = workbook.addWorksheet(`${item.user} Sommario`);
      summarySheet.columns = [
        { header: "Data creazione", key: "Data creazione", width: 15 },
        { header: "Ora inizio mattina", key: "Ora inizio Mattina", width: 16 },
        { header: "Ora fine mattina", key: "Ora fine Mattina", width: 16 },
        {
          header: "Ora inizio pomeriggio",
          key: "Ora inizio Pomeriggio",
          width: 18,
        },
        {
          header: "Ora fine pomeriggio",
          key: "Ora fine Pomeriggio",
          width: 18,
        },
        { header: "Codice Progetto", key: "Codice Progetto", width: 18 },
        { header: "Cantiere", key: "Cantiere", width: 28 },
        { header: "Luogo", key: "Luogo", width: 26 },
        { header: "Note", key: "Note", width: 32 },
        { header: "Ore", key: "Ore", width: 8 },
        { header: "Minuti", key: "Minuti", width: 10 },
        { header: "Tempo totale", key: "Tempo totale", width: 15 },
      ];

      item.tasks.forEach((task: any) => {
        summarySheet.addRow({
          "Data creazione": formatDate(task.date),
          "Ora inizio Mattina": task.startTimeMorning,
          "Ora fine Mattina": task.endTimeMorning,
          "Ora inizio Pomeriggio": task.startTimeAfternoon,
          "Ora fine Pomeriggio": task.endTimeAfternoon,
          "Codice Progetto": task.projectCode
            ? task.projectCode
            : "Nessun Codice",
          Cantiere: task.siteName,
          Luogo: task.location,
          Note: task.description,
          Ore: Number(task.hours),
          Minuti: Number(task.minutes),
          "Tempo totale": Number(task.totalTime.toFixed(2)),
        });
      });

      // Add total row
      summarySheet.addRow({
        "Data creazione": "Totale",
        "Ora inizio Mattina": "",
        "Ora fine Mattina": "",
        "Ora inizio Pomeriggio": "",
        "Ora fine Pomeriggio": "",
        "Codice Progetto": "",
        Cantiere: "",
        Luogo: "",
        Note: "",
        Ore: "",
        Minuti: "",
        "Tempo totale": item.total,
      });
      styleWorksheet(summarySheet, { numericColumns: ["Tempo totale"] });

      // Daily total sheet for each user
      const totalHoursSheet = workbook.addWorksheet(`${item.user} Giorn.`);
      totalHoursSheet.columns = [
        { header: "Data", key: "Data", width: 15 },
        { header: "Totale ore giornaliero", key: "Totale", width: 25 },
      ];

      buildDailyRows(item.dailyTotal).forEach((row) => {
        totalHoursSheet.addRow(row);
      });
      styleWorksheet(totalHoursSheet, { numericColumns: ["Totale"] });
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
    styleWorksheet(projectSheet, {
      numericColumns: ["col3"],
      emphasizeProjectHeaders: true,
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
