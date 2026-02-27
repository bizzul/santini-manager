import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import ExcelJS from "exceljs";
import { logger } from "@/lib/logger";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteContextFromDomain } from "@/lib/site-context";

export const dynamic = "force-dynamic";

function filterTimetrackings(
  timeTrackingsData: any[],
  userId: number,
  from: Date,
  to: Date,
) {
  return timeTrackingsData.filter(
    (item: any) =>
      item.user?.id === userId &&
      new Date(item.created_at) >= from &&
      new Date(item.created_at) <= to,
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
      const task = {
        date: item.created_at,
        description: item.description,
        projectCode: item.task?.unique_code || "nessun codice",
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

  const taskArray = Array.from(taskMap.values()).flat();

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

function prepareTimetrackingsData(
  timeTrackingsData: any[],
  from: Date,
  to: Date,
) {
  const filteredData = timeTrackingsData.filter(
    (item: any) =>
      new Date(item.created_at) >= from && new Date(item.created_at) <= to,
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

    return {
      Data: formatDate(tracking.created_at),
      "Nome Cognome": (tracking.user?.given_name || "") +
        " " +
        (tracking.user?.family_name || ""),
      Reparto: roleName,
      Ore: tracking.hours,
      Minuti: tracking.minutes,
      Totale: Number(totalTime),
      "Codice Progetto": tracking.task?.unique_code || "Nessun codice",
      "Attività Interna": tracking.internal_activity || "",
      "Pranzo Fuori Sede": tracking.lunch_offsite ? "Sì" : "",
      "Luogo Pranzo": tracking.lunch_location || "",
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
        from,
        to,
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
      (t: any) =>
        new Date(t.created_at) >= from && new Date(t.created_at) <= to,
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

    const fileName = `Report_ore_dal_${from.getFullYear()}-${
      ("0" + (from.getMonth() + 1)).slice(-2)
    }-${("0" + from.getDate()).slice(-2)}_al_${to.getFullYear()}-${
      ("0" + (to.getMonth() + 1)).slice(-2)
    }-${("0" + to.getDate()).slice(-2)}.xlsx`;

    const workbook = new ExcelJS.Workbook();

    // Create summary sheet with all timetrackings
    const allTimetrackingsData = prepareTimetrackingsData(
      filteredTimetrackings,
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
      { header: "Attività Interna", key: "Attività Interna", width: 18 },
      { header: "Pranzo Fuori", key: "Pranzo Fuori Sede", width: 12 },
      { header: "Luogo Pranzo", key: "Luogo Pranzo", width: 20 },
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
          "Codice Progetto": task.projectCode
            ? task.projectCode
            : "Nessun Codice",
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
