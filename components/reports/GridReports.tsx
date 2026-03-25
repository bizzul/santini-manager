"use client";
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DateRangePicker,
  DateRangePickerValue,
} from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PackingControl,
  QualityControl,
  Supplier,
  Task,
} from "@/types/supabase";
import { logger } from "@/lib/logger";
function GridReports({
  suppliers,
  imb,
  qc,
  task,
  domain,
  isAdmin = true,
  enabledModules = [],
}: {
  suppliers: Supplier[];
  imb: PackingControl[];
  qc: QualityControl[];
  task: Task[];
  domain: string;
  isAdmin?: boolean;
  enabledModules?: string[];
}) {
  // Helper to check if a report module is enabled
  const isReportEnabled = (moduleName: string) => {
    if (enabledModules.length === 0) return true; // Show all if no modules passed (backwards compatibility)
    return enabledModules.includes(moduleName);
  };
  const currentYear = new Date().getFullYear();
  const [loadingInventory, setLoadingInventory] = useState(false);
  const lastYear = currentYear - 1;
  const [selectedTimeReportYear, setSelectedTimeReportYear] = useState(
    currentYear.toString(),
  );
  const [selectedTimeReportMonths, setSelectedTimeReportMonths] = useState<
    string[]
  >([]);

  const [supplier, setSupplier] = useState<string>();
  const [selectedTask, setSelectedTask] = useState<any>();

  const [valueError, setValueError] = useState<DateRangePickerValue>({
    from: undefined,
    to: undefined,
  });
  const timeReportYears = Array.from(
    { length: 5 },
    (_, index) => (currentYear - 2 + index).toString(),
  );
  const timeReportMonths = [
    { value: "1", label: "Gennaio" },
    { value: "2", label: "Febbraio" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Aprile" },
    { value: "5", label: "Maggio" },
    { value: "6", label: "Giugno" },
    { value: "7", label: "Luglio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Settembre" },
    { value: "10", label: "Ottobre" },
    { value: "11", label: "Novembre" },
    { value: "12", label: "Dicembre" },
  ];

  const inventoryExcel = async () => {
    try {
      setLoadingInventory(true);
      const res = await fetch("/api/reports/inventory", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // body: JSON.stringify({
        //   someArray: data, // The data you want to send for file generation
        // }),
      });

      if (res.ok) {
        // Create a blob from the response
        const blob = await res.blob();
        // Create a link and set the URL to the blob
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const date = new Date();
        const fileName = `Rapporto_inventario_al_${date.getFullYear()}-${
          date.getMonth() + 1
        }-${date.getDate()}`;
        const fileExtension = ".xlsx";
        link.setAttribute("download", `${fileName}${fileExtension}`); // Set filename for download
        document.body.appendChild(link);
        link.click();
        //@ts-ignore
        link.parentNode.removeChild(link);
        setLoadingInventory(false);
      } else {
        setLoadingInventory(false);
        logger.error("Failed to download file");
      }
    } catch (error) {
      setLoadingInventory(false);
      logger.error("Error exporting to Excel:", error);
    }
  };

  const taskExcel = async () => {
    try {
      const res = await fetch("/api/reports/tasks", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // body: JSON.stringify({
        //   someArray: data, // The data you want to send for file generation
        // }),
      });

      if (res.ok) {
        // Create a blob from the response
        const blob = await res.blob();
        // Create a link and set the URL to the blob
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const date = new Date();
        const fileName = `Rapporto_progetti_al_${date.getFullYear()}-${
          date.getMonth() + 1
        }-${date.getDate()}`;
        const fileExtension = ".xlsx";
        link.setAttribute("download", `${fileName}${fileExtension}`); // Set filename for download
        document.body.appendChild(link);
        link.click();
        //@ts-ignore
        link.parentNode.removeChild(link);
      } else {
        logger.error("Failed to download file");
      }
    } catch (error) {
      logger.error("Error exporting to Excel:", error);
    }
  };

  const preparedValue = (value: DateRangePickerValue) => {
    if (!value.from || !value.to) {
      return value;
    }

    const from = new Date(value.from);
    const to = new Date(value.to);

    // Adjust dates by adding 1 hour
    from.setHours(from.getHours() + 1);
    to.setHours(to.getHours() + 1);
    // Set end time to 23:59
    to.setHours(22);
    to.setMinutes(59);

    return { from, to };
  };

  const toggleTimeReportMonth = (month: string) => {
    setSelectedTimeReportMonths((currentMonths) => {
      if (currentMonths.includes(month)) {
        return currentMonths.filter((currentMonth) => currentMonth !== month);
      }

      return [...currentMonths, month].sort((a, b) => Number(a) - Number(b));
    });
  };

  const timeExcel = async () => {
    try {
      const sortedMonths = selectedTimeReportMonths
        .map((month) => Number(month))
        .sort((a, b) => a - b);

      if (sortedMonths.length === 0) {
        return;
      }

      const res = await fetch("/api/reports/time", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-domain": domain,
        },
        body: JSON.stringify({
          data: {
            year: Number(selectedTimeReportYear),
            months: sortedMonths,
          },
        }),
      });

      if (res.ok) {
        // Create a blob from the response
        const blob = await res.blob();
        // Create a link and set the URL to the blob
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const monthPart = sortedMonths.map((month) =>
          String(month).padStart(2, "0")
        ).join("_");
        const fileName =
          `Report_ore_${selectedTimeReportYear}_mesi_${monthPart}`;
        const fileExtension = ".xlsx";
        link.setAttribute("download", `${fileName}${fileExtension}`); // Set filename for download
        document.body.appendChild(link);
        link.click();
        //@ts-ignore
        link.parentNode.removeChild(link);
      } else {
        logger.error("Failed to download file");
      }
    } catch (error) {
      logger.error("Error exporting to Excel:", error);
    }
  };

  const errorsExcel = async (
    value: DateRangePickerValue,
    supplier: string | undefined
  ) => {
    try {
      let supplierName = null;
      if (supplier) {
        supplierName = suppliers.filter((sup) => sup.id == Number(supplier));
      }

      const res = await fetch("/api/reports/errors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: { value: preparedValue(value), supplier },
        }),
      });

      if (res.ok) {
        // Create a blob from the response
        const blob = await res.blob();
        // Create a link and set the URL to the blob
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const fileName = `Report_errori_dal_${value.from!.getFullYear()}-${(
          "0" +
          (value.from!.getMonth() + 1)
        ).slice(-2)}-${("0" + value.from!.getDate()).slice(
          -2
        )}_al_${value.to!.getFullYear()}-${(
          "0" +
          (value.to!.getMonth() + 1)
        ).slice(-2)}-${("0" + value.to!.getDate()).slice(-2)}${
          supplierName !== null ? "_" + supplierName[0].name : ""
        }`;
        const fileExtension = ".xlsx";
        link.setAttribute("download", `${fileName}${fileExtension}`); // Set filename for download
        document.body.appendChild(link);
        link.click();
        //@ts-ignore
        link.parentNode.removeChild(link);
      } else {
        logger.error("Failed to download file");
      }
    } catch (error) {
      logger.error("Error exporting to Excel:", error);
    }
  };

  const imbPDF = async (task: number) => {
    try {
      let imballaggioData: any = null;
      if (task) {
        //@ts-ignore
        imballaggioData = imb.filter((q) => q.task?.id == Number(task));
      }

      const res = await fetch("/api/reports/imb", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: { imballaggioData, task },
        }),
      });

      if (res.ok) {
        // Create a blob from the response
        const blob = await res.blob();
        // Create a link and set the URL to the blob
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const fileName = `Imballaggio_Progetto_${task}`;
        const fileExtension = ".pdf";
        link.setAttribute("download", `${fileName}${fileExtension}`); // Set filename for download
        document.body.appendChild(link);
        link.click();
        //@ts-ignore
        link.parentNode.removeChild(link);
      } else {
        logger.error("Failed to download file");
      }
    } catch (error) {
      logger.error("Error exporting to Excel:", error);
    }
  };

  const imbQC = async () => {
    try {
      const res = await fetch("/api/reports/imbQC", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const date = new Date();
        // Create a blob from the response
        const blob = await res.blob();
        // Create a link and set the URL to the blob
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const fileName = `Report_imballaggio_QC_al_${date.getFullYear()}`;
        const fileExtension = ".xlsx";
        link.setAttribute("download", `${fileName}${fileExtension}`); // Set filename for download
        document.body.appendChild(link);
        link.click();
        //@ts-ignore
        link.parentNode.removeChild(link);
      } else {
        logger.error("Failed to download file");
      }
    } catch (error) {
      logger.error("Error exporting to Excel:", error);
    }
  };

  return (
    <div className="flex flex-wrap gap-4">
      {isReportEnabled("report-inventory") && (
        <Card>
          <CardHeader>
            <CardTitle>Inventario</CardTitle>
            <CardDescription>Situazione inventario attuale</CardDescription>
          </CardHeader>

          <CardFooter>
            <Button
              disabled={loadingInventory}
              onClick={inventoryExcel}
              variant="default"
            >
              Scarica
            </Button>
          </CardFooter>
        </Card>
      )}

      {isReportEnabled("report-projects") && (
        <Card>
          <CardHeader>
            <CardTitle>Progetti</CardTitle>
            <CardDescription>Situazione progetti attuali</CardDescription>
          </CardHeader>

          <CardFooter>
            <Button onClick={taskExcel} variant="default">
              Scarica
            </Button>
          </CardFooter>
        </Card>
      )}

      {isReportEnabled("report-time") && (
        <Card>
          <CardHeader>
            <CardTitle>Ore</CardTitle>
            <CardDescription>
              {isAdmin
                ? "Report ore di tutti i collaboratori"
                : "Report delle tue ore lavorate"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Select
                value={selectedTimeReportYear}
                onValueChange={setSelectedTimeReportYear}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona anno" />
                </SelectTrigger>
                <SelectContent>
                  {timeReportYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="space-y-2">
                <div className="text-sm font-medium">Mesi</div>
                <div className="grid grid-cols-2 gap-2">
                  {timeReportMonths.map((month) => (
                    <button
                      key={month.value}
                      type="button"
                      onClick={() => toggleTimeReportMonth(month.value)}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm"
                    >
                      <Checkbox
                        className="pointer-events-none"
                        checked={selectedTimeReportMonths.includes(month.value)}
                        aria-hidden="true"
                      />
                      <span>{month.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Seleziona uno o piu mesi dello stesso anno.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={timeExcel}
              disabled={selectedTimeReportMonths.length === 0}
              variant="default"
            >
              Scarica
            </Button>
          </CardFooter>
        </Card>
      )}

      {isReportEnabled("report-errors") && (
        <Card className="md:w-2/5">
          <CardHeader>
            <CardTitle>Errori</CardTitle>
            <CardDescription>Errori per fornitore / data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="pb-4">
              <Select value={supplier} onValueChange={setSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona fornitore" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DateRangePicker
              className="max-w-md"
              value={valueError}
              onValueChange={setValueError}
              presets={[
                {
                  key: "ytd",
                  label: "Anno precedente",
                  from: new Date(lastYear, 0, 1),
                  to: new Date(lastYear, 11, 31),
                },
                {
                  key: "half",
                  label: "Primo semestre",
                  from: new Date(currentYear, 0, 1),
                  to: new Date(currentYear, 5, 31),
                },
              ]}
            />
          </CardContent>
          <CardFooter>
            <Button
              disabled={
                valueError.from == undefined || valueError.to == undefined
              }
              onClick={() => errorsExcel(valueError, supplier)}
              variant="default"
            >
              Scarica
            </Button>
          </CardFooter>
        </Card>
      )}

      {isReportEnabled("report-imb") && (
        <Card className="md:w-2/5">
          <CardHeader>
            <CardTitle>PDF Imballaggio</CardTitle>
            <CardDescription>Imballaggio per progetto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="pb-4">
              <Select value={selectedTask} onValueChange={setSelectedTask}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona progetto" />
                </SelectTrigger>
                <SelectContent>
                  {task.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.unique_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              disabled={selectedTask == undefined}
              onClick={() => imbPDF(selectedTask)}
              variant="default"
            >
              Scarica
            </Button>
          </CardFooter>
        </Card>
      )}

      {isReportEnabled("report-imb") && (
        <Card className="md:w-2/5">
          <CardHeader>
            <CardTitle>Report Imballaggio / QC</CardTitle>
            <CardDescription>Report interno</CardDescription>
          </CardHeader>

          <CardFooter>
            <Button onClick={imbQC} variant="default">
              Scarica
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

export default GridReports;
