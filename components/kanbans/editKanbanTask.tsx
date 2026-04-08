"use client";
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  useTransition,
} from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
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
  Package,
  Save,
  Upload,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logger } from "@/lib/logger";
import { useSiteId } from "@/hooks/use-site-id";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
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
import { DocumentUpload } from "@/components/ui/document-upload";
import { createClient } from "@/utils/supabase/client";
import { updateSellProductImageAction } from "@/app/sites/[domain]/products/actions/update-image.action";
import { resolveCoverImage } from "@/lib/cover-image";
import { formatHours } from "@/lib/project-consuntivo";

type Props = {
  handleClose: (wasDeleted?: boolean) => void;
  setIsLocked: any;
  open: boolean;
  setOpenModal: any;
  setOpen: any;
  resource: any;
  history: any;
  domain?: string;
  preferProjectCoverImage?: boolean;
  onPreferProjectCoverImageChange?: (preferProject: boolean) => void;
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

type CollaboratorBadge = {
  key: string;
  name: string;
  initials: string;
  picture: string | null;
  color?: string | null;
  hours: number;
  entries: number;
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

function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = seed.charCodeAt(index) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 72% 46%)`;
}

function isImageFilename(filename: string | null | undefined): boolean {
  if (!filename) return false;
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension);
}

const EditTaskKanban = ({
  handleClose,
  resource,
  history,
  domain,
  preferProjectCoverImage = false,
  onPreferProjectCoverImageChange,
}: Props) => {
  const router = useRouter();
  const { toast } = useToast();
  const { siteId, error: siteIdError } = useSiteId(domain);
  const [isLoading, setIsLoading] = useState(true);
  const newOrderDateInputRef = useRef<HTMLInputElement>(null);
  const newDeliveryDateInputRef = useRef<HTMLInputElement>(null);
  const pendingSupplierUpdatesRef = useRef(new Set<Promise<void>>());
  const projectImageInputRef = useRef<HTMLInputElement>(null);

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
  const [isUploadingProjectImage, setIsUploadingProjectImage] = useState(false);
  const [productImageDraftUrl, setProductImageDraftUrl] = useState<string | null>(
    null
  );
  const [productImageUploadKey, setProductImageUploadKey] = useState(0);
  const [isSavingProductImage, startSavingProductImage] = useTransition();
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
  const [selectedCollaborator, setSelectedCollaborator] =
    useState<CollaboratorBadge | null>(null);
  const [taskCollaboratorSummaries, setTaskCollaboratorSummaries] = useState<any[]>(
    Array.isArray(resource?.collaboratorTimeSummaries) ? resource.collaboratorTimeSummaries : []
  );

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
        setTaskCollaboratorSummaries(
          Array.isArray(task.collaboratorTimeSummaries)
            ? task.collaboratorTimeSummaries
            : []
        );
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

    const initializeForm = () => {
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
      setProjectFiles(Array.isArray(resource.files) ? resource.files : []);
    };

    initializeForm();
    setIsLoading(false);

    const needsTaskRefresh =
      !Array.isArray(resource.files) ||
      resource.offer_products === undefined;

    void Promise.allSettled([
      getClients(),
      getProducts(),
      getKanbans(),
      needsTaskRefresh ? loadTaskDetails() : Promise.resolve(),
    ]);
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

  const involvedCollaborators = useMemo<CollaboratorBadge[]>(() => {
    const byKey = new Map<string, CollaboratorBadge>();

    const timetrackingCollaborators =
      taskCollaboratorSummaries.length > 0
        ? taskCollaboratorSummaries
        : Array.isArray(resource?.collaboratorTimeSummaries)
          ? resource.collaboratorTimeSummaries
          : [];

    timetrackingCollaborators.forEach((item: any) => {
      const key = String(item?.id || item?.employeeId || "");
      if (!key) return;
      byKey.set(key, {
        key,
        name: String(item?.name || "Collaboratore"),
        initials: String(item?.initials || "CL"),
        picture: typeof item?.picture === "string" ? item.picture : null,
        color: typeof item?.color === "string" ? item.color : null,
        hours: Number(item?.hours || 0),
        entries: Number(item?.entries || 0),
      });
    });

    (filteredHistory as any[]).forEach((item) => {
      const user = item?.User;
      if (!user) return;

      const key = String(
        user.id ||
          user.authId ||
          user.picture ||
          `${user.given_name || ""}-${user.family_name || ""}`
      );
      if (!key) return;

      const fullName =
        `${user.given_name || ""} ${user.family_name || ""}`.trim() ||
        "Collaboratore";
      const initials =
        `${user.given_name?.charAt(0) || ""}${user.family_name?.charAt(0) || ""}`.toUpperCase() ||
        "CL";

      const existing = byKey.get(key);
      byKey.set(key, {
        key,
        name: existing?.name || fullName,
        initials: existing?.initials || initials,
        picture: existing?.picture || user.picture || null,
        color: existing?.color || null,
        hours: existing?.hours || 0,
        entries: existing?.entries || 0,
      });
    });

    const ordered = Array.from(byKey.values()).sort((a, b) => {
      if (b.hours !== a.hours) return b.hours - a.hours;
      return a.name.localeCompare(b.name, "it");
    });

    const withHours = ordered.filter((collaborator) => collaborator.hours > 0);
    return withHours.length > 0 ? withHours : ordered;
  }, [filteredHistory, resource?.collaboratorTimeSummaries, taskCollaboratorSummaries]);

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

  const selectedProjectProduct = useMemo(() => {
    const watchedProductId = form.watch("productId");
    const fallbackProductId =
      offerProducts.find((line) => line.productId)?.productId ??
      watchedProductId ??
      resource?.sellProductId ??
      null;

    if (!fallbackProductId) {
      return null;
    }

    return (
      products.find(
        (product: SellProduct) => product.id === Number(fallbackProductId)
      ) || null
    );
  }, [offerProducts, products, form.watch("productId"), resource?.sellProductId]);

  const selectedProjectProductImage = useMemo(() => {
    if (!selectedProjectProduct || typeof selectedProjectProduct !== "object") {
      return null;
    }

    const imageUrl = (selectedProjectProduct as { image_url?: string | null })
      .image_url;

    if (typeof imageUrl !== "string" || imageUrl.trim().length === 0) {
      return null;
    }

    return imageUrl;
  }, [selectedProjectProduct]);

  const projectImageFile = useMemo(
    () => projectFiles.find((file) => isImageFilename(file.name)),
    [projectFiles]
  );
  const projectImageUrl = projectImageFile?.url || null;
  const currentProductImageUrl = selectedProjectProductImage;
  const productImagePreview = useMemo(() => {
    if (productImageDraftUrl) {
      return {
        imageUrl: productImageDraftUrl,
        source: "product" as const,
      };
    }
    return resolveCoverImage({
      productImageUrl: currentProductImageUrl,
      projectImageUrl,
      productCategoryName: selectedProjectProduct?.category?.name || null,
      productType: selectedProjectProduct?.type || null,
      productName: selectedProjectProduct?.name || null,
      projectName: resource?.name || null,
      projectLocation: resource?.luogo || null,
      projectNotes: resource?.other || null,
    });
  }, [
    currentProductImageUrl,
    productImageDraftUrl,
    projectImageUrl,
    resource?.luogo,
    resource?.other,
    resource?.name,
    selectedProjectProduct?.category?.name,
    selectedProjectProduct?.name,
    selectedProjectProduct?.type,
  ]);
  const productImagePreviewUrl =
    productImagePreview.imageUrl || "/placeholders/default.svg";
  const hasPendingProductImageChanges =
    productImageDraftUrl !== null && productImageDraftUrl !== currentProductImageUrl;
  const projectImagePreview = useMemo(
    () =>
      resolveCoverImage({
        productImageUrl: currentProductImageUrl,
        projectImageUrl,
        preferProjectCoverImage: true,
        productCategoryName: selectedProjectProduct?.category?.name || null,
        productType: selectedProjectProduct?.type || null,
        productName: selectedProjectProduct?.name || null,
        projectName: resource?.name || null,
        projectLocation: resource?.luogo || null,
        projectNotes: resource?.other || null,
      }),
    [
      currentProductImageUrl,
      projectImageUrl,
      resource?.luogo,
      resource?.other,
      resource?.name,
      selectedProjectProduct?.category?.name,
      selectedProjectProduct?.name,
      selectedProjectProduct?.type,
    ]
  );
  const projectImagePreviewUrl =
    projectImagePreview.imageUrl || "/placeholders/default.svg";
  const showCoverSourceBadge = process.env.NODE_ENV !== "production";

  useEffect(() => {
    setProductImageDraftUrl(null);
    setProductImageUploadKey((current) => current + 1);
  }, [selectedProjectProduct?.id]);

  const uploadProjectImage = useCallback(
    async (file: File) => {
      if (!siteId) {
        toast({
          variant: "destructive",
          description: "Contesto sito non disponibile per caricare immagini",
        });
        return;
      }

      const maxSizeMB = 10;
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast({
          variant: "destructive",
          description: `File troppo grande. Max ${maxSizeMB}MB`,
        });
        return;
      }

      setIsUploadingProjectImage(true);
      try {
        const supabase = createClient();
        const fileExt = file.name.split(".").pop();
        const safeName = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9-_]/g, "_")
          .substring(0, 50);
        const fileName = `${safeName}-${Date.now()}.${fileExt}`;
        const filePath = `${siteId}/projects/${resource.id}/images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("documents").getPublicUrl(filePath);

        const response = await fetch("/api/files/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            url: publicUrl,
            storage_path: filePath,
            taskId: resource.id,
          }),
        });

        const result = await response.json();
        if (!response.ok || result.error || !result.data) {
          throw new Error(result.error || "Errore durante il salvataggio del file");
        }

        setProjectFiles((current) => [result.data, ...current]);
        router.refresh();
        toast({
          description: "Immagine progetto caricata con successo",
        });
      } catch (error) {
        logger.error("Error uploading project image:", error);
        toast({
          variant: "destructive",
          description:
            error instanceof Error
              ? error.message
              : "Errore durante il caricamento immagine progetto",
        });
      } finally {
        setIsUploadingProjectImage(false);
      }
    },
    [resource.id, siteId, toast]
  );

  const handleProjectImageInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      await uploadProjectImage(file);
    },
    [uploadProjectImage]
  );

  const handleDeleteProjectImage = useCallback(async () => {
    if (!projectImageFile) return;

    setIsUploadingProjectImage(true);
    try {
      const response = await fetch(`/api/files/${projectImageFile.id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || "Errore durante l'eliminazione");
      }

      setProjectFiles((current) =>
        current.filter((file) => file.id !== projectImageFile.id)
      );
      router.refresh();
      toast({
        description: "Immagine progetto rimossa",
      });
    } catch (error) {
      logger.error("Error deleting project image:", error);
      toast({
        variant: "destructive",
        description:
          error instanceof Error
            ? error.message
            : "Errore durante la rimozione immagine progetto",
      });
    } finally {
      setIsUploadingProjectImage(false);
    }
  }, [projectImageFile, toast]);

  const handleProductImageUploadComplete = useCallback(
    (nextUrl: string) => {
      setProductImageDraftUrl(nextUrl);
      toast({
        description: "Immagine caricata. Premi Salva per confermare.",
      });
    },
    [toast]
  );

  const handleSaveProductImage = useCallback(() => {
    const productId = selectedProjectProduct?.id;
    if (!productId || !siteId) {
      toast({
        variant: "destructive",
        description: "Seleziona un prodotto e assicurati che il contesto sito sia carico",
      });
      return;
    }

    if (!hasPendingProductImageChanges) {
      return;
    }

    startSavingProductImage(async () => {
      const response = await updateSellProductImageAction({
        productId: Number(productId),
        imageUrl: productImageDraftUrl,
        domain,
        siteId,
      });

      if (response?.error) {
        toast({
          variant: "destructive",
          description: response.error,
        });
        return;
      }

      setProducts((current) =>
        current.map((product) =>
          product.id === Number(productId)
            ? { ...product, image_url: productImageDraftUrl }
            : product
        )
      );
      setProductImageDraftUrl(null);
      setProductImageUploadKey((current) => current + 1);
      router.refresh();
      toast({
        description: "Immagine prodotto aggiornata",
      });
    });
  }, [
    selectedProjectProduct?.id,
    siteId,
    hasPendingProductImageChanges,
    productImageDraftUrl,
    domain,
    router,
    toast,
  ]);

  const handleRemoveProductImage = useCallback(() => {
    if (hasPendingProductImageChanges) {
      setProductImageDraftUrl(null);
      setProductImageUploadKey((current) => current + 1);
      toast({
        description: "Modifica immagine annullata",
      });
      return;
    }

    if (!currentProductImageUrl) {
      return;
    }

    setProductImageDraftUrl(null);
    setProductImageUploadKey((current) => current + 1);
    startSavingProductImage(async () => {
      const productId = selectedProjectProduct?.id;
      if (!productId || !siteId) {
        toast({
          variant: "destructive",
          description:
            "Seleziona un prodotto e assicurati che il contesto sito sia carico",
        });
        return;
      }

      const response = await updateSellProductImageAction({
        productId: Number(productId),
        imageUrl: null,
        domain,
        siteId,
      });

      if (response?.error) {
        toast({
          variant: "destructive",
          description: response.error,
        });
        return;
      }

      setProducts((current) =>
        current.map((product) =>
          product.id === Number(productId)
            ? { ...product, image_url: null }
            : product
        )
      );
      router.refresh();
      toast({
        description: "Immagine prodotto rimossa",
      });
    });
  }, [
    hasPendingProductImageChanges,
    currentProductImageUrl,
    selectedProjectProduct?.id,
    siteId,
    domain,
    router,
    toast,
  ]);

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
        <div className="w-60 p-3 bg-muted/40 rounded-lg border space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Package className="h-3.5 w-3.5" />
            Prodotto
          </h4>
          <div className="rounded-md border bg-background/50 px-2 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Usa immagine progetto sulla card
              </span>
              <Switch
                checked={preferProjectCoverImage}
                onCheckedChange={(checked) =>
                  onPreferProjectCoverImageChange?.(Boolean(checked))
                }
                disabled={!onPreferProjectCoverImageChange}
              />
            </div>
          </div>
          <div className="space-y-2 rounded-md border bg-background/50 p-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Immagine prodotto
            </p>
            <div className="relative w-full h-24 rounded-md border overflow-hidden bg-background/60">
              {showCoverSourceBadge && (
                <span className="absolute right-1.5 top-1.5 z-10 rounded bg-slate-900/80 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                  {productImagePreview.source}
                </span>
              )}
              {productImagePreviewUrl ? (
                <Image
                  src={productImagePreviewUrl}
                  alt={selectedProjectProduct?.name || "Immagine prodotto"}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
                  Nessuna immagine
                </div>
              )}
            </div>
            <p className="text-xs leading-snug text-muted-foreground">
              {selectedProjectProduct?.name ||
                selectedProjectProduct?.type ||
                "Prodotto non selezionato"}
            </p>
            <DocumentUpload
              key={productImageUploadKey}
              siteId={siteId || ""}
              folder="sell-products/images"
              onUploadComplete={handleProductImageUploadComplete}
              onError={(error) =>
                toast({
                  variant: "destructive",
                  description: error,
                })
              }
              accept="image/png,image/jpeg,image/webp,image/gif"
              maxSizeMB={10}
              disabled={!siteId || !selectedProjectProduct?.id || isSavingProductImage}
              dropzoneLabel="Carica immagine prodotto"
              dropzoneHint="PNG, JPG, WEBP, GIF - Max 10MB"
              className="p-3"
            />
            {hasPendingProductImageChanges && (
              <Button
                type="button"
                size="sm"
                className="w-full"
                onClick={handleSaveProductImage}
                disabled={isSavingProductImage}
              >
                <Save className="h-4 w-4 mr-2" />
                Salva immagine
              </Button>
            )}
            {(currentProductImageUrl || productImageDraftUrl) && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full"
                onClick={handleRemoveProductImage}
                disabled={isSavingProductImage}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina immagine prodotto
              </Button>
            )}
          </div>

          <div className="space-y-2 rounded-md border bg-background/50 p-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Immagine progetto
            </p>
            <div className="relative w-full h-24 rounded-md border overflow-hidden bg-background/60">
              {showCoverSourceBadge && (
                <span className="absolute right-1.5 top-1.5 z-10 rounded bg-slate-900/80 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                  {projectImagePreview.source}
                </span>
              )}
              {projectImagePreviewUrl ? (
                <Image
                  src={projectImagePreviewUrl}
                  alt="Immagine progetto"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
                  Nessuna immagine
                </div>
              )}
            </div>
            <input
              ref={projectImageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleProjectImageInputChange}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => projectImageInputRef.current?.click()}
              disabled={!siteId || isUploadingProjectImage}
            >
              {isUploadingProjectImage ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Caricamento...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Carica immagine progetto
                </>
              )}
            </Button>
            {projectImageUrl && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full"
                onClick={handleDeleteProjectImage}
                disabled={isUploadingProjectImage}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina immagine progetto
              </Button>
            )}
          </div>
        </div>

        {/* Project Contact Info Panel - Replaces QR Code */}
        <div className="flex items-start gap-2.5">
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

          {involvedCollaborators.length > 0 && (
            <div className="flex min-w-[220px] flex-col gap-2 pt-1">
              {involvedCollaborators.slice(0, 4).map((collaborator) => (
                <button
                  key={collaborator.key}
                  type="button"
                  title={`Apri ${collaborator.name}`}
                  onClick={() => setSelectedCollaborator(collaborator)}
                  className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar
                      className="h-9 w-9 border-2 border-background shadow-sm cursor-pointer"
                      title={collaborator.name}
                    >
                      <AvatarImage src={collaborator.picture || undefined} alt={collaborator.name} />
                      <AvatarFallback
                        className="text-[10px] font-semibold text-white"
                        style={{ backgroundColor: collaborator.color || getAvatarColor(collaborator.key) }}
                      >
                        {collaborator.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-xs font-medium">{collaborator.name}</span>
                  </div>
                  <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    {formatHours(collaborator.hours)}
                  </span>
                </button>
              ))}
              {involvedCollaborators.length > 4 && (
                <div
                  className="rounded px-1 text-[11px] text-muted-foreground"
                  title={`${involvedCollaborators.length - 4} collaboratori aggiuntivi`}
                >
                  +{involvedCollaborators.length - 4}
                </div>
              )}
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

        <div className="w-72 min-h-[320px] mt-10 rounded-lg border bg-muted/20 p-4 space-y-4">
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
      <Dialog
        open={Boolean(selectedCollaborator)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCollaborator(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Collaboratore</DialogTitle>
            <DialogDescription>Dettaglio rapido dalla scheda progetto</DialogDescription>
          </DialogHeader>
          {selectedCollaborator && (
            <div className="flex flex-col items-center gap-3 py-2">
              <Avatar className="h-24 w-24 border shadow-sm">
                <AvatarImage
                  src={selectedCollaborator.picture || undefined}
                  alt={selectedCollaborator.name}
                />
                <AvatarFallback
                  className="text-xl font-semibold text-white"
                  style={{
                    backgroundColor:
                      selectedCollaborator.color || getAvatarColor(selectedCollaborator.key),
                  }}
                >
                  {selectedCollaborator.initials}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm font-medium text-center">{selectedCollaborator.name}</p>
              <p className="text-xs text-muted-foreground">
                Ore registrate: {formatHours(selectedCollaborator.hours)}
                {selectedCollaborator.entries > 0
                  ? ` (${selectedCollaborator.entries} registrazioni)`
                  : ""}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditTaskKanban;
