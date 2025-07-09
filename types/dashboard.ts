import { Data } from "../app/(user)/page";

export interface WeeklyData {
  weekNumber: number;
  totalCount: number;
  products: Array<{
    name: string;
    count: number;
  }>;
  packagingPositions: number;
  totalValue: number;
  remainingToGoal: number;
  percentageOfGoal: number;
}

export interface MonthlyTotals {
  totalValue: number;
  totalCount: number;
}

export interface DashboardData extends Data {
  chartData: any[];
  annualChartData: {
    [year: number]: any[];
  };
  columnStats: any;
  todoProdValue: number;
  totalSellPrice: number;
  totalActualSellPrice: number;
  totalPositionsLength: number;
  totalTasksForToday: number;
  totalTasksForThisWeek: number;
  totalQcDoneToday: number;
  monthlyData: {
    [year: number]: { name: string; count: number }[][];
    packagingTimes: { [key: string]: number };
  };
  totalNonEmptyPositions: { [year: number]: number };
  weeklyData: WeeklyData[];
  monthlyTotals: MonthlyTotals;
}
