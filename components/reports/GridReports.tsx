"use client";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  DateRangePicker,
  DateRangePickerItem,
  DateRangePickerValue,
} from "@tremor/react";
import { itCH } from "date-fns/locale";
import { useState } from "react";
import { SearchSelect, SearchSelectItem } from "@tremor/react";
import { PackingControl, QualityControl, Supplier, Task } from "@/types/supabase";
function GridReports({
  suppliers,
  imb,
  qc,
  task,
}: {
  suppliers: Supplier[];
  imb: PackingControl[];
  qc: QualityControl[];
  task: Task[];
}) {
  const currentYear = new Date().getFullYear();
  const [loadingInventory, setLoadingInventory] = useState(false);
  const lastYear = currentYear - 1;
  const [value, setValue] = useState<DateRangePickerValue>({
    from: undefined,
    to: undefined,
  });

  const [supplier, setSupplier] = useState<string>();
  const [selectedTask, setSelectedTask] = useState<any>();

  const [valueError, setValueError] = useState<DateRangePickerValue>({
    from: undefined,
    to: undefined,
  });

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
        console.error("Failed to download file");
      }
    } catch (error) {
      setLoadingInventory(false);
      console.error("Error exporting to Excel:", error);
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
        console.error("Failed to download file");
      }
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    }
  };

  const preparedValue = (value: any) => {
    // Adjust dates by adding 1 hour
    value.from.setHours(value.from.getHours() + 1);
    value.to.setHours(value.to.getHours() + 1);
    // Set end time to 23:59
    value.to.setHours(22);
    value.to.setMinutes(59);

    return value;
  };

  const timeExcel = async (value: DateRangePickerValue) => {
    try {
      console.log("preparedValues", preparedValue(value));
      const res = await fetch("/api/reports/time", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: preparedValue(value),
        }),
      });

      if (res.ok) {
        // Create a blob from the response
        const blob = await res.blob();
        // Create a link and set the URL to the blob
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const fileName = `Report_ore_dal_${value.from!.getFullYear()}-${(
          "0" +
          (value.from!.getMonth() + 1)
        ).slice(-2)}-${("0" + value.from!.getDate()).slice(
          -2
        )}_al_${value.to!.getFullYear()}-${(
          "0" +
          (value.to!.getMonth() + 1)
        ).slice(-2)}-${("0" + value.to!.getDate()).slice(-2)}`;
        const fileExtension = ".xlsx";
        link.setAttribute("download", `${fileName}${fileExtension}`); // Set filename for download
        document.body.appendChild(link);
        link.click();
        //@ts-ignore
        link.parentNode.removeChild(link);
      } else {
        console.error("Failed to download file");
      }
    } catch (error) {
      console.error("Error exporting to Excel:", error);
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
        console.error("Failed to download file");
      }
    } catch (error) {
      console.error("Error exporting to Excel:", error);
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
        console.error("Failed to download file");
      }
    } catch (error) {
      console.error("Error exporting to Excel:", error);
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
        console.error("Failed to download file");
      }
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    }
  };

  return (
    <div className="flex flex-wrap gap-4">
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

      <Card>
        <CardHeader>
          <CardTitle>Ore</CardTitle>
          <CardDescription>Situazione ore periodo selezioanto</CardDescription>
        </CardHeader>
        <CardContent>
          <DateRangePicker
            className="max-w-md mx-auto"
            value={value}
            onValueChange={setValue}
            locale={itCH}
            selectPlaceholder="Periodi"
            
            color="neutral"
            // maxDate={new Date()}
            weekStartsOn={1}
          >
            <DateRangePickerItem
              key="ytd"
              value="ytd"
              from={new Date(lastYear, 0, 1)}
              to={new Date(lastYear, 11, 31)}
            >
              Anno precedente
            </DateRangePickerItem>
            <DateRangePickerItem
              key="half"
              value="half"
              from={new Date(currentYear, 0, 1)}
              to={new Date(currentYear, 5, 31)}
            >
              Primo trimestre
            </DateRangePickerItem>
          </DateRangePicker>
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => timeExcel(value)}
            disabled={value.from == undefined || value.to == undefined}
            variant="default"
          >
            Scarica
          </Button>
        </CardFooter>
      </Card>

      <Card className="md:w-2/5">
        <CardHeader>
          <CardTitle>Errori</CardTitle>
          <CardDescription>Errori per fornitore / data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="pb-4">
            <SearchSelect
              
              value={supplier}
              onValueChange={setSupplier}
              enableClear
            >
              {suppliers.map((supplier) => (
                <SearchSelectItem
                  key={supplier.id}
                  value={supplier.id.toString()}
                >
                  {supplier.name}
                </SearchSelectItem>
              ))}
            </SearchSelect>
          </div>
          <DateRangePicker
            className="max-w-md"
            value={valueError}
            onValueChange={setValueError}
            locale={itCH}
            selectPlaceholder="Periodi"
            
            color="neutral"
            weekStartsOn={1}
          >
            <DateRangePickerItem
              key="ytd"
              value="ytd"
              from={new Date(lastYear, 0, 1)}
              to={new Date(lastYear, 11, 31)}
            >
              Anno precedente
            </DateRangePickerItem>
            <DateRangePickerItem
              key="half"
              value="half"
              from={new Date(currentYear, 0, 1)}
              to={new Date(currentYear, 5, 31)}
            >
              Primo trimestre
            </DateRangePickerItem>
          </DateRangePicker>
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

      <Card className="md:w-2/5">
        <CardHeader>
          <CardTitle>PDF Imballaggio</CardTitle>
          <CardDescription>Imballaggio per progetto</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="pb-4">
            <SearchSelect
              
              value={selectedTask}
              onValueChange={setSelectedTask}
              enableClear
            >
              {task.map((t) => (
                <SearchSelectItem key={t.id} value={t.id.toString()}>
                  {t.unique_code}
                </SearchSelectItem>
              ))}
            </SearchSelect>
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
    </div>
  );
}

export default GridReports;
