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

type ReportKanban = {
  id: number | string;
  title?: string | null;
  name?: string | null;
  identifier?: string | null;
  is_work_kanban?: boolean | null;
  is_offer_kanban?: boolean | null;
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
      <div className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">
        {children}
      </div>
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
    <Card className={`flex h-full min-h-[320px] flex-col ${className || ""}`}>
      <CardHeader className="space-y-3 pb-4">
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
      {children ? <CardContent className="flex flex-1 flex-col">{children}</CardContent> : null}
      <CardFooter className="mt-auto pt-0">{footer}</CardFooter>
    </Card>
  );
}

function ReportField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
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
  kanbans = [],
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
  kanbans?: ReportKanban[];
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
  const [selectedProjectCategoryIds, setSelectedProjectCategoryIds] = useState<
    string[]
  >([]);
  const [selectedProjectAreaIds, setSelectedProjectAreaIds] = useState<string[]>(
    [],
  );
  const [selectedProductCategoryIds, setSelectedProductCategoryIds] = useState<
    string[]
  >([]);
  const [selectedProductSubcategories, setSelectedProductSubcategories] = useState<
    string[]
  >([]);
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
  const [productsFormat, setProductsFormat] = useState<ExportFormat>("excel");

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
  const timeReportYearOptions = timeReportYears.map((year) => ({
    value: year,
    label: year,
  }));
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
  const exportFormatOptions = [
    { value: "excel", label: "Excel" },
    { value: "pdf", label: "PDF" },
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

  const projectProductOptions = Array.from(
    sellProducts.reduce((map, product) => {
      const categoryId = product.category?.id || product.category_id;
      const categoryName = product.category?.name;

      if (categoryId && categoryName && !map.has(String(categoryId))) {
        map.set(String(categoryId), {
          value: String(categoryId),
          label: categoryName,
          description: "Categoria prodotto",
        });
      }

      return map;
    }, new Map<string, { value: string; label: string; description?: string }>()),
  )
    .map(([, option]) => option)
    .sort((left, right) => left.label.localeCompare(right.label, "it"));

  const productCategoryOptions = Array.from(
    sellProducts.reduce((map, product) => {
      const categoryId = product.category?.id || product.category_id;
      const categoryName = product.category?.name;

      if (categoryId && categoryName && !map.has(String(categoryId))) {
        map.set(String(categoryId), {
          value: String(categoryId),
          label: categoryName,
          description: "Categoria prodotto",
        });
      }

      return map;
    }, new Map<string, { value: string; label: string; description?: string }>()),
  )
    .map(([, option]) => option)
    .sort((left, right) => left.label.localeCompare(right.label, "it"));

  const availableProductSubcategories = sellProducts.filter((product) => {
    if (selectedProductCategoryIds.length === 0) {
      return true;
    }

    const categoryId = product.category?.id || product.category_id;
    return categoryId ? selectedProductCategoryIds.includes(String(categoryId)) : false;
  });

  const productSubcategoryOptions = Array.from(
    availableProductSubcategories.reduce((map, product) => {
      const subcategory = product.type?.trim();

      if (subcategory && !map.has(subcategory)) {
        map.set(subcategory, {
          value: subcategory,
          label: subcategory,
          description: "Sottocategoria",
        });
      }

      return map;
    }, new Map<string, { value: string; label: string; description?: string }>()),
  )
    .map(([, option]) => option)
    .sort((left, right) => left.label.localeCompare(right.label, "it"));

  const taskKanbanIds = new Set(
    task
      .map((currentTask: any) => currentTask.kanban?.id || currentTask.kanbanId)
      .filter(Boolean)
      .map((kanbanId) => String(kanbanId)),
  );

  const derivedProjectAreaOptions = Array.from(
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
          description: "Kanban principale",
        });
      }
      return map;
    }, new Map<string, { value: string; label: string; description?: string }>()),
  )
    .map(([, option]) => option)
    .sort((left, right) => left.label.localeCompare(right.label, "it"));

  const projectAreaOptions = (
    kanbans
      .filter((kanban) => {
        if (kanban.is_offer_kanban) {
          return false;
        }

        return kanban.is_work_kanban || taskKanbanIds.has(String(kanban.id));
      })
      .map((kanban) => ({
        value: String(kanban.id),
        label:
          kanban.title ||
          kanban.name ||
          kanban.identifier ||
          `Kanban ${kanban.id}`,
        description: "Kanban principale",
      }))
      .sort((left, right) => left.label.localeCompare(right.label, "it"))
  ).length > 0
    ? kanbans
        .filter((kanban) => {
          if (kanban.is_offer_kanban) {
            return false;
          }

          return kanban.is_work_kanban || taskKanbanIds.has(String(kanban.id));
        })
        .map((kanban) => ({
          value: String(kanban.id),
          label:
            kanban.title ||
            kanban.name ||
            kanban.identifier ||
            `Kanban ${kanban.id}`,
          description: "Kanban principale",
        }))
        .sort((left, right) => left.label.localeCompare(right.label, "it"))
    : derivedProjectAreaOptions;

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
          selectedProjectCategoryIds.length > 0 || selectedProjectAreaIds.length > 0
            ? "POST"
            : "GET",
        headers: {
          "Content-Type": "application/json",
          "x-site-domain": domain,
        },
        body:
          selectedProjectCategoryIds.length > 0 || selectedProjectAreaIds.length > 0
            ? JSON.stringify({
                productCategoryIds: selectedProjectCategoryIds,
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
      if (supplier) {
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

  const productsExport = async () => {
    try {
      setLoadingProducts(true);
      const res = await fetch("/api/reports/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-domain": domain,
        },
        body: JSON.stringify({
          categoryIds: selectedProductCategoryIds,
          subcategories: selectedProductSubcategories,
          format: productsFormat,
        }),
      });

      if (res.ok) {
        await downloadResponseFile(
          res,
          getFileNameWithExtension(
            `Report_prodotti_al_${formatDateForFilename(new Date())}`,
            productsFormat,
          ),
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
        description="Esporta inventario, progetti e ore con filtri mirati e menu coerenti per il sito corrente."
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
              <ReportField
                label="Categorie inventario"
                hint="Se non selezioni nulla viene esportato l'inventario completo del sito."
              >
                <ReportMultiSelect
                  options={inventoryCategoryOptions}
                  value={selectedInventoryCategoryIds}
                  onValueChange={setSelectedInventoryCategoryIds}
                  placeholder="Tutte le categorie"
                  emptyMessage="Nessuna categoria inventario trovata."
                />
              </ReportField>
            </div>
          </ReportCard>
        )}

        {isReportEnabled("report-projects") && (
          <ReportCard
            title="Progetti"
            description="Esporta i progetti del sito filtrando per categoria prodotto e area progetto del kanban principale."
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
              <ReportField label="Prodotto">
                <ReportMultiSelect
                  options={projectProductOptions}
                  value={selectedProjectCategoryIds}
                  onValueChange={setSelectedProjectCategoryIds}
                  placeholder="Tutte le categorie prodotto"
                  emptyMessage="Nessuna categoria prodotto disponibile."
                />
              </ReportField>
              <ReportField label="Area progetto">
                <ReportMultiSelect
                  options={projectAreaOptions}
                  value={selectedProjectAreaIds}
                  onValueChange={setSelectedProjectAreaIds}
                  placeholder="Tutte le aree"
                  emptyMessage="Nessuna area disponibile."
                />
              </ReportField>
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
              {isAdmin ? (
                <ReportField label="Collaboratori">
                  <ReportMultiSelect
                    options={userOptions}
                    value={selectedTimeUserIds}
                    onValueChange={setSelectedTimeUserIds}
                    placeholder="Tutti i collaboratori"
                    emptyMessage="Nessun collaboratore disponibile."
                  />
                </ReportField>
              ) : null}

              <ReportField label="Anno">
                <ReportMultiSelect
                  options={timeReportYearOptions}
                  value={[selectedTimeReportYear]}
                  onValueChange={(values) => {
                    if (values[0]) {
                      setSelectedTimeReportYear(values[0]);
                    }
                  }}
                  placeholder="Seleziona anno"
                  emptyMessage="Nessun anno disponibile."
                  selectionMode="single"
                  showSelectAll={false}
                  searchPlaceholder="Cerca anno..."
                  allowClear={false}
                />
              </ReportField>

              <ReportField
                label="Mese"
                hint="Seleziona uno o piu mesi dello stesso anno."
              >
                <ReportMultiSelect
                  options={timeReportMonths}
                  value={selectedTimeReportMonths}
                  onValueChange={(values) =>
                    setSelectedTimeReportMonths(
                      [...values].sort((a, b) => Number(a) - Number(b)),
                    )
                  }
                  placeholder="Seleziona uno o piu mesi"
                  emptyMessage="Nessun mese disponibile."
                />
              </ReportField>
            </div>
          </ReportCard>
        )}
      </Section>

      <Section
        title="Anagrafiche e consuntivi"
        description="Raccogli errori, esportazioni tabellari e schede dettagliate per prodotti, clienti, fornitori, collaboratori e consuntivi."
      >
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
              <ReportField label="Fornitore">
                <ReportMultiSelect
                  options={suppliers.map((currentSupplier) => ({
                    value: currentSupplier.id.toString(),
                    label: currentSupplier.name || `Fornitore ${currentSupplier.id}`,
                  }))}
                  value={supplier ? [supplier] : []}
                  onValueChange={(values) => setSupplier(values[0])}
                  placeholder="Tutti i fornitori"
                  emptyMessage="Nessun fornitore disponibile."
                  selectionMode="single"
                  showSelectAll={false}
                />
              </ReportField>

              <ReportField label="Periodo">
                <DateRangePicker
                  className="w-full"
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
              </ReportField>
            </div>
          </ReportCard>
        )}

        <ReportCard
          title="Prodotti"
          description="Tabella completa di tutti i prodotti con categoria, titolo, descrizione e riferimenti disponibili."
          formats={["Excel", "PDF"]}
          footer={
            <Button
              onClick={productsExport}
              variant="default"
              disabled={loadingProducts}
            >
              Scarica prodotti
            </Button>
          }
        >
          <div className="space-y-4">
            <ReportField label="Categoria">
              <ReportMultiSelect
                options={productCategoryOptions}
                value={selectedProductCategoryIds}
                onValueChange={(values) => {
                  setSelectedProductCategoryIds(values);
                  setSelectedProductSubcategories((currentValues) =>
                    currentValues.filter((value) =>
                      sellProducts.some((product) => {
                        const categoryId = product.category?.id || product.category_id;
                        const matchesCategory =
                          values.length === 0 ||
                          (categoryId
                            ? values.includes(String(categoryId))
                            : false);
                        return matchesCategory && product.type?.trim() === value;
                      }),
                    ),
                  );
                }}
                placeholder="Tutte le categorie"
                emptyMessage="Nessuna categoria disponibile."
              />
            </ReportField>
            <ReportField label="Sottocategoria">
              <ReportMultiSelect
                options={productSubcategoryOptions}
                value={selectedProductSubcategories}
                onValueChange={setSelectedProductSubcategories}
                placeholder="Tutte le sottocategorie"
                emptyMessage="Nessuna sottocategoria disponibile."
              />
            </ReportField>
            <ReportField label="Formato">
              <ReportMultiSelect
                options={exportFormatOptions}
                value={[productsFormat]}
                onValueChange={(values) => {
                  if (values[0]) {
                    setProductsFormat(values[0] as ExportFormat);
                  }
                }}
                placeholder="Formato export"
                emptyMessage="Nessun formato disponibile."
                selectionMode="single"
                showSelectAll={false}
                searchPlaceholder="Cerca formato..."
                allowClear={false}
              />
            </ReportField>
          </div>
        </ReportCard>

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
            <ReportField label="Progetti">
              <ReportMultiSelect
                options={taskOptions}
                value={selectedConsuntivoTaskIds}
                onValueChange={setSelectedConsuntivoTaskIds}
                placeholder="Seleziona uno o piu progetti"
                emptyMessage="Nessun progetto disponibile."
              />
            </ReportField>
            <ReportField label="Formato">
              <ReportMultiSelect
                options={exportFormatOptions}
                value={[consuntivoFormat]}
                onValueChange={(values) => {
                  if (values[0]) {
                    setConsuntivoFormat(values[0] as ExportFormat);
                  }
                }}
                placeholder="Formato export"
                emptyMessage="Nessun formato disponibile."
                selectionMode="single"
                showSelectAll={false}
                searchPlaceholder="Cerca formato..."
                allowClear={false}
              />
            </ReportField>
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
            <ReportField label="Cliente">
              <ReportMultiSelect
                options={clientOptions}
                value={selectedClientId ? [selectedClientId] : []}
                onValueChange={(values) => setSelectedClientId(values[0])}
                placeholder="Seleziona cliente"
                emptyMessage="Nessun cliente disponibile."
                selectionMode="single"
                showSelectAll={false}
              />
            </ReportField>
            <ReportField label="Formato">
              <ReportMultiSelect
                options={exportFormatOptions}
                value={[clientFormat]}
                onValueChange={(values) => {
                  if (values[0]) {
                    setClientFormat(values[0] as ExportFormat);
                  }
                }}
                placeholder="Formato export"
                emptyMessage="Nessun formato disponibile."
                selectionMode="single"
                showSelectAll={false}
                searchPlaceholder="Cerca formato..."
                allowClear={false}
              />
            </ReportField>
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
          <ReportField label="Formato">
            <ReportMultiSelect
              options={exportFormatOptions}
              value={[suppliersFormat]}
              onValueChange={(values) => {
                if (values[0]) {
                  setSuppliersFormat(values[0] as ExportFormat);
                }
              }}
              placeholder="Formato export"
              emptyMessage="Nessun formato disponibile."
              selectionMode="single"
              showSelectAll={false}
              searchPlaceholder="Cerca formato..."
              allowClear={false}
            />
          </ReportField>
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
            <ReportField label="Collaboratore">
              <ReportMultiSelect
                options={userOptions}
                value={selectedCollaboratorId ? [selectedCollaboratorId] : []}
                onValueChange={(values) => setSelectedCollaboratorId(values[0])}
                placeholder="Seleziona collaboratore"
                emptyMessage="Nessun collaboratore disponibile."
                selectionMode="single"
                showSelectAll={false}
              />
            </ReportField>
            <ReportField label="Formato">
              <ReportMultiSelect
                options={exportFormatOptions}
                value={[collaboratorFormat]}
                onValueChange={(values) => {
                  if (values[0]) {
                    setCollaboratorFormat(values[0] as ExportFormat);
                  }
                }}
                placeholder="Formato export"
                emptyMessage="Nessun formato disponibile."
                selectionMode="single"
                showSelectAll={false}
                searchPlaceholder="Cerca formato..."
                allowClear={false}
              />
            </ReportField>
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
