import { DateManager } from "@/package/utils/dates/date-manager";
import { Action, Task } from "@/types/supabase";

// Extended interfaces for the actual data structure used in the application
interface TaskWithRelations extends Task {
  column?: {
    id: number;
    title: string;
    identifier: string;
    position: number;
  };
  sellProduct?: {
    id: number;
    name: string;
    type?: string;
    description?: string;
  };
  QualityControl?: Array<{
    id: number;
    task_id?: number;
    user_id?: string;
    position_nr?: string;
    passed?: string;
    created_at?: string;
    updated_at?: string;
  }>;
}

interface ActionWithTask extends Action {
  Task?: TaskWithRelations;
  data?: {
    toColumn?: string;
    fromColumn?: string;
    [key: string]: any;
  };
}

export const getBaseTaskNumber = (taskTitle: string): string => {
  const match = taskTitle.match(/^\d{2}-\d{3}/);
  return match ? match[0] : taskTitle;
};

export const groupTasksByBaseNumber = (
  tasks: TaskWithRelations[],
): { [key: string]: TaskWithRelations[] } => {
  return tasks.reduce((acc: { [key: string]: TaskWithRelations[] }, task) => {
    const baseNumber = getBaseTaskNumber(task.unique_code!);
    if (!acc[baseNumber]) {
      acc[baseNumber] = [];
    }
    acc[baseNumber].push(task);
    return acc;
  }, {});
};

export const aggregateTasksByColumn = (
  tasks: TaskWithRelations[],
): { name: string; value: number }[] => {
  const columnCounts: {
    [columnName: string]: { [baseNumber: string]: TaskWithRelations[] };
  } = {};

  tasks.forEach((task) => {
    const columnName = task.column?.title || "Unknown";
    const baseNumber = getBaseTaskNumber(task.unique_code!);

    if (!columnCounts[columnName]) {
      columnCounts[columnName] = {};
    }
    if (!columnCounts[columnName][baseNumber]) {
      columnCounts[columnName][baseNumber] = [];
    }
    columnCounts[columnName][baseNumber].push(task);
  });

  let dataForBarList = Object.entries(columnCounts).map(
    ([name, groupedTasks]): { name: string; value: number } => ({
      name,
      value: Object.keys(groupedTasks).length,
    }),
  );

  const columnOrder: string[] = [
    "TO DO ",
    "CNC",
    "PREPARAZ.",
    "VERNIC.",
    "MONTAGGIO",
    "Q.C.",
    "IMBALLAGGIO",
  ];

  return dataForBarList.sort((a, b) => {
    const indexA = columnOrder.indexOf(a.name);
    const indexB = columnOrder.indexOf(b.name);
    return indexA - indexB;
  });
};

export const sumSellPriceForActiveTasks = (
  tasks: TaskWithRelations[],
): number => {
  return tasks.reduce(
    (total, task) => total + (task.sellPrice || 0),
    0,
  );
};

export const sumSellPriceActualForActiveTasks = (
  tasks: TaskWithRelations[],
): number => {
  return tasks.reduce((total, task) => {
    const statusPercentage = (task.percentStatus || 0) / 100;
    const sellPrice = task.sellPrice || 0;
    return total + sellPrice * statusPercentage;
  }, 0);
};

export const sumAllPositionsLengths = (tasks: TaskWithRelations[]): number => {
  return tasks.reduce((totalLength, task) => {
    const filteredPositions = task.positions?.filter(
      (position) => position !== "",
    ) || [];
    return totalLength + filteredPositions.length;
  }, 0);
};

export const countTasksWithTodayDelivery = (
  tasks: TaskWithRelations[],
): number => {
  // Get today's date at midnight in local timezone
  const today = new Date();

  const groupedTasks = groupTasksByBaseNumber(tasks);

  const result = Object.values(groupedTasks).filter((taskGroup) => {
    if (!taskGroup[0].deliveryDate) return false;

    // Convert UTC date to local timezone
    const deliveryDate = new Date(taskGroup[0].deliveryDate);
    const localDeliveryDate = DateManager.formatEUDate(deliveryDate);

    const localToday = DateManager.formatEUDate(today);

    return localDeliveryDate === localToday;
  }).length;

  return result;
};

