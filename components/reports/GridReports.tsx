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
import { Badge } from "@/components/ui/badge";
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
  Client,
  PackingControl,
  QualityControl,
  SellProduct,
  Supplier,
  Task,
} from "@/types/supabase";
import { logger } from "@/lib/logger";
import { downloadResponseFile } from "@/lib/download-response-file";
import { ReportMultiSelect } from "@/components/reports/ReportMultiSelect";

type ReportUser = {
  id: number;
  authId?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  initials?: string;
};

type ExportFormat = "excel" | "pdf";
type ReportInventoryCategory = {
  id: string;
  name: string;
  description?: string;
  color?: string | null;
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">{children}</div>
    </section>
  );
}

function ReportCard({
  title,
  description,
  formats,
  footer,
  children,
  className,
}: {
  title: string;
  description: string;
  formats: string[];
  footer: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            {formats.map((format) => (
              <Badge key={format} variant="outline">
                {format}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
      <CardFooter>{footer}</CardFooter>
    </Card>
  );
}

function GridReports({
  suppliers,
  imb,
  qc,
  task,
  inventoryCategories = [],
  clients = [],
  sellProducts = [],
  users = [],
  domain,
  isAdmin = true,
  enabledModules = [],
}: {
  suppliers: Supplier[];
  imb: PackingControl[];
  qc: QualityControl[];
  task: Task[];
  inventoryCategories?: ReportInventoryCategory[];
  clients?: Client[];
  sellProducts?: SellProduct[];
  users?: ReportUser[];
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
  const [selectedInventoryCategoryIds, setSelectedInventoryCategoryIds] =
    useState<string[]>([]);
  const [selectedProjectProductIds, setSelectedProjectProductIds] = useState<
    string[]
  >([]);
  const [selectedProjectAreaIds, setSelectedProjectAreaIds] = useState<string[]>(
    [],
  );
  const [selectedTimeUserIds, setSelectedTimeUserIds] = useState<string[]>([]);
  const [selectedConsuntivoTaskIds, setSelectedConsuntivoTaskIds] = useState<
    string[]
  >([]);
  const [selectedClientId, setSelectedClientId] = useState<string>();
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string>();
  const [suppliersFormat, setSuppliersFormat] = useState<ExportFormat>("excel");
  const [clientFormat, setClientFormat] = useState<ExportFormat>("pdf");
  const [collaboratorFormat, setCollaboratorFormat] =
    useState<ExportFormat>("pdf");
  const [consuntivoFormat, setConsuntivoFormat] =
    useState<ExportFormat>("excel");

  const [supplier, setSupplier] = useState<string>();
  const [selectedTask, setSelectedTask] = useState<any>();
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingTime, setLoadingTime] = useState(false);
  const [loadingErrors, setLoadingErrors] = useState(false);
  const [loadingImbPdf, setLoadingImbPdf] = useState(false);
  const [loadingImbQc, setLoadingImbQc] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingConsuntivo, setLoadingConsuntivo] = useState(false);
  const [loadingClient, setLoadingClient] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);

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

  const formatDateForFilename = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;

  const inventoryCategoryOptions = inventoryCategories.map((category) => ({
    value: String(category.id),
    label: category.name,
    description: category.description || undefined,
  }));

  const projectProductOptions = sellProducts.map((product) => ({
    value: String(product.id),
    label: product.name || `Prodotto ${product.id}`,
    description: [product.type, product.category?.name].filter(Boolean).join(" • "),
  }));

  const projectAreaOptions = Array.from(
    task.reduce((map, currentTask: any) => {
      const areaId = currentTask.kanban?.id || currentTask.kanbanId;
      const areaLabel =
        currentTask.kanban?.title ||
        currentTask.kanban?.name ||
        "Area non definita";

      if (areaId && !map.has(String(areaId))) {
        map.set(String(areaId), {
          value: String(areaId),
          label: areaLabel,
          description: "Area progetto",
        });
      }
      return map;
    }, new Map<string, { value: string; label: string; description?: string }>()),
  ).map(([, option]) => option);

  const userOptions = users.map((user) => ({
    value: String(user.id),
    label:
      `${user.given_name || ""} ${user.family_name || ""}`.trim() ||
      user.email ||
      `Utente ${user.id}`,
    description: [user.initials, user.email].filter(Boolean).join(" • "),
  }));

  const clientOptions = clients.map((client) => ({
    value: String(client.id),
    label:
      client.businessName ||
      `${client.individualLastName || ""} ${client.individualFirstName || ""}`.trim() ||
      `Cliente ${client.id}`,
    description: [client.email, client.city].filter(Boolean).join(" • "),
  }));

  const taskOptions = task.map((project: any) => ({
    value: String(project.id),
    label: project.unique_code || project.name || `Progetto ${project.id}`,
    description: [
      project.Client?.businessName ||
        `${project.Client?.individualLastName || ""} ${project.Client?.individualFirstName || ""}`.trim(),
      project.kanban?.title || project.kanban?.name,
    ]
      .filter(Boolean)
      .join(" • "),
  }));

  const getFileNameWithExtension = (
    baseName: string,
    format: ExportFormat,
    fallbackExtension: "xlsx" | "pdf" = "xlsx",
  ) => {
    const extension = format === "pdf" ? "pdf" : fallbackExtension;
    return `${baseName}.${extension}`;
  };

  const inventoryExcel = async () => {
    try {
      setLoadingInventory(true);
      const res = await fetch("/api/reports/inventory", {
        method: selectedInventoryCategoryIds.length > 0 ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          "x-site-domain": domain,
        },
        body:
          selectedInventoryCategoryIds.length > 0
            ? JSON.stringify({
                categoryIds: selectedInventoryCategoryIds,
              })
            : undefined,
      });

      if (res.ok) {
        const date = new Date();
        await downloadResponseFile(
          res,
          `Report_inventario_al_${formatDateForFilename(date)}.xlsx`,
        );
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
      setLoadingProjects(true);
      const res = await fetch("/api/reports/tasks", {
        method:
          selectedProjectProductIds.length > 0 || selectedProjectAreaIds.length > 0
            ? "POST"
            : "GET",
        headers: {
          "Content-Type": "application/json",
          "x-site-domain": domain,
        },
        body:
          selectedProjectProductIds.length > 0 || selectedProjectAreaIds.length > 0
            ? JSON.stringify({
                productIds: selectedProjectProductIds,
                areaIds: selectedProjectAreaIds,
              })
            : undefined,
      });

      if (res.ok) {
        const date = new Date();
        await downloadResponseFile(
          res,
          `Report_progetti_al_${formatDateForFilename(date)}.xlsx`,
        );
      } else {
        logger.error("Failed to download file");
      }
    } catch (error) {
      logger.error("Error exporting to Excel:", error);
    } finally {
      setLoadingProjects(false);
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
      setLoadingTime(true);
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
            userIds: isAdmin ? selectedTimeUserIds.map((id) => Number(id)) : [],
          },
        }),
      });

      if (res.ok) {
        const monthPart = sortedMonths.map((month) =>
          String(month).padStart(2, "0")
        ).join("_");
        await downloadResponseFile(
          res,
          `Report_ore_${selectedTimeReportYear}_mesi_${monthPart}.xlsx`,
        );
      } else {
        logger.error("Failed to download file");
      }
    } catch (error) {
      logger.error("Error exporting to Excel:", error);
    } finally {
      setLoadingTime(false);
    }
  };

  const errorsExcel = async (
    value: DateRangePickerValue,
    supplier: string | undefined
  ) => {
    try {
      setLoadingErrors(true);
      let supplierName: string | null = null;
      if (supplier && supplier !== "all") {
        supplierName =
          suppliers.find((sup) => sup.id == Number(supplier))?.name || null;
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
        const fileName = `Report_errori_dal_${value.from!.getFullYear()}-${(
          "0" +
          (value.from!.getMonth() + 1)
        ).slice(-2)}-${("0" + value.from!.getDate()).slice(
          -2
        )}_al_${value.to!.getFullYear()}-${(
          "0" +
          (value.to!.getMonth() + 1)
        ).slice(-2)}-${("0" + value.to!.getDate()).slice(-2)}${
          supplierName ? "_" + supplierName : ""
        }`;
        await downloadResponseFile(res, `${fileName}.xlsx`);
      } else {
        logger.error("Failed to download file");
      }
    } catch (error) {
      logger.error("Error exporting to Excel:", error);
    } finally {
      setLoadingErrors(false);
    }
  };

  const imbPDF = async (task: number) => {
    try {
      setLoadingImbPdf(true);
      let imballaggioData: any = null;
      if (task) {
        //@ts-ignore
        imballaggioData = imb.filter((q) => q.task?.id == Number(task));
      }

      const res = await fetch("/api/reports/imb", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-domain": domain,
        },
        body: JSON.stringify({
          data: { imballaggioData, task },
        }),
      });

      if (res.ok) {
        await downloadResponseFile(res, `report-imballaggio-${task}.pdf`);
      } else {
        logger.error("Failed to download file");
      }
    } catch (error) {
      logger.error("Error exporting to Excel:", error);
    } finally {
      setLoadingImbPdf(false);
    }
  };

  const imbQC = async () => {
    try {
      setLoadingImbQc(true);
      const res = await fetch("/api/reports/imbQC", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-site-domain": domain,
        },
      });

      if (res.ok) {
        const date = new Date();
        await downloadResponseFile(
          res,
          `Report_imballaggio_qc_al_${formatDateForFilename(date)}.xlsx`,
        );
      } else {
        logger.error("Failed to download file");
      }
    } catch (error) {
      logger.error("Error exporting to Excel:", error);
    } finally {
      setLoadingImbQc(false);
    }
  };

  const productsExcel = async () => {
    try {
      setLoadingProducts(true);
      const res = await fetch("/api/reports/products", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-site-domain": domain,
        },
      });

      if (res.ok) {
        await downloadResponseFile(
          res,
          `Report_prodotti_al_${formatDateForFilename(new Date())}.xlsx`,
        );
      } else {
        logger.error("Failed to download products export");
      }
    } catch (error) {
      logger.error("Error exporting products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const consuntivoExport = async () => {
    try {
      setLoadingConsuntivo(true);
      const res = await fetch("/api/reports/project-consuntivo-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-domain": domain,
        },
        body: JSON.stringify({
          taskIds: selectedConsuntivoTaskIds.map((id) => Number(id)),
          format: consuntivoFormat,
        }),
      });

      if (res.ok) {
        await downloadResponseFile(
          res,
          getFileNameWithExtension(
            `Report_consuntivo_${formatDateForFilename(new Date())}`,
            consuntivoFormat,
          ),
        );
      } else {
        logger.error("Failed to download consuntivo export");
      }
    } catch (error) {
      logger.error("Error exporting consuntivo:", error);
    } finally {
      setLoadingConsuntivo(false);
    }
  };

  const clientExport = async () => {
    try {
      if (!selectedClientId) return;
      setLoadingClient(true);
      const res = await fetch("/api/reports/client", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-domain": domain,
        },
        body: JSON.stringify({
          clientId: Number(selectedClientId),
          format: clientFormat,
        }),
      });

      if (res.ok) {
        await downloadResponseFile(
          res,
          getFileNameWithExtension(`Scheda_cliente_${selectedClientId}`, clientFormat),
        );
      } else {
        logger.error("Failed to download client export");
      }
    } catch (error) {
      logger.error("Error exporting client:", error);
    } finally {
      setLoadingClient(false);
    }
  };

  const suppliersExport = async () => {
    try {
      setLoadingSuppliers(true);
      const res = await fetch("/api/reports/suppliers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-domain": domain,
        },
        body: JSON.stringify({
          format: suppliersFormat,
        }),
      });

      if (res.ok) {
        await downloadResponseFile(
          res,
          getFileNameWithExtension(
            `Fornitori_${formatDateForFilename(new Date())}`,
            suppliersFormat,
          ),
        );
      } else {
        logger.error("Failed to download suppliers export");
      }
    } catch (error) {
      logger.error("Error exporting suppliers:", error);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const collaboratorsExport = async () => {
    try {
      if (!selectedCollaboratorId) return;
      setLoadingCollaborators(true);
      const res = await fetch("/api/reports/collaborators", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-domain": domain,
        },
        body: JSON.stringify({
          userId: Number(selectedCollaboratorId),
          format: collaboratorFormat,
        }),
      });

      if (res.ok) {
        await downloadResponseFile(
          res,
          getFileNameWithExtension(
            `Collaboratore_${selectedCollaboratorId}`,
            collaboratorFormat,
          ),
        );
      } else {
        logger.error("Failed to download collaborator export");
      }
    } catch (error) {
      logger.error("Error exporting collaborator:", error);
    } finally {
      setLoadingCollaborators(false);
    }
  };

  return (
    <div className="space-y-8">
      <Section
        title="Report operativi"
        description="Esporta inventario, progetti, ore ed errori con filtri mirati per il sito corrente."
      >
        {isReportEnabled("report-inventory") && (
          <ReportCard
            title="Inventario"
            description="Scarica il riepilogo completo dell'inventario con foglio totale e un foglio dedicato per ogni categoria."
            formats={["Excel"]}
            footer={
              <Button
                disabled={loadingInventory}
                onClick={inventoryExcel}
                variant="default"
              >
                Scarica inventario
              </Button>
            }
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Categorie inventario</div>
                <ReportMultiSelect
                  options={inventoryCategoryOptions}
                  value={selectedInventoryCategoryIds}
                  onValueChange={setSelectedInventoryCategoryIds}
                  placeholder="Tutte le categorie"
                  emptyMessage="Nessuna categoria inventario trovata."
                />
                <p className="text-xs text-muted-foreground">
                  Se non selezioni nulla viene esportato l'inventario completo del sito.
                </p>
              </div>
            </div>
          </ReportCard>
        )}

        {isReportEnabled("report-projects") && (
          <ReportCard
            title="Progetti"
            description="Esporta solo i progetti del sito loggato con foglio completo e un foglio dedicato per ogni area."
            formats={["Excel"]}
            footer={
              <Button
                onClick={taskExcel}
                variant="default"
                disabled={loadingProjects}
              >
                Scarica progetti
              </Button>
            }
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Tipologia progetto</div>
                <ReportMultiSelect
                  options={projectProductOptions}
                  value={selectedProjectProductIds}
                  onValueChange={setSelectedProjectProductIds}
                  placeholder="Tutti i prodotti"
                  emptyMessage="Nessun prodotto disponibile."
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Aree progetto</div>
                <ReportMultiSelect
                  options={projectAreaOptions}
                  value={selectedProjectAreaIds}
                  onValueChange={setSelectedProjectAreaIds}
                  placeholder="Tutte le aree"
                  emptyMessage="Nessuna area disponibile."
                />
              </div>
            </div>
          </ReportCard>
        )}

        {isReportEnabled("report-time") && (
          <ReportCard
            title="Ore"
            description={
              isAdmin
                ? "Report ore per tutti i collaboratori o per una selezione specifica."
                : "Report delle tue ore lavorate."
            }
            formats={["Excel"]}
            footer={
              <Button
                onClick={timeExcel}
                disabled={selectedTimeReportMonths.length === 0 || loadingTime}
                variant="default"
              >
                Scarica ore
              </Button>
            }
          >
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

              {isAdmin ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Collaboratori</div>
                  <ReportMultiSelect
                    options={userOptions}
                    value={selectedTimeUserIds}
                    onValueChange={setSelectedTimeUserIds}
                    placeholder="Tutti i collaboratori"
                    emptyMessage="Nessun collaboratore disponibile."
                  />
                </div>
              ) : null}

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
          </ReportCard>
        )}

        {isReportEnabled("report-errors") && (
          <ReportCard
            title="Errori"
            description="Esporta errori filtrati per fornitore e intervallo date."
            formats={["Excel"]}
            footer={
              <Button
                disabled={
                  valueError.from == undefined ||
                  valueError.to == undefined ||
                  loadingErrors
                }
                onClick={() => errorsExcel(valueError, supplier)}
                variant="default"
              >
                Scarica errori
              </Button>
            }
          >
            <div className="space-y-4">
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
            </div>
          </ReportCard>
        )}
      </Section>

      <Section
        title="Anagrafiche e consuntivi"
        description="Raccogli esportazioni tabellari e schede dettagliate per prodotti, clienti, fornitori, collaboratori e consuntivi."
      >
        <ReportCard
          title="Prodotti"
          description="Tabella completa di tutti i prodotti con categoria, titolo, descrizione e riferimenti disponibili."
          formats={["Excel"]}
          footer={
            <Button
              onClick={productsExcel}
              variant="default"
              disabled={loadingProducts}
            >
              Scarica prodotti
            </Button>
          }
        />

        <ReportCard
          title="Consuntivo"
          description="Scarica il consuntivo di uno o piu progetti con somma automatica di costi, ricavi, margine e ore."
          formats={["Excel", "PDF"]}
          footer={
            <Button
              onClick={consuntivoExport}
              variant="default"
              disabled={selectedConsuntivoTaskIds.length === 0 || loadingConsuntivo}
            >
              Scarica consuntivo
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Progetti</div>
              <ReportMultiSelect
                options={taskOptions}
                value={selectedConsuntivoTaskIds}
                onValueChange={setSelectedConsuntivoTaskIds}
                placeholder="Seleziona uno o piu progetti"
                emptyMessage="Nessun progetto disponibile."
              />
            </div>
            <Select
              value={consuntivoFormat}
              onValueChange={(value) =>
                setConsuntivoFormat(value as ExportFormat)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Formato export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </ReportCard>

        <ReportCard
          title="Report cliente"
          description="Scarica la scheda cliente completa con i dati anagrafici e i riferimenti disponibili."
          formats={["Excel", "PDF"]}
          footer={
            <Button
              onClick={clientExport}
              variant="default"
              disabled={!selectedClientId || loadingClient}
            >
              Scarica scheda cliente
            </Button>
          }
        >
          <div className="space-y-4">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientOptions.map((client) => (
                  <SelectItem key={client.value} value={client.value}>
                    {client.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={clientFormat}
              onValueChange={(value) => setClientFormat(value as ExportFormat)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Formato export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </ReportCard>

        <ReportCard
          title="Fornitori"
          description="Esporta l'elenco fornitori completo del sito."
          formats={["Excel", "PDF"]}
          footer={
            <Button
              onClick={suppliersExport}
              variant="default"
              disabled={loadingSuppliers}
            >
              Scarica fornitori
            </Button>
          }
        >
          <Select
            value={suppliersFormat}
            onValueChange={(value) => setSuppliersFormat(value as ExportFormat)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Formato export" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
        </ReportCard>

        <ReportCard
          title="Collaboratori"
          description="Scarica la scheda HR del collaboratore selezionato."
          formats={["Excel", "PDF"]}
          footer={
            <Button
              onClick={collaboratorsExport}
              variant="default"
              disabled={!selectedCollaboratorId || loadingCollaborators}
            >
              Scarica scheda HR
            </Button>
          }
        >
          <div className="space-y-4">
            <Select
              value={selectedCollaboratorId}
              onValueChange={setSelectedCollaboratorId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona collaboratore" />
              </SelectTrigger>
              <SelectContent>
                {userOptions.map((user) => (
                  <SelectItem key={user.value} value={user.value}>
                    {user.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={collaboratorFormat}
              onValueChange={(value) =>
                setCollaboratorFormat(value as ExportFormat)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Formato export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </ReportCard>
      </Section>

      {isReportEnabled("report-imb") && (
        <Section
          title="Documenti operativi"
          description="Esportazioni PDF o Excel dedicate ai processi di imballaggio e controllo."
        >
          <ReportCard
            title="PDF Imballaggio"
            description="Genera il PDF di imballaggio per il progetto selezionato."
            formats={["PDF"]}
            footer={
              <Button
                disabled={selectedTask == undefined || loadingImbPdf}
                onClick={() => imbPDF(selectedTask)}
                variant="default"
              >
                Scarica PDF
              </Button>
            }
          >
            <Select value={selectedTask} onValueChange={setSelectedTask}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona progetto" />
              </SelectTrigger>
              <SelectContent>
                {task.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    {t.unique_code || t.name || t.title || `Progetto ${t.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ReportCard>

          <ReportCard
            title="Report Imballaggio / QC"
            description="Esporta il report interno combinato di imballaggio e controllo qualita."
            formats={["Excel"]}
            footer={
              <Button onClick={imbQC} variant="default" disabled={loadingImbQc}>
                Scarica report interno
              </Button>
            }
          />
        </Section>
      )}
    </div>
  );
}

export default GridReports;
