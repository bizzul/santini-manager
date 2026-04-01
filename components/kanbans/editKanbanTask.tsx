"use client";
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SubmitHandler, useForm } from "react-hook-form";
import Image from "next/image";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { SearchSelect } from "../../components/ui/search-select";
import { Textarea } from "../../components/ui/textarea";
import { validation } from "../../validation/task/create";
import { useToast } from "../../components/ui/use-toast";
import {
  Client,
  OfferProductLine,
  SellProduct,
} from "@/types/supabase";
import { DateManager } from "../../package/utils/dates/date-manager";
import {
  cn,
  formatLocalDate,
  isWeekend,
  parseLocalDate,
} from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import {
  Plus,
  CalendarIcon,
  Trash2,
  User,
  Phone,
  MapPin,
  Info,
  Download,
  Loader2,
} from "lucide-react";
import { removeItem } from "@/app/sites/[domain]/projects/actions/delete-item.action";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { logger } from "@/lib/logger";
import { useSiteId } from "@/hooks/use-site-id";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter } from "next/navigation";
import {
  normalizeOfferProducts,
  sanitizeOfferProducts,
  sumOfferPieces,
} from "@/lib/offers";
import {
  ProjectDocuments,
  ProjectFile,
} from "@/components/project/project-documents";
import { downloadOfferPdf } from "@/lib/offer-pdf";

type Props = {
  handleClose: (wasDeleted?: boolean) => void;
  setIsLocked: any;
  open: boolean;
  setOpenModal: any;
  setOpen: any;
  resource: any;
  history: any;
  domain?: string;
};

type Supplier = {
  id: number;
  name: string;
  short_name: string | null;
  supplier_image?: string | null;
};

type TaskSupplier = {
  id: number;
  supplierId: number;
  supplier: Supplier;
  orderDate: string | null;
  supplyDays: number | null;
  deliveryDate: string | null;
  notes: string | null;
};

function parseSupplyDaysValue(
  value: string | number | null | undefined
): number | null {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsedValue =
    typeof value === "number" ? value : Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue)) {
    return null;
  }

  return Math.max(parsedValue, 0);
}

function calculateOrderDateFromDelivery(
  deliveryDate: string,
  supplyDays: string | number | null | undefined
): string | null {
  const normalizedSupplyDays = parseSupplyDaysValue(supplyDays);

  if (!deliveryDate || normalizedSupplyDays === null) {
    return null;
  }

  const calculatedDate = parseLocalDate(deliveryDate);

  let remainingDays = normalizedSupplyDays;
  while (remainingDays > 0) {
    calculatedDate.setDate(calculatedDate.getDate() - 1);

    if (!isWeekend(calculatedDate)) {
      remainingDays -= 1;
    }
  }

  return formatLocalDate(calculatedDate);
}

function calculateDeliveryDateFromOrder(
  orderDate: string,
  supplyDays: string | number | null | undefined
): string | null {
  const normalizedSupplyDays = parseSupplyDaysValue(supplyDays);

  if (!orderDate || normalizedSupplyDays === null) {
    return null;
  }

  const calculatedDate = parseLocalDate(orderDate);

  let remainingDays = normalizedSupplyDays;
  while (remainingDays > 0) {
    calculatedDate.setDate(calculatedDate.getDate() + 1);

    if (!isWeekend(calculatedDate)) {
      remainingDays -= 1;
    }
  }

  return formatLocalDate(calculatedDate);
}

