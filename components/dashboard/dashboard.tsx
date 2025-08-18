"use client";
import React, { useState } from "react";
import {
  Card,
  Grid,
  Title,
  Text,
  Tab,
  TabList,
  TabGroup,
  TabPanel,
  TabPanels,
} from "@tremor/react";
import { BarChart, BarList } from "@tremor/react";
import { DashboardData } from "../../types/dashboard";

// Define User type for Supabase authentication
interface User {
  id: string;
  email?: string;
  nickname?: string;
  name?: string;
}

type Props = {
  user: User;
  data: DashboardData;
};

const usNumberformatter = (number: number, decimals = 0) =>
  Intl.NumberFormat("fr-CH", {
    style: "currency",
    currency: "CHF",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
    .format(Number(number))
    .toString();

function Dashboard({ user, data }: Props) {
  const dataFormatter = (number: number) =>
    Intl.NumberFormat("fr-CH").format(number).toString();

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  );

  return (
    <main className="px-2 py-4">
      <Title className="text-4xl font-light ">
        {user && (
          <>
            Ciao <span className="font-bold">{user.nickname}</span>
          </>
        )}
      </Title>

      <TabGroup className="mt-6">
        <TabList>
          <Tab>Produzione</Tab>
          <Tab>Settimanale</Tab>
          <Tab>Annuale</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Grid numItemsMd={2} numItemsLg={2} className="mt-6 gap-6">
              <Card>
                <div className="truncate">
                  <Text>Posizioni in produzione</Text>
                </div>
                <BarChart
                  data={data.chartData}
                  index="name"
                  categories={["Posizioni totali"]}
                  colors={["blue"]}
                  valueFormatter={dataFormatter}
                  yAxisWidth={20}
                  rotateLabelX={{
                    angle: 90,
                    xAxisHeight: 120,
                    verticalShift: 60,
                  }}
                />
              </Card>

              <Card>
                <div className="truncate">
                  <Text>Dettaglio ordini in produzione</Text>
                  {/* <Metric className="truncate">{item.metric}</Metric> */}
                </div>
                <BarList data={data.columnStats} className="pt-4" />
              </Card>
            </Grid>
            <Grid numItemsMd={3} numItemsLg={3} className="mt-6 gap-6">
              <Card className="" decoration="top" decorationColor="indigo">
                <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                  Valore ordini da produrre
                </p>
                <p className="text-3xl text-tremor-content-strong dark:text-dark-tremor-content-strong font-semibold">
                  {usNumberformatter(data.todoProdValue)}
                </p>
              </Card>
              <Card className="" decoration="top" decorationColor="indigo">
                <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                  Valore attuale in produzione
                </p>
                <p className="text-3xl text-tremor-content-strong dark:text-dark-tremor-content-strong font-semibold">
                  {usNumberformatter(data.totalActualSellPrice)}
                </p>
              </Card>
              <Card className="" decoration="top" decorationColor="indigo">
                <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                  Valore totale fine produzione
                </p>
                <p className="text-3xl text-tremor-content-strong dark:text-dark-tremor-content-strong font-semibold">
                  {usNumberformatter(data.totalSellPrice)}
                </p>
              </Card>

              <Card className="" decoration="top" decorationColor="indigo">
                <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                  Ordini in produzione
                </p>
                <p className="text-3xl text-tremor-content-strong dark:text-dark-tremor-content-strong font-semibold">
                  {data.groupedActiveTasks.length}
                </p>
              </Card>
              <Card className="" decoration="top" decorationColor="indigo">
                <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                  Pezzi in produzione
                </p>
                <p className="text-3xl text-tremor-content-strong dark:text-dark-tremor-content-strong font-semibold">
                  {data.totalPositionsLength}
                </p>
              </Card>
              <Card className="" decoration="top" decorationColor="indigo">
                <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                  Ordini stoccati
                </p>
                <p className="text-3xl text-tremor-content-strong dark:text-dark-tremor-content-strong font-semibold">
                  {data.stockedTasks.length}
                </p>
              </Card>
            </Grid>

            <Grid numItemsMd={3} numItemsLg={3} className="mt-6 gap-6">
              <Card className="" decoration="top" decorationColor="indigo">
                <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                  Ordini con spedizione oggi
                </p>
                <p className="text-3xl text-tremor-content-strong dark:text-dark-tremor-content-strong font-semibold">
                  {data.totalTasksForToday} / {data.groupedActiveTasks.length}
                </p>
              </Card>
              <Card className="" decoration="top" decorationColor="indigo">
                <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                  Ordini con spedizione questa settimana
                </p>
                <p className="text-3xl text-tremor-content-strong dark:text-dark-tremor-content-strong font-semibold">
                  {data.totalTasksForThisWeek} /{" "}
                  {data.groupedActiveTasks.length}
                </p>
              </Card>
              <Card className="" decoration="top" decorationColor="indigo">
                <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                  Pezzi completati oggi
                </p>
                <p className="text-3xl text-tremor-content-strong dark:text-dark-tremor-content-strong font-semibold">
                  {data.totalQcDoneToday}
                </p>
              </Card>
            </Grid>
          </TabPanel>
          <TabPanel>
            <div className="mt-6">
              <Card className="mb-6" decoration="top" decorationColor="indigo">
                <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                  Valore totale mese corrente
                </p>
                <p className="text-3xl text-tremor-content-strong dark:text-dark-tremor-content-strong font-semibold">
                  {usNumberformatter(data.monthlyTotals.totalValue)}
                </p>
              </Card>

              <Grid numItemsMd={2} numItemsLg={2} className="gap-6">
                {data.weeklyData.map((weekData, index) => (
                  <Card key={index}>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Text>
                          Settimana {weekData.weekNumber} -{" "}
                          {weekData.totalCount} Pezzi finiti
                          <span className="ml-2 text-blue-600">
                            ({weekData.packagingPositions} pezzi imballati)
                          </span>
                        </Text>

                        {/* Progress towards weekly goal */}
                        <Text className="font-semibold">
                          <span className="font-light">
                            Valore prodotto settimana:
                          </span>{" "}
                          {usNumberformatter(weekData.totalValue)}
                        </Text>
                      </div>

                      <div className="space-y-1">
                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all duration-500"
                            style={{
                              width: `${Math.min(
                                weekData.percentageOfGoal,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                        <Text className="text-sm text-gray-500">
                          {weekData.remainingToGoal > 0
                            ? `Valore rimanente da produrre: ${usNumberformatter(
                                weekData.remainingToGoal
                              )}`
                            : "Obiettivo raggiunto! 🎉"}
                        </Text>
                      </div>

                      <BarChart
                        data={weekData.products.map((product) => ({
                          name: product.name,
                          "Pezzi prodotti": product.count,
                        }))}
                        index="name"
                        categories={["Pezzi prodotti"]}
                        colors={["blue"]}
                        valueFormatter={dataFormatter}
                        yAxisWidth={20}
                        rotateLabelX={{
                          angle: 90,
                          xAxisHeight: 120,
                          verticalShift: 60,
                        }}
                      />
                    </div>
                  </Card>
                ))}
              </Grid>
            </div>
          </TabPanel>
          <TabPanel>
            <div className="mt-6">
              <div className="mb-6">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-4 py-2 border rounded-lg"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <Card>
                <div className="truncate">
                  <Text>Ordini Prodotti (Anno {selectedYear})</Text>
                </div>
                <BarChart
                  data={data.annualChartData[selectedYear] || []}
                  index="name"
                  categories={["Ordini prodotti"]}
                  colors={["blue"]}
                  valueFormatter={dataFormatter}
                  yAxisWidth={20}
                  rotateLabelX={{
                    angle: 90,
                    xAxisHeight: 120,
                    verticalShift: 60,
                  }}
                />
              </Card>
              <Card className="mt-6" decoration="top" decorationColor="indigo">
                <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                  Pezzi prodotti totale ({selectedYear})
                </p>
                <p className="text-3xl text-tremor-content-strong dark:text-dark-tremor-content-strong font-semibold">
                  {data.totalNonEmptyPositions[selectedYear] || 0}
                </p>
              </Card>

              <Grid numItemsMd={3} numItemsLg={3} className="mt-6 gap-6">
                {(data.monthlyData[selectedYear] || []).map(
                  (dataForMonth, index) => {
                    const totalPiecesForMonth = dataForMonth.reduce(
                      (total, item) => total + item.count,
                      0
                    );

                    const chartData = dataForMonth.map((item) => ({
                      name: item.name,
                      "Pezzi prodotti": item.count,
                    }));

                    const monthName = new Date(
                      selectedYear,
                      index
                    ).toLocaleString("default", { month: "long" });

                    return (
                      <Card key={index}>
                        <h2>
                          {monthName} - {totalPiecesForMonth} Pezzi finiti
                        </h2>
                        <BarChart
                          data={chartData}
                          index="name"
                          categories={["Pezzi prodotti"]}
                          colors={["blue"]}
                          valueFormatter={dataFormatter}
                          yAxisWidth={20}
                          rotateLabelX={{
                            angle: 90,
                            xAxisHeight: 120,
                            verticalShift: 60,
                          }}
                        />
                      </Card>
                    );
                  }
                )}
              </Grid>
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </main>
  );
}

export default Dashboard;
