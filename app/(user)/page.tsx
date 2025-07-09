import React from "react";
import { withPageAuthRequired, getSession } from "@auth0/nextjs-auth0";
import Dashboard from "@/components/dashboard/dashboard";
import { prisma } from "../../prisma-global";
import { Action, Client, SellProduct, Task } from "@prisma/client";
import { DashboardData } from "../../types/dashboard";
import {
  aggregateTasksByColumn,
  sumSellPriceForActiveTasks,
  sumSellPriceActualForActiveTasks,
  sumAllPositionsLengths,
  countTasksWithTodayDelivery,
  countTasksWithDeliveryThisWeek,
  countQualityControlsDoneToday,
  aggregateSellProductsByMonth,
  calculateTotalNonEmptyPositions,
  groupTasksByBaseNumber,
  calculateTodoProdValue,
  aggregateProductsByWeek,
  calculateMonthlyTotals,
} from "@/utils/dashboard-calculations";

export interface Data {
  clients: Client[];
  products: SellProduct[];
  allProducts: SellProduct[];
  history: Action[];
  tasks: Task[];
  groupedActiveTasks: Task[];
  activeTasks: Task[];
  doneTasks: Task[];
  stockedTasks: Task[];
}

export const revalidate = 0;

async function getData(): Promise<Data | any> {
  const clients = await prisma.client.findMany({});

  // Fetch sell products and their associated tasks
  const productsWithTasks = await prisma.sellProduct.findMany({
    include: {
      Task: {
        where: {
          archived: false, // Exclude archived tasks
          stoccato: false,
          column: {
            NOT: {
              identifier: "SPEDITO", // Filtering out tasks in the "SPEDITO" column
              AND: {
                NOT: {
                  identifier: "TODOPROD",
                },
              },
            },
          },
        },
      },
    },
  });

  // Transform the products to include a grouped task count
  const products = productsWithTasks.map((product) => {
    // Group tasks by base number and count the groups
    const groupedTasks = groupTasksByBaseNumber(product.Task);
    const taskCount = Object.keys(groupedTasks).length;

    return {
      ...product,
      taskCount,
    };
  });

  // Fetch sell products and their associated tasks with correct date filtering
  const tasksWithProducts = await prisma.task.findMany({
    where: {
      AND: [
        {
          created_at: {
            gte: new Date(new Date().getFullYear(), 0, 1),
            lt: new Date(new Date().getFullYear() + 1, 0, 1),
          },
        },
        {
          OR: [
            {
              column: {
                identifier: "SPEDITO",
              },
            },
            {
              column: {
                title: "Q.C.",
              },
            },
          ],
        },
      ],
    },
    include: {
      sellProduct: true,
      column: true,
    },
  });

  // Group tasks by sellProduct and count
  const productTaskCounts = tasksWithProducts.reduce(
    (acc: { [key: string]: any }, task) => {
      const productId = task.sellProduct?.id;
      const productName = task.sellProduct?.name;

      if (productId && productName) {
        if (!acc[productId]) {
          acc[productId] = {
            id: productId,
            name: productName,
            tasks: [],
          };
        }
        acc[productId].tasks.push(task);
      }
      return acc;
    },
    {}
  );

  // Transform to allProducts format
  const allProducts = Object.values(productTaskCounts).map((product: any) => {
    const groupedTasks = groupTasksByBaseNumber(product.tasks);
    return {
      id: product.id,
      name: product.name,
      taskCount: Object.keys(groupedTasks).length,
    };
  });

  // Fetch all stocked tasks
  const stockedTasks = await prisma.task.findMany({
    where: {
      stoccato: true,
      column: {
        NOT: {
          identifier: "SPEDITO",
        },
      },
    },
  });

  const tasks = await prisma.task.findMany({
    include: {
      client: true,
      errortracking: true,
      PackingControl: true,
      QualityControl: true,
      sellProduct: true,
      _count: true,
      column: true,
    },
  });

  const activeTasks = await prisma.task.findMany({
    where: {
      archived: false,
      stoccato: false,
      column: {
        NOT: {
          identifier: "SPEDITO",
        },
        AND: {
          NOT: {
            identifier: "TODOPROD",
          },
        },
      },
    },
    include: {
      client: true,
      errortracking: true,
      PackingControl: true,
      QualityControl: true,
      sellProduct: true,
      _count: true,
      column: true,
    },
  });

  // Group active tasks by base number
  const groupedActiveTasks = Object.values(
    groupTasksByBaseNumber(activeTasks)
  ).map(
    (taskGroup) => taskGroup[0] // Take the first task from each group
  );

  // Get last 5 years
  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  );

  const doneTasks = await prisma.task.findMany({
    where: {
      AND: [
        {
          updated_at: {
            gte: new Date(Math.min(...years), 0, 1), // Start of earliest year
            lt: new Date(Math.max(...years) + 1, 0, 1), // Start of next year after latest year
          },
        },
        {
          OR: [
            {
              column: {
                identifier: "SPEDITO",
              },
            },
            {
              column: {
                title: "Q.C.",
              },
            },
          ],
        },
        // {
        //   stoccato: false,
        // },
      ],
    },
    include: {
      sellProduct: true,
      column: true,
    },
  });

  // Add this query to fetch relevant actions
  const history = await prisma.action.findMany({
    where: {
      type: "move_task",
      createdAt: {
        gte: new Date(Math.min(...years), 0, 1),
        lt: new Date(Math.max(...years) + 1, 0, 1),
      },
    },
    include: {
      Task: {
        include: {
          sellProduct: true, // Include anche il sellProduct
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    clients,
    products,
    tasks,
    groupedActiveTasks,
    activeTasks,
    allProducts,
    doneTasks,
    stockedTasks,
    history,
  };
}

export default withPageAuthRequired(async function Home() {
  //@ts-ignore
  const { user } = await getSession();

  const data = await getData();

  // Get last 5 years - Move this here before calculateDashboardData
  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  );

  const calculateDashboardData = (data: Data): DashboardData => {
    // Define products to be grouped as "Altro"
    const altroProducts = [
      "SF550",
      "SF620",
      "SF220",
      "SF400",
      "Pf-Ri",
      "Altro",
    ];

    const chartData = data.products.reduce((acc: any[], product: any) => {
      // Filter active tasks for this product
      const productActiveTasks = data.activeTasks.filter(
        (task) => task.sellProductId === product.id
      );

      // Count total non-empty positions for the product's active tasks
      const totalPositions = productActiveTasks.reduce((totalLength, task) => {
        const filteredPositions = task.positions.filter(
          (position) => position !== ""
        );
        return totalLength + filteredPositions.length;
      }, 0);

      if (altroProducts.includes(product.name)) {
        // Find existing "Altro" entry or create it
        const altroIndex = acc.findIndex((item) => item.name === "Altro");
        if (altroIndex >= 0) {
          acc[altroIndex]["Posizioni totali"] += totalPositions;
        } else {
          acc.push({
            name: "Altro",
            "Posizioni totali": totalPositions,
          });
        }
      } else {
        // Add non-"Altro" products normally
        acc.push({
          name: product.name,
          "Posizioni totali": totalPositions,
        });
      }
      return acc;
    }, []);

    const columnStats = aggregateTasksByColumn(data.groupedActiveTasks);
    const totalSellPrice = sumSellPriceForActiveTasks(data.activeTasks);
    const totalActualSellPrice = sumSellPriceActualForActiveTasks(
      data.activeTasks
    );
    const totalPositionsLength = sumAllPositionsLengths(data.activeTasks);
    const totalTasksForToday = countTasksWithTodayDelivery(data.activeTasks);
    const totalTasksForThisWeek = countTasksWithDeliveryThisWeek(
      data.activeTasks
    );
    const totalQcDoneToday = countQualityControlsDoneToday(data.activeTasks);
    const monthlyData = aggregateSellProductsByMonth(years, data.history);
    const totalNonEmptyPositions = calculateTotalNonEmptyPositions(
      data.doneTasks,
      years,
      data.history
    );
    const todoProdValue = calculateTodoProdValue(data.tasks);
    const weeklyData = aggregateProductsByWeek(data.tasks, data.history);
    const monthlyTotals = calculateMonthlyTotals(data.tasks, data.history);

    // Create annual chart data for each year
    const annualChartData = years.reduce(
      (acc: { [year: number]: any[] }, year: number) => {
        // Filter tasks for the current year
        const tasksForYear = data.doneTasks.filter((task) => {
          const taskDate = new Date(task.created_at);
          return taskDate.getFullYear() === year;
        });

        // Group tasks by product
        const productGroups = tasksForYear.reduce(
          (groups: { [key: string]: any }, task) => {
            //@ts-ignore
            const productName = task.sellProduct?.name;
            //@ts-ignore
            const productId = task.sellProduct?.id;

            if (productName && productId) {
              if (!groups[productId]) {
                groups[productId] = {
                  name: productName,
                  tasks: [],
                };
              }
              groups[productId].tasks.push(task);
            }
            return groups;
          },
          {}
        );

        // Transform to required format with grouped task counts
        acc[year] = Object.values(productGroups).map((group: any) => {
          const groupedTasks = groupTasksByBaseNumber(group.tasks);
          return {
            name: group.name,
            "Ordini prodotti": Object.keys(groupedTasks).length,
          };
        });

        return acc;
      },
      {}
    );

    return {
      ...data,
      chartData,
      annualChartData,
      columnStats,
      totalSellPrice,
      totalActualSellPrice,
      totalPositionsLength,
      totalTasksForToday,
      totalTasksForThisWeek,
      totalQcDoneToday,
      monthlyData,
      totalNonEmptyPositions,
      todoProdValue,
      weeklyData,
      monthlyTotals,
    };
  };

  const dashboardData = calculateDashboardData(data);

  return (
    // <Structure user={user} titleText="Dashboard">
    <div className="container">
      <Dashboard user={user} data={dashboardData} />
    </div>
    // </Structure>
  );
});