export const countTasksWithDeliveryThisWeek = (
  tasks: TaskWithRelations[],
): number => {
  const now = new Date();
  const firstDayOfWeek = new Date(
    now.setDate(now.getDate() - ((now.getDay() + 6) % 7)),
  );
  firstDayOfWeek.setHours(0, 0, 0, 0);

  const lastDayOfWeek = new Date(firstDayOfWeek);
  lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
  lastDayOfWeek.setHours(23, 59, 59, 999);

  const groupedTasks = groupTasksByBaseNumber(tasks);

  const result = Object.values(groupedTasks).filter((taskGroup) => {
    if (!taskGroup[0].deliveryDate) return false;
    const deliveryDate = new Date(taskGroup[0].deliveryDate);
    return deliveryDate >= firstDayOfWeek && deliveryDate <= lastDayOfWeek;
  }).length;

  return result;
};

export const countQualityControlsDoneToday = (
  tasks: TaskWithRelations[],
): number => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const groupedTasks = groupTasksByBaseNumber(tasks);

  return Object.values(groupedTasks).reduce((sum, taskGroup) => {
    const task = taskGroup[0];
    const countForTask = (task.QualityControl || []).reduce((taskSum, item) => {
      const updated_at = new Date(item.updated_at || item.created_at || "");
      if (
        item.passed === "DONE" &&
        updated_at >= todayStart &&
        updated_at <= todayEnd
      ) {
        return taskSum + 1;
      }
      return taskSum;
    }, 0);

    return sum + countForTask;
  }, 0);
};

export const aggregateSellProductsByMonth = (
  years: number[],
  actions: ActionWithTask[],
): {
  [year: number]: { name: string; count: number }[][];
  packagingTimes: { [key: string]: number };
} => {
  const yearlyData: { [year: number]: { name: string; count: number }[][] } =
    {};

  // Filter packaging moves for the specified years
  const packagingMoves = actions.filter((action) => {
    if (action.type !== "move_task") return false;
    const data = action.data;
    if (!data?.toColumn) return false;

    const actionDate = new Date(action.createdAt || action.created_at || "");
    const actionYear = actionDate.getFullYear();

    // Only include moves from the specified years
    return data.toColumn === "IMBALLAGGIO" && years.includes(actionYear);
  });

  years.forEach((year) => {
    const monthlyAggregates: { name: string; count: number }[][] = [];

    for (let month = 0; month < 12; month++) {
      // Filter moves for this month and year
      const movesForMonth = packagingMoves.filter((action) => {
        const actionDate = new Date(
          action.createdAt || action.created_at || "",
        );
        const actionYear = actionDate.getFullYear();
        const actionMonth = actionDate.getMonth();

        return actionYear === year && actionMonth === month;
      });

      const productCounts: { [name: string]: number } = {};
      const processedTasks = new Set<string>();

      // Process each move
      movesForMonth.forEach((action) => {
        const task = action.Task;
        if (!task) return;

        // Skip if we've already processed this task
        if (processedTasks.has(task.id.toString())) {
          return;
        }

        // Mark task as processed
        processedTasks.add(task.id.toString());

        // Count non-empty positions
        const positions = task.positions?.filter(Boolean) || [];
        const positionCount = positions.length;

        const productName = task.sellProduct?.name;
        if (productName) {
          productCounts[productName] = (productCounts[productName] || 0) +
            positionCount;
        }
      });

      const monthlyData = Object.entries(productCounts).map(
        ([name, count]) => ({
          name,
          count,
        }),
      );

      monthlyAggregates.push(monthlyData);
    }

    yearlyData[year] = monthlyAggregates;
  });

  const packagingTimes = getPackagingTimesByMonth(actions);

  return {
    ...yearlyData,
    packagingTimes,
  };
};