const EditTaskKanban = ({ handleClose, resource, history, domain }: Props) => {
  const router = useRouter();
  const { toast } = useToast();
  const { siteId, error: siteIdError } = useSiteId(domain);
  const [isLoading, setIsLoading] = useState(true);
  const newOrderDateInputRef = useRef<HTMLInputElement>(null);
  const newDeliveryDateInputRef = useRef<HTMLInputElement>(null);
  const pendingSupplierUpdatesRef = useRef(new Set<Promise<void>>());

  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      clientId: undefined,
      deliveryDate: undefined,
      termine_produzione: undefined,
      ora_inizio: null,
      ora_fine: null,
      squadra: null,
      name: "",
      luogo: "",
      other: "",
      productId: undefined,
      sellPrice: 0,
      numero_pezzi: null,
      unique_code: "",
      kanbanId: resource?.kanbanId || undefined,
      kanbanColumnId: resource?.kanbanColumnId || undefined,
    },
  });

  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [taskSuppliers, setTaskSuppliers] = useState<TaskSupplier[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [offerProducts, setOfferProducts] = useState<OfferProductLine[]>([]);
  const [productionRequired, setProductionRequired] = useState(
    Boolean(resource?.termine_produzione)
  );
  const [newSupplier, setNewSupplier] = useState<string>("");
  const [newOrderDate, setNewOrderDate] = useState<string>("");
  const [newSupplyDays, setNewSupplyDays] = useState<string>("");
  const [newDeliveryDate, setNewDeliveryDate] = useState<string>("");
  const [kanbans, setKanbans] = useState<any[]>([]);
  const [selectedKanbanId, setSelectedKanbanId] = useState<number | null>(
    resource?.kanbanId || null
  );
  const [kanbanColumns, setKanbanColumns] = useState<any[]>([]);
  const [selectedColumnId, setSelectedColumnId] = useState<number | null>(
    resource?.kanbanColumnId || null
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Helper to build headers with siteId
  const getHeaders = (): HeadersInit => {
    const headers: HeadersInit = {};
    if (siteId) {
      headers["x-site-id"] = siteId;
    }
    if (domain) {
      headers["x-site-domain"] = domain;
    }
    return headers;
  };

  const isOfferTask =
    resource?.task_type === "OFFERTA" ||
    resource?.taskType === "OFFERTA" ||
    Boolean(resource?.offer_send_date || resource?.offerSendDate);

  const openNativeDatePicker = (input: HTMLInputElement | null) => {
    if (!input) {
      return;
    }

    input.focus();

    const pickerInput = input as HTMLInputElement & {
      showPicker?: () => void;
    };

    if (typeof pickerInput.showPicker === "function") {
      pickerInput.showPicker();
      return;
    }

    input.click();
  };

  const supplierDateInputClassName =
    "pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10";

  const loadTaskDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/kanban/tasks/${resource.id}`, {
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch task details");
      const data = await response.json();
      const task = data?.task;
      setProjectFiles(Array.isArray(task?.files) ? task.files : []);
      if (task) {
        setOfferProducts(normalizeOfferProducts(task));
        setProductionRequired(Boolean(task.termine_produzione));
      }
    } catch (error) {
      logger.error("Error fetching task details:", error);
      setProjectFiles([]);
    }
  }, [resource.id, siteId, domain]);

  useEffect(() => {
    if (!resource) return;
    // Wait for siteId to be loaded before fetching data
    // If domain is provided, wait until siteId is loaded (not null) or there's an error
    if (domain && !siteId && !siteIdError) return;

    setIsLoading(true);

    const getClients = async () => {
      try {
        logger.debug("Fetching clients...");
        const d = await fetch(`/api/clients/`, { headers: getHeaders() });

        if (!d.ok) {
          throw new Error("Failed to fetch clients");
        }

        const data = await d.json();
        logger.debug("Clients loaded:", Array.isArray(data) ? data.length : 0);
        setClients(Array.isArray(data) ? data : []);
      } catch (error) {
        logger.error("Error fetching clients:", error);
        setClients([]);
      }
    };

    const getProducts = async () => {
      try {
        logger.debug("Fetching products...");
        const d = await fetch(`/api/sell-products/`, { headers: getHeaders() });

        if (!d.ok) {
          throw new Error("Failed to fetch products");
        }

        const data = await d.json();
        logger.debug("Products loaded:", Array.isArray(data) ? data.length : 0);
        setProducts(Array.isArray(data) ? data : []);
      } catch (error) {
        logger.error("Error fetching products:", error);
        setProducts([]);
      }
    };

    const getKanbans = async () => {
      try {
        // Build URL with domain as fallback when siteId is not available
        const url = new URL(`/api/kanban/list`, window.location.origin);
        if (domain) {
          url.searchParams.set("domain", domain);
        }
        const response = await fetch(url.toString(), {
          headers: getHeaders(),
        });
        if (!response.ok) throw new Error("Failed to fetch kanbans");
        const data = await response.json();
        setKanbans(Array.isArray(data) ? data : []);
      } catch (error) {
        logger.error("Error fetching kanbans:", error);
        setKanbans([]);
      }
    };

    const initializeForm = async () => {
      form.setValue("productId", resource.sellProductId!);
      form.setValue(
        "deliveryDate",
        resource.deliveryDate ? parseLocalDate(resource.deliveryDate) : undefined
      );
      form.setValue(
        "termine_produzione",
        resource.termine_produzione
          ? parseLocalDate(resource.termine_produzione)
          : undefined
      );
      form.setValue("ora_inizio", (resource as any).ora_inizio ?? null);
      form.setValue("ora_fine", (resource as any).ora_fine ?? null);
      form.setValue("squadra", (resource as any).squadra ?? null);
      form.setValue("name", resource.name ?? "");
      form.setValue("luogo", resource.luogo ?? "");
      form.setValue("other", resource.other ?? undefined);
      form.setValue("sellPrice", resource.sellPrice!);
      form.setValue("numero_pezzi", resource.numero_pezzi ?? null);
      form.setValue("clientId", resource.clientId);
      form.setValue("unique_code", resource.unique_code!);
      form.setValue("kanbanId", resource.kanbanId);
      form.setValue("kanbanColumnId", resource.kanbanColumnId);
      setOfferProducts(normalizeOfferProducts(resource));
      setProductionRequired(Boolean(resource.termine_produzione));
    };

    const loadData = async () => {
      await Promise.all([
        getClients(),
        getProducts(),
        getKanbans(),
        initializeForm(),
        loadTaskDetails(),
      ]);
      setIsLoading(false);
    };

    loadData();
  }, [resource, form.setValue, siteId, siteIdError, domain, loadTaskDetails]);

  // Load columns when kanban changes
  useEffect(() => {
    const loadColumns = async () => {
      if (selectedKanbanId) {
        try {
          const response = await fetch(
            `/api/kanban-columns/${selectedKanbanId}`,
            { headers: getHeaders() }
          );
          if (!response.ok) throw new Error("Failed to fetch columns");
          const data = await response.json();
          setKanbanColumns(Array.isArray(data) ? data : []);

          // If the selected column doesn't belong to this kanban, reset it
          if (selectedColumnId) {
            const columnExists = data.some(
              (col: any) => col.id === selectedColumnId
            );
            if (!columnExists) {
              setSelectedColumnId(null);
            }
          }
        } catch (error) {
          logger.error("Error fetching columns:", error);
          setKanbanColumns([]);
        }
      } else {
        setKanbanColumns([]);
        setSelectedColumnId(null);
      }
    };

    loadColumns();
  }, [selectedKanbanId, siteId]);

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const response = await fetch("/api/suppliers", {
          headers: getHeaders(),
        });
        const suppliersData = await response.json();
        setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);

        const taskSuppResponse = await fetch(
          `/api/tasks/${resource.id}/suppliers`,
          { headers: getHeaders() }
        );
        const taskSuppData = await taskSuppResponse.json();
        setTaskSuppliers(Array.isArray(taskSuppData) ? taskSuppData : []);
      } catch (error) {
        logger.error("Error loading suppliers:", error);
        setSuppliers([]);
        setTaskSuppliers([]);
      }
    };

    loadSuppliers();
  }, [resource.id, siteId]);

  const { errors, isSubmitting } = form.formState;
  logger.debug("Form errors:", errors);

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    if (productionRequired && !d.termine_produzione) {
      toast({
        variant: "destructive",
        description: "Inserisci la data di produzione oppure disattiva Produzione.",
      });
      return;
    }

    if (pendingSupplierUpdatesRef.current.size > 0) {
      await Promise.allSettled(Array.from(pendingSupplierUpdatesRef.current));
    }

    const sanitizedProducts = sanitizeOfferProducts(offerProducts);
    const firstProductId =
      sanitizedProducts.find((item) => item.productId)?.productId || null;
    const totalPieces = sumOfferPieces(sanitizedProducts);
    const headers: HeadersInit = {
      ...getHeaders(),
      "Content-Type": "application/json",
    };

    const response = await fetch(`/api/kanban/tasks/${resource.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        unique_code: d.unique_code || null,
        name: d.name || null,
        luogo: d.luogo || null,
        clientId: d.clientId || null,
        sellProductId: firstProductId,
        sellPrice: d.sellPrice ? Number(d.sellPrice) : 0,
        numero_pezzi: totalPieces,
        deliveryDate: d.deliveryDate || null,
        termine_produzione: productionRequired ? d.termine_produzione || null : null,
        other: d.other || null,
        kanbanId: selectedKanbanId || resource?.kanbanId || null,
        kanbanColumnId: selectedColumnId || resource?.kanbanColumnId || null,
        offer_products: sanitizedProducts,
      }),
    });

    const responseData = await response.json();

    if (!response.ok || responseData?.status >= 400 || responseData?.error) {
      toast({
        variant: "destructive",
        description: `Errore! ${
          responseData?.error ||
          responseData?.message ||
          "Salvataggio non riuscito"
        }`,
      });
    } else {
      router.refresh();
      handleClose(false);
      toast({
        description: `Elemento ${d.unique_code} aggiornato correttamente!`,
      });
      form.reset();
    }
  };

  const filteredHistory = history.filter(
    (action: any) => action.taskId === resource.id
  );

  // Get the selected client for contact info display
  const selectedClient = useMemo(() => {
    const clientId = form.watch("clientId") || resource?.clientId;
    return clients.find((c: Client) => c.id === clientId) || null;
  }, [clients, form.watch("clientId"), resource?.clientId]);

  // Get contact phone - prefer mobile, fallback to landline
  const contactPhone = useMemo(() => {
    if (!selectedClient) return null;
    return selectedClient.mobilePhone || selectedClient.phone || selectedClient.landlinePhone || null;
  }, [selectedClient]);

  // Check if construction site address (luogo) is different from client address
  const currentLuogo = form.watch("luogo") || resource?.luogo;
  const hasDifferentSiteAddress = useMemo(() => {
    if (!currentLuogo || !selectedClient?.address) return false;
    // Compare normalized addresses (lowercase, trimmed)
    const normalizedLuogo = currentLuogo.toLowerCase().trim();
    const normalizedClientAddr = selectedClient.address.toLowerCase().trim();
    return normalizedLuogo !== normalizedClientAddr && normalizedLuogo !== "";
  }, [currentLuogo, selectedClient?.address]);

  const productOptions = useMemo(
    () =>
      Array.isArray(products)
        ? products.map((product: SellProduct) => ({
            value: product.id,
            label: [product.name, product.type].filter(Boolean).join(" "),
          }))
        : [],
    [products]
  );

  const handleOfferProductChange = (
    index: number,
    patch: Partial<OfferProductLine>
  ) => {
    setOfferProducts((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) return line;

        const updatedLine = { ...line, ...patch };

        if (patch.productId !== undefined) {
          const selectedProduct = products.find(
            (product: SellProduct) => product.id === patch.productId
          );
          updatedLine.productName =
            selectedProduct?.name || selectedProduct?.type || null;
          if (!updatedLine.description) {
            updatedLine.description = selectedProduct?.description || null;
          }
        }

        return updatedLine;
      })
    );
  };

  const handleAddOfferProduct = () => {
    if (offerProducts.length >= 5) return;
    setOfferProducts((current) => [
      ...current,
      {
        productId: null,
        productName: null,
        description: null,
        quantity: 1,
        unitPrice: null,
        totalPrice: null,
      },
    ]);
  };

  const handleRemoveOfferProduct = (index: number) => {
    setOfferProducts((current) => current.filter((_, lineIndex) => lineIndex !== index));
  };

  const handleAddSupplier = async (e: React.MouseEvent) => {
    // Aggiungi questo per prevenire il comportamento di default del form
    e.preventDefault();

    if (!newSupplier) return;

    const normalizedSupplyDays = parseSupplyDaysValue(newSupplyDays);
    const calculatedOrderDate =
      !newOrderDate && newDeliveryDate && normalizedSupplyDays !== null
        ? calculateOrderDateFromDelivery(newDeliveryDate, normalizedSupplyDays)
        : null;
    const calculatedDeliveryDate =
      !newDeliveryDate && newOrderDate && normalizedSupplyDays !== null
        ? calculateDeliveryDateFromOrder(newOrderDate, normalizedSupplyDays)
        : null;

    const response = await fetch(`/api/tasks/${resource.id}/suppliers`, {
      method: "POST",
      headers: {
        ...getHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        supplierId: parseInt(newSupplier),
        orderDate: (calculatedOrderDate ?? newOrderDate) || null,
        supplyDays: normalizedSupplyDays,
        deliveryDate: (calculatedDeliveryDate ?? newDeliveryDate) || null,
      }),
    });

    if (response.ok) {
      const newTaskSupplier = await response.json();
      setTaskSuppliers([...taskSuppliers, newTaskSupplier]);
      setNewSupplier("");
      setNewOrderDate("");
      setNewSupplyDays("");
      setNewDeliveryDate("");
      toast({
        description: "Fornitore aggiunto con successo",
      });
    }
  };

  const updateTaskSupplierLocally = (
    supplierId: number,
    updates: Partial<TaskSupplier>
  ) => {
    setTaskSuppliers((currentSuppliers) =>
      currentSuppliers.map((supplier) =>
        supplier.supplierId === supplierId ? { ...supplier, ...updates } : supplier
      )
    );
  };

  const persistTaskSupplierUpdate = async (
    supplierId: number,
    updates: Record<string, unknown>,
    successMessage: string
  ) => {
    const request = (async () => {
      const response = await fetch(`/api/tasks/${resource.id}/suppliers`, {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supplierId,
          ...updates,
        }),
      });

      if (!response.ok) {
        toast({
          variant: "destructive",
          description: "Errore durante il salvataggio del fornitore",
        });
        return;
      }

      await response.json();
      toast({
        description: successMessage,
      });
    })();

    pendingSupplierUpdatesRef.current.add(request);
    await request.finally(() => {
      pendingSupplierUpdatesRef.current.delete(request);
    });
  };

  const handleDeleteSupplier = async (supplierId: number) => {
    try {
      const response = await fetch(
        `/api/tasks/${resource.id}/suppliers/${supplierId}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );

      if (response.ok) {
        setTaskSuppliers(
          taskSuppliers.filter((ts) => ts.supplierId !== supplierId)
        );
        toast({
          description: "Fornitore rimosso con successo",
        });
      }
    } catch (error) {
      logger.error("Error deleting supplier:", error);
      toast({
        variant: "destructive",
        description: "Errore durante la rimozione del fornitore",
      });
    }
  };

  const handleDeleteTask = async () => {
    setIsDeleting(true);
    try {
      const result = await removeItem(resource.id, domain);
      if (result && typeof result === "object" && "error" in result) {
        toast({
          variant: "destructive",
          description: result.message || "Errore durante l'eliminazione",
        });
      } else {
        toast({
          description: `Task ${resource.unique_code} eliminato con successo`,
        });
        handleClose(true);
      }
    } catch (error) {
      logger.error("Error deleting task:", error);
      toast({
        variant: "destructive",
        description: "Errore durante l'eliminazione del task",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!siteId) {
      toast({
        variant: "destructive",
        description: "Contesto sito non disponibile per generare il PDF",
      });
      return;
    }

    setIsDownloadingPdf(true);
    try {
      await downloadOfferPdf({
        taskId: resource.id,
        siteId,
        saveToProjectDocuments: true,
      });
      await loadTaskDetails();
      toast({
        description: "PDF scaricato e salvato nei documenti di progetto",
      });
    } catch (error) {
      logger.error("Error downloading offer PDF:", error);
      toast({
        variant: "destructive",
        description:
          error instanceof Error
            ? error.message
            : "Errore durante il download del PDF",
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Add null check for resource after all hooks and functions
  if (!resource) {
    return <div>Loading...</div>;
  }

  if (isLoading) {
    return <div>Caricamento dati...</div>;
  }

  return (
    <div className="flex flex-row-reverse flex-nowrap gap-8 w-full justify-between">
      <div className="flex flex-col gap-6">
        {/* Project Contact Info Panel - Replaces QR Code */}
        <div className="w-48 p-4 bg-muted/50 rounded-lg border space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Info className="h-4 w-4" />
            Info Cantiere
          </h4>
          
          {/* Contact Phone */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>Telefono</span>
            </div>
            {contactPhone ? (
              <a 
                href={`tel:${contactPhone}`}
                className="text-sm text-primary hover:underline ml-6 block"
              >
                {contactPhone}
              </a>
            ) : (
              <span className="text-sm text-muted-foreground italic ml-6 block">
                Non disponibile
              </span>
            )}
          </div>

          {/* Construction Site Address */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>Cantiere</span>
            </div>
            {hasDifferentSiteAddress ? (
              <span className="text-sm ml-6 block">
                {currentLuogo}
              </span>
            ) : currentLuogo ? (
              <span className="text-sm text-muted-foreground ml-6 block">
                Come cliente
              </span>
            ) : (
              <span className="text-sm text-muted-foreground italic ml-6 block">
                Non specificato
              </span>
            )}
          </div>

          {/* Client Name for reference */}
          {selectedClient && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <User className="h-3 w-3" />
                <span>
                  {selectedClient.businessName || 
                   `${selectedClient.individualLastName || ''} ${selectedClient.individualFirstName || ''}`.trim() ||
                   'Cliente'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* History Section */}
        <div className="">
          {filteredHistory.length > 0 ? (
            <ol className="relative border-l border-gray-200 dark:border-gray-700">
              {filteredHistory.map((item: any) => (
                <li className="mb-10 ml-6" key={item.id}>
                  <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -left-3 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900">
                    {item.User?.picture ? (
                      <Image
                        className="rounded-full shadow-lg"
                        src={item.User.picture}
                        width={30}
                        height={30}
                        alt={item.User?.given_name || "User"}
                      />
                    ) : (
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                    )}
                  </span>
                  <div className="items-center justify-between p-2 bg-white border border-gray-200 rounded-lg shadow-xs sm:flex dark:bg-gray-700 dark:border-gray-600">
                    <time className="mb-1 text-xs font-normal text-gray-400 sm:order-last sm:mb-0">
                      {item.createdAt !== null &&
                        DateManager.formatEUDateTime(item.createdAt)}
                    </time>
                    <div className="text-sm font-normal text-gray-500 dark:text-gray-300">
                      {item.User?.given_name}{" "}
                      {item.type === "move_task" && (
                        <>
                          <span className="text-xs">
                            {" "}
                            {item.type === "move_task" && "ha mosso "}{" "}
                          </span>
                          <br />
                          <a
                            href="#"
                            className=" text-gray-600 text-xs dark:text-blue-500 "
                          >
                            {item.data?.fromColumn}
                          </a>{" "}
                          -{">"}{" "}
                          <span className=" text-gray-800 text-xs font-normal mr-2 px-2.5 py-0.5  dark:bg-gray-600 dark:text-gray-300">
                            {item.data?.toColumn}
                          </span>
                        </>
                      )}
                      {item.type === "task_create" && (
                        <>
                          <span className="text-xs">ha creato la task</span>
                        </>
                      )}
                      {item.type === "updated_task" && (
                        <>
                          {item.data?.metalli !== undefined && (
                            <span className="text-xs">
                              ha {item.data.metalli ? "aggiunto" : "rimosso"}{" "}
                              Metalli
                            </span>
                          )}
                          {item.data?.ferramenta !== undefined && (
                            <span className="text-xs">
                              ha {item.data.ferramenta ? "aggiunto" : "rimosso"}{" "}
                              Ferramenta
                            </span>
                          )}
                          {item.data?.stoccato !== undefined && (
                            <span className="text-xs">
                              ha{" "}
                              {item.data.stoccato
                                ? "stoccato l'ordine"
                                : "tolto stoccato"}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <ol className="relative border-l border-gray-200 dark:border-gray-700">
              <li className="mb-10 ml-6">
                <div className="items-center justify-between p-2 bg-white border border-gray-200 rounded-lg shadow-xs sm:flex dark:bg-gray-700 dark:border-gray-600">
                  <div className="text-sm font-normal text-gray-500 dark:text-gray-300">
                    Nessun dato storico trovato
                  </div>
                </div>
              </li>
            </ol>
          )}
        </div>

        <div className="w-72 min-h-[320px] rounded-lg border bg-muted/20 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Documenti progetto</h3>
            {isOfferTask ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={!siteId || isDownloadingPdf}
                className="h-8"
              >
                {isDownloadingPdf ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    PDF offerta
                  </>
                )}
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                Elenco e caricamento file
              </span>
            )}
          </div>
          {isOfferTask && (
            <p className="text-xs text-muted-foreground">
              Il PDF viene scaricato e salvato automaticamente nei documenti del
              progetto.
            </p>
          )}
          {siteId ? (
            <ProjectDocuments
              projectId={resource.id}
              siteId={siteId}
              initialFiles={projectFiles}
            />
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Caricamento documenti disponibile appena il contesto sito e pronto.
            </div>
          )}
        </div>
      </div>
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          {/* Row 1: Codice Identificativo + Nome cliente */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="unique_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Codice Identificativo</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="clientId"
              control={form.control}
              render={({ field }) => {
                const clientOptions = Array.isArray(clients)
                  ? clients.map((client: Client) => ({
                      value: client.id,
                      label: client.businessName
                        ? client.businessName
                        : (client.individualLastName ?? "N/A") +
                          " " +
                          (client.individualFirstName ?? "N/A"),
                    }))
                  : [];
                return (
                  <FormItem>
                    <FormLabel>Nome cliente</FormLabel>
                    <FormControl>
                      <SearchSelect
                        value={field.value || undefined}
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                        disabled={isSubmitting}
                        options={clientOptions}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>

          {/* Row 2: Nome oggetto + Luogo */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome oggetto</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="luogo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Luogo</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Row 3: Prodotti multipli */}
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Prodotti</h3>
                <p className="text-xs text-muted-foreground">
                  Puoi inserire fino a 5 prodotti con relativo numero pezzi.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddOfferProduct}
                disabled={isSubmitting || offerProducts.length >= 5}
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi prodotto
              </Button>
            </div>

            {offerProducts.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Nessun prodotto selezionato.
              </div>
            ) : (
              <div className="space-y-3">
                {offerProducts.map((line, index) => (
                  <div
                    key={`${line.productId || "new"}-${index}`}
                    className="grid grid-cols-[minmax(0,1fr)_130px_auto] gap-3 items-end"
                  >
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Prodotto {index + 1}
                      </label>
                      <SearchSelect
                        value={line.productId || undefined}
                        onValueChange={(value) =>
                          handleOfferProductChange(index, {
                            productId: value ? Number(value) : null,
                          })
                        }
                        disabled={isSubmitting}
                        options={productOptions}
                        placeholder="Seleziona prodotto"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Numero pezzi</label>
                      <Input
                        type="number"
                        min={1}
                        value={line.quantity ?? ""}
                        onChange={(e) =>
                          handleOfferProductChange(index, {
                            quantity: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        disabled={isSubmitting}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOfferProduct(index)}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data invio offerta</label>
              <div className="h-10 rounded-md border px-3 flex items-center text-sm">
                {resource.offer_send_date || resource.offerSendDate
                  ? DateManager.formatEUDate(
                      resource.offer_send_date || resource.offerSendDate
                    )
                  : "Non impostata"}
              </div>
            </div>
          </div>

          {/* Date Fields Grid */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              name="termine_produzione"
              control={form.control}
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <FormLabel>Produzione</FormLabel>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={productionRequired}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setProductionRequired(checked);
                          if (!checked) {
                            form.setValue("termine_produzione", undefined);
                          }
                        }}
                      />
                      Richiede data
                    </label>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isSubmitting || !productionRequired}
                        >
                          {productionRequired && field.value
                            ? field.value.toLocaleDateString("it-IT")
                            : productionRequired
                              ? "Seleziona data"
                              : "Produzione non richiesta"}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto min-w-[280px] p-0"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={(date) => {
                          if (productionRequired) {
                            field.onChange(date);
                          }
                        }}
                        disabled={isWeekend}
                        captionLayout="dropdown"
                        startMonth={new Date(new Date().getFullYear(), 0)}
                        endMonth={new Date(new Date().getFullYear() + 5, 11)}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="deliveryDate"
              control={form.control}
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data di posa</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isSubmitting}
                        >
                          {field.value
                            ? field.value.toLocaleDateString("it-IT")
                            : "Seleziona data"}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto min-w-[280px] p-0"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={isWeekend}
                        captionLayout="dropdown"
                        startMonth={new Date(new Date().getFullYear(), 0)}
                        endMonth={new Date(new Date().getFullYear() + 5, 11)}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Posa/Service: Ora e Squadra */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                name="ora_inizio"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ora inizio</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        min="06:00"
                        max="20:00"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="ora_fine"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ora fine</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        min="06:00"
                        max="20:00"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="squadra"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Squadra</FormLabel>
                    <Select
                      value={field.value?.toString() ?? "__none__"}
                      onValueChange={(v) =>
                        field.onChange(
                          v && v !== "__none__" ? parseInt(v) : null
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        <SelectItem value="1">Squadra 1</SelectItem>
                        <SelectItem value="2">Squadra 2</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Row 5: Kanban + Colonna */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kanban</label>
              <Select
                value={selectedKanbanId?.toString() || "__none__"}
                onValueChange={(value) =>
                  setSelectedKanbanId(
                    value && value !== "__none__" ? parseInt(value) : null
                  )
                }
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona una kanban" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nessuna kanban</SelectItem>
                  {kanbans.map((kanban) => (
                    <SelectItem key={kanban.id} value={kanban.id.toString()}>
                      {kanban.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Colonna</label>
              <Select
                value={selectedColumnId?.toString() || "__none__"}
                onValueChange={(value) =>
                  setSelectedColumnId(
                    value && value !== "__none__" ? parseInt(value) : null
                  )
                }
                disabled={
                  isSubmitting ||
                  !selectedKanbanId ||
                  kanbanColumns.length === 0
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      selectedKanbanId
                        ? "Seleziona una colonna"
                        : "Seleziona prima una kanban"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nessuna colonna</SelectItem>
                  {kanbanColumns.map((column) => (
                    <SelectItem key={column.id} value={column.id.toString()}>
                      {column.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <FormField
            name="other"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Commenti</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="sellPrice"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valore</FormLabel>
                <FormControl>
                  <Input {...field} type="number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Ordini fornitori</h3>
              </div>

              <div className="space-y-3">
                {Array.isArray(taskSuppliers) &&
                  taskSuppliers.map((ts) => (
                    <div
                      key={ts.id}
                      className="rounded-lg border bg-muted/30 p-3"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {ts.supplier?.short_name ||
                                ts.supplier?.name ||
                                "Unknown Supplier"}
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            type="button"
                            onClick={() => handleDeleteSupplier(ts.supplierId)}
                            className="shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[160px_96px_minmax(0,160px)] lg:items-end">
                          <div className="space-y-2">
                            <label className="text-xs text-muted-foreground">
                              Data ordinazione
                            </label>
                            <Input
                              type="date"
                              value={ts.orderDate ? ts.orderDate.split("T")[0] : ""}
                              onChange={async (e) => {
                                const nextOrderDate = e.target.value;
                                const nextDeliveryDate =
                                  ts.supplyDays !== null
                                    ? nextOrderDate
                                      ? calculateDeliveryDateFromOrder(
                                          nextOrderDate,
                                          ts.supplyDays
                                        )
                                      : null
                                    : undefined;

                                updateTaskSupplierLocally(ts.supplierId, {
                                  orderDate: nextOrderDate || null,
                                  ...(nextDeliveryDate !== undefined
                                    ? { deliveryDate: nextDeliveryDate }
                                    : {}),
                                });

                                await persistTaskSupplierUpdate(
                                  ts.supplierId,
                                  {
                                    orderDate: nextOrderDate || null,
                                    ...(nextDeliveryDate !== undefined
                                      ? { deliveryDate: nextDeliveryDate }
                                      : {}),
                                  },
                                  "Data di ordinazione aggiornata"
                                );
                              }}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs text-muted-foreground">
                              Giorni fornitura
                            </label>
                            <Input
                              type="number"
                              min="0"
                              value={ts.supplyDays ?? ""}
                              onChange={(e) => {
                                updateTaskSupplierLocally(ts.supplierId, {
                                  supplyDays: parseSupplyDaysValue(e.target.value),
                                });
                              }}
                              onBlur={async (e) => {
                                const nextSupplyDays = parseSupplyDaysValue(
                                  e.target.value
                                );
                                const currentSupplier =
                                  taskSuppliers.find(
                                    (supplier) => supplier.id === ts.id
                                  ) ?? ts;
                                const existingOrderDate =
                                  currentSupplier.orderDate?.split("T")[0] || "";
                                const existingDeliveryDate =
                                  currentSupplier.deliveryDate?.split("T")[0] || "";
                                const nextDeliveryDate =
                                  nextSupplyDays !== null && existingOrderDate
                                    ? calculateDeliveryDateFromOrder(
                                        existingOrderDate,
                                        nextSupplyDays
                                      )
                                    : undefined;
                                const nextOrderDate =
                                  nextSupplyDays !== null &&
                                  !existingOrderDate &&
                                  existingDeliveryDate
                                    ? calculateOrderDateFromDelivery(
                                        existingDeliveryDate,
                                        nextSupplyDays
                                      )
                                    : undefined;

                                updateTaskSupplierLocally(ts.supplierId, {
                                  supplyDays: nextSupplyDays,
                                  ...(nextDeliveryDate !== undefined
                                    ? { deliveryDate: nextDeliveryDate }
                                    : {}),
                                  ...(nextOrderDate !== undefined
                                    ? { orderDate: nextOrderDate }
                                    : {}),
                                });

                                await persistTaskSupplierUpdate(
                                  ts.supplierId,
                                  {
                                    supplyDays: nextSupplyDays,
                                    ...(nextDeliveryDate !== undefined
                                      ? { deliveryDate: nextDeliveryDate }
                                      : {}),
                                    ...(nextOrderDate !== undefined
                                      ? { orderDate: nextOrderDate }
                                      : {}),
                                  },
                                  "Giorni di fornitura aggiornati"
                                );
                              }}
                            />
                          </div>

                          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                            <label className="text-xs text-muted-foreground">
                              Data consegna
                            </label>
                            <Input
                              type="date"
                              value={
                                ts.deliveryDate
                                  ? ts.deliveryDate.split("T")[0]
                                  : ""
                              }
                              onChange={async (e) => {
                                const nextDeliveryDate = e.target.value;
                                const nextOrderDate =
                                  ts.supplyDays !== null
                                    ? nextDeliveryDate
                                      ? calculateOrderDateFromDelivery(
                                          nextDeliveryDate,
                                          ts.supplyDays
                                        )
                                      : null
                                    : undefined;

                                updateTaskSupplierLocally(ts.supplierId, {
                                  deliveryDate: nextDeliveryDate || null,
                                  ...(nextOrderDate !== undefined
                                    ? { orderDate: nextOrderDate }
                                    : {}),
                                });

                                await persistTaskSupplierUpdate(
                                  ts.supplierId,
                                  {
                                    deliveryDate: nextDeliveryDate || null,
                                    ...(nextOrderDate !== undefined
                                      ? { orderDate: nextOrderDate }
                                      : {}),
                                  },
                                  "Data di consegna aggiornata"
                                );
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="rounded-lg border border-dashed bg-muted/10 p-3 space-y-3">
                <div className="flex flex-wrap gap-3">
                  <div className="min-w-[220px] flex-[1.6_1_220px] rounded-md border bg-background/70 p-3 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Fornitore
                    </label>
                    <Select value={newSupplier} onValueChange={setNewSupplier}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona fornitore" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(suppliers) &&
                          suppliers
                            .filter(
                              (supplier) =>
                                !taskSuppliers.some(
                                  (ts) => ts.supplierId === supplier.id
                                )
                            )
                            .map((supplier) => (
                              <SelectItem
                                key={supplier.id}
                                value={supplier.id.toString()}
                              >
                                {supplier.short_name || supplier.name}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="min-w-[180px] flex-[1_1_180px] rounded-md border bg-background/70 p-3 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Ordinazione
                    </label>
                    <div className="relative">
                      <Input
                        ref={newOrderDateInputRef}
                        type="date"
                        value={newOrderDate}
                        onChange={(e) => {
                          const nextOrderDate = e.target.value;
                          setNewOrderDate(nextOrderDate);

                          if (!nextOrderDate && newSupplyDays) {
                            setNewDeliveryDate("");
                            return;
                          }

                          const calculatedDeliveryDate =
                            calculateDeliveryDateFromOrder(
                              nextOrderDate,
                              newSupplyDays
                            );

                          if (calculatedDeliveryDate) {
                            setNewDeliveryDate(calculatedDeliveryDate);
                          }
                        }}
                        className={supplierDateInputClassName}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground"
                        onClick={() =>
                          openNativeDatePicker(newOrderDateInputRef.current)
                        }
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="w-[88px] shrink-0 rounded-md border bg-background/70 p-3 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Giorni
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={newSupplyDays}
                      onChange={(e) => {
                        const nextSupplyDays = e.target.value;
                        setNewSupplyDays(nextSupplyDays);

                        if (!nextSupplyDays) {
                          return;
                        }

                        const calculatedDeliveryDate = newOrderDate
                          ? calculateDeliveryDateFromOrder(
                              newOrderDate,
                              nextSupplyDays
                            )
                          : null;
                        const calculatedOrderDate =
                          !newOrderDate && newDeliveryDate
                            ? calculateOrderDateFromDelivery(
                                newDeliveryDate,
                                nextSupplyDays
                              )
                            : null;

                        if (calculatedDeliveryDate) {
                          setNewDeliveryDate(calculatedDeliveryDate);
                        }

                        if (calculatedOrderDate) {
                          setNewOrderDate(calculatedOrderDate);
                        }
                      }}
                      placeholder="Giorni"
                    />
                  </div>

                  <div className="min-w-[180px] flex-[1_1_180px] rounded-md border bg-background/70 p-3 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Fornitura
                    </label>
                    <div className="relative">
                      <Input
                        ref={newDeliveryDateInputRef}
                        type="date"
                        value={newDeliveryDate}
                        onChange={(e) => {
                          const nextDeliveryDate = e.target.value;
                          setNewDeliveryDate(nextDeliveryDate);

                          if (!nextDeliveryDate && newSupplyDays) {
                            setNewOrderDate("");
                            return;
                          }

                          const calculatedOrderDate =
                            calculateOrderDateFromDelivery(
                              nextDeliveryDate,
                              newSupplyDays
                            );

                          if (calculatedOrderDate) {
                            setNewOrderDate(calculatedOrderDate);
                          }
                        }}
                        className={supplierDateInputClassName}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground"
                        onClick={() =>
                          openNativeDatePicker(newDeliveryDateInputRef.current)
                        }
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleAddSupplier}
                    disabled={!newSupplier}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi
                  </Button>
                </div>
              </div>
            </div>

          </div>

          <div className="flex gap-2 justify-between pt-4 border-t">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSubmitting || isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina
            </Button>
            <Button type="submit" disabled={isSubmitting || isDeleting}>
              {isSubmitting && (
                <span className="spinner-border spinner-border-sm mr-1"></span>
              )}
              Salva
            </Button>
          </div>
        </form>
      </Form>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il task{" "}
              <strong>{resource.unique_code}</strong>?
              <br />
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EditTaskKanban;