export const calculateTotalNonEmptyPositions = (
  tasks: TaskWithRelations[],
  years: number[],
  actions: ActionWithTask[],
): { [year: number]: number } => {
  const yearlyTotals: { [year: number]: number } = {};

  // Filter packaging moves
  const packagingMoves = actions.filter((action) => {
    if (action.type !== "move_task") return false;
    const data = action.data;
    return data?.toColumn === "IMBALLAGGIO";
  });

  years.forEach((year) => {
    const processedTasks = new Set<string>();

    yearlyTotals[year] = packagingMoves.reduce((totalSum, action) => {
      const actionDate = new Date(action.createdAt || action.created_at || "");
      const actionYear = actionDate.getFullYear();

      if (actionYear === year) {
        const task = action.Task;
        if (!task) return totalSum;

        // Skip if we've already processed this task
        if (processedTasks.has(task.id.toString())) {
          return totalSum;
        }

        // Mark task as processed
        processedTasks.add(task.id.toString());

        const taskSum = (task.positions || []).reduce(
          (sum: number, position: string) => {
            return position !== "" ? sum + 1 : sum;
          },
          0,
        );
        return totalSum + taskSum;
      }
      return totalSum;
    }, 0);
  });

  return yearlyTotals;
};

export const calculateTodoProdValue = (tasks: TaskWithRelations[]): number => {
  return tasks.reduce((total, task) => {
    if (task.column?.identifier === "TODOPROD") {
      return total + (task.sellPrice || 0);
    }
    return total;
  }, 0);
};

// Add these helper functions
const getWeekNumber = (date: Date): number => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

export const aggregateProductsByWeek = (
  tasks: TaskWithRelations[],
  actions: ActionWithTask[],
) => {
  const currentDate = new Date();
  const currentWeekNumber = getWeekNumber(currentDate);

  const packagingMoves = actions.filter((action) => {
    if (action.type !== "move_task") return false;
    const actionDate = new Date(action.createdAt || action.created_at || "");
    const data = action.data;

    return (
      data?.toColumn === "IMBALLAGGIO" &&
      actionDate.getFullYear() === currentDate.getFullYear()
    );
  });

  // Keep track of processed tasks per week to avoid duplicates
  const processedTasksPerWeek: { [key: number]: Set<string> } = {};

  // Calculate positions and values for tasks moved to packaging per week
  const weeklyPackagingData: {
    [key: number]: {
      positions: number;
      value: number;
      products: { [key: string]: number };
    };
  } = {};

  // Process moves in chronological order (earliest first)
  const sortedMoves = [...packagingMoves].sort(
    (a, b) =>
      new Date(a.createdAt || a.created_at || "").getTime() -
      new Date(b.createdAt || b.created_at || "").getTime(),
  );

  sortedMoves.forEach((action) => {
    const task = action.Task;
    if (!task) return;

    const moveDate = new Date(action.createdAt || action.created_at || "");
    const weekNumber = getWeekNumber(moveDate);

    // Initialize week's processed tasks set if not exists
    if (!processedTasksPerWeek[weekNumber]) {
      processedTasksPerWeek[weekNumber] = new Set();
    }

    // Skip if we've already processed this task for this week
    if (processedTasksPerWeek[weekNumber].has(task.id.toString())) {
      return;
    }

    // Mark task as processed for this week
    processedTasksPerWeek[weekNumber].add(task.id.toString());

    // Initialize week data if not exists
    if (!weeklyPackagingData[weekNumber]) {
      weeklyPackagingData[weekNumber] = {
        positions: 0,
        value: 0,
        products: {},
      };
    }

    // Count non-empty positions for this task - using the same logic as monthly totals
    const positions = task.positions?.filter(Boolean) || [];
    const positionCount = positions.length;

    // Add positions and value to week totals
    weeklyPackagingData[weekNumber].positions += positionCount;
    weeklyPackagingData[weekNumber].value += task.sellPrice || 0;

    // Add positions to product breakdown
    const productName = task.sellProduct?.name;
    if (productName) {
      weeklyPackagingData[weekNumber].products[productName] =
        (weeklyPackagingData[weekNumber].products[productName] || 0) +
        positionCount;
    }
  });

  // Initialize array for current year weeks up to current week
  const weeklyData: {
    weekNumber: number;
    products: { name: string; count: number }[];
    totalCount: number;
  }[] = [];

  for (let week = 1; week <= currentWeekNumber; week++) {
    weeklyData[week - 1] = {
      weekNumber: week,
      products: [],
      totalCount: 0,
    };
  }

  // Convert the collected data into the required format
  weeklyData.forEach((weekData) => {
    const weekStats = weeklyPackagingData[weekData.weekNumber] || {
      positions: 0,
      value: 0,
      products: {},
    };

    // Convert product data to array and sort by count
    weekData.products = Object.entries(weekStats.products)
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    weekData.totalCount = weekStats.positions;
  });

  // Weekly goal is 62000 CHF
  const weeklyGoal = 62000;

  // Sort weeks by number descending (most recent first)
  const filteredWeeklyData = weeklyData
    .map((week) => ({
      ...week,
      packagingPositions: week.totalCount,
      totalValue: weeklyPackagingData[week.weekNumber]?.value || 0,
      remainingToGoal: Math.max(
        weeklyGoal - (weeklyPackagingData[week.weekNumber]?.value || 0),
        0,
      ),
      percentageOfGoal:
        ((weeklyPackagingData[week.weekNumber]?.value || 0) / weeklyGoal) * 100,
    }))
    .sort((a, b) => b.weekNumber - a.weekNumber);

  return filteredWeeklyData;
};

export const getPackagingTimesByMonth = (actions: ActionWithTask[]) => {
  const monthlyPackaging = actions.reduce(
    (acc: { [key: string]: number }, action) => {
      const date = new Date(action.createdAt || action.created_at || "");
      const monthKey = `${date.getFullYear()}-${
        String(
          date.getMonth() + 1,
        ).padStart(2, "0")
      }`;

      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    },
    {},
  );

  return monthlyPackaging;
};

export const getPackagingTimesByWeek = (actions: ActionWithTask[]) => {
  const weeklyPackaging = actions.reduce(
    (acc: { [key: string]: number }, action) => {
      const date = new Date(action.createdAt || action.created_at || "");
      const weekNumber = getWeekNumber(date);
      const weekKey = `${date.getFullYear()}-W${
        String(weekNumber).padStart(
          2,
          "0",
        )
      }`;

      acc[weekKey] = (acc[weekKey] || 0) + 1;
      return acc;
    },
    {},
  );

  return weeklyPackaging;
};

export const calculateMonthlyTotals = (
  tasks: TaskWithRelations[],
  actions: ActionWithTask[],
) => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Filter actions to only include moves to IMBALLAGGIO for current month
  const monthlyPackagingMoves = actions.filter((action) => {
    if (action.type !== "move_task") return false;
    const actionDate = new Date(action.createdAt || action.created_at || "");
    const data = action.data;

    return (
      data?.toColumn === "IMBALLAGGIO" &&
      actionDate.getMonth() === currentMonth &&
      actionDate.getFullYear() === currentYear
    );
  });

  // Keep track of processed tasks to avoid duplicates
  const processedTasks = new Set<string>();

  // Sort moves chronologically
  const sortedMoves = [...monthlyPackagingMoves].sort(
    (a, b) =>
      new Date(a.createdAt || a.created_at || "").getTime() -
      new Date(b.createdAt || b.created_at || "").getTime(),
  );

  // Calculate total value and positions from packaging moves using the same logic as weekly calculations
  const monthlyTotal = sortedMoves.reduce(
    (acc, action) => {
      const task = action.Task;
      if (!task) return acc;

      // Skip if we've already processed this task
      if (processedTasks.has(task.id.toString())) {
        return acc;
      }

      // Mark task as processed
      processedTasks.add(task.id.toString());

      // Count non-empty positions
      const positions = task.positions?.filter(Boolean) || [];
      const positionCount = positions.length;

      return {
        totalValue: acc.totalValue + (task.sellPrice || 0),
        totalCount: acc.totalCount + positionCount,
        products: {
          ...acc.products,
          [task.sellProduct?.name || "Unknown"]:
            (acc.products[task.sellProduct?.name || "Unknown"] || 0) +
            positionCount,
        },
      };
    },
    { totalValue: 0, totalCount: 0, products: {} as { [key: string]: number } },
  );

  return monthlyTotal;
};
