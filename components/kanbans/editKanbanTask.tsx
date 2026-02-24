"use client";
import React, { useEffect, useState, useMemo } from "react";
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
import { editItem } from "@/app/sites/[domain]/projects/actions/edit-item.action";
import { validation } from "../../validation/task/create";
import { useToast } from "../../components/ui/use-toast";
import { Client, SellProduct } from "@/types/supabase";
import { DateManager } from "../../package/utils/dates/date-manager";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { Plus, CalendarIcon, Trash2, User, Phone, MapPin, Info } from "lucide-react";
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
import { cn } from "@/lib/utils";

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
};

type TaskSupplier = {
  id: number;
  supplierId: number;
  supplier: Supplier;
  deliveryDate: string | null;
  notes: string | null;
};

const EditTaskKanban = ({ handleClose, resource, history, domain }: Props) => {
  const { toast } = useToast();
  const { siteId, error: siteIdError } = useSiteId(domain);
  const [isLoading, setIsLoading] = useState(true);

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
  const [newSupplier, setNewSupplier] = useState<string>("");
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

  // Helper to build headers with siteId
  const getHeaders = (): HeadersInit => {
    const headers: HeadersInit = {};
    if (siteId) {
      headers["x-site-id"] = siteId;
    }
    return headers;
  };

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
        resource.deliveryDate ? new Date(resource.deliveryDate) : undefined
      );
      form.setValue(
        "termine_produzione",
        resource.termine_produzione
          ? new Date(resource.termine_produzione)
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
    };

    const loadData = async () => {
      await Promise.all([
        getClients(),
        getProducts(),
        getKanbans(),
        initializeForm(),
      ]);
      setIsLoading(false);
    };

    loadData();
  }, [resource, form.setValue, siteId, siteIdError, domain]);

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
    // Add kanbanId and kanbanColumnId to the data
    const dataWithKanban = {
      ...d,
      kanbanId: selectedKanbanId,
      kanbanColumnId: selectedColumnId,
    };

    const response = await editItem(dataWithKanban, resource?.id);
    if (response && typeof response === "object" && "error" in response) {
      toast({
        description: `Errore! ${response.error}`,
      });
    } else {
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

  const handleAddSupplier = async (e: React.MouseEvent) => {
    // Aggiungi questo per prevenire il comportamento di default del form
    e.preventDefault();

    if (!newSupplier || !newDeliveryDate) return;

    const response = await fetch(`/api/tasks/${resource.id}/suppliers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: parseInt(newSupplier),
        deliveryDate: newDeliveryDate,
      }),
    });

    if (response.ok) {
      const newTaskSupplier = await response.json();
      setTaskSuppliers([...taskSuppliers, newTaskSupplier]);
      setNewSupplier("");
      setNewDeliveryDate("");
      toast({
        description: "Fornitore aggiunto con successo",
      });
    }
  };

  const handleDeleteSupplier = async (supplierId: number) => {
    try {
      const response = await fetch(
        `/api/tasks/${resource.id}/suppliers/${supplierId}`,
        {
          method: "DELETE",
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

          {/* Row 3: Prodotto + Numero pezzi */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              name="productId"
              control={form.control}
              render={({ field }) => {
                const productOptions = Array.isArray(products)
                  ? products.map((p: SellProduct) => ({
                      value: p.id,
                      label: p.name + " " + p.type,
                    }))
                  : [];

                return (
                  <FormItem>
                    <FormLabel>Prodotto</FormLabel>
                    <FormControl>
                      <SearchSelect
                        value={field.value || undefined}
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                        disabled={isSubmitting}
                        options={productOptions}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              name="numero_pezzi"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numero pezzi</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Date Fields Grid */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              name="termine_produzione"
              control={form.control}
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Termine di produzione</FormLabel>
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
            {/* Headers row */}
            <div className="grid grid-cols-[1fr_auto_auto_1fr] gap-4 items-center">
              <h3 className="text-lg font-medium">Ordini fornitori</h3>
              <span className="text-sm font-medium text-muted-foreground w-40 text-center"></span>
              <span className="w-10"></span>
              <h3 className="text-lg font-medium">Note</h3>
            </div>

            <div className="space-y-2">
              {Array.isArray(taskSuppliers) &&
                taskSuppliers.map((ts) => (
                  <div
                    key={ts.id}
                    className="grid grid-cols-[1fr_auto_auto_1fr] gap-4 items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-sm"
                  >
                    <span className="font-medium">
                      {ts.supplier?.short_name ||
                        ts.supplier?.name ||
                        "Unknown Supplier"}
                    </span>
                    <Input
                      type="date"
                      value={
                        ts.deliveryDate
                          ? ts.deliveryDate.split("T")[0]
                          : ""
                      }
                      onChange={async (e) => {
                        const response = await fetch(
                          `/api/tasks/${resource.id}/suppliers`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              supplierId: ts.supplierId,
                              deliveryDate: e.target.value,
                            }),
                          }
                        );

                        if (response.ok) {
                          const updatedSupplier = await response.json();
                          setTaskSuppliers(
                            taskSuppliers.map((supplier) =>
                              supplier.id === updatedSupplier.id
                                ? updatedSupplier
                                : supplier
                            )
                          );
                          toast({
                            description: "Data di consegna aggiornata",
                          });
                        }
                      }}
                      className="w-40"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      type="button"
                      onClick={() => handleDeleteSupplier(ts.supplierId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Input
                      type="text"
                      placeholder="Aggiungi nota..."
                      defaultValue={ts.notes || ""}
                      onBlur={async (e) => {
                        const newNotes = e.target.value;
                        if (newNotes !== (ts.notes || "")) {
                          const response = await fetch(
                            `/api/tasks/${resource.id}/suppliers`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                supplierId: ts.supplierId,
                                notes: newNotes,
                              }),
                            }
                          );

                          if (response.ok) {
                            const updatedSupplier = await response.json();
                            setTaskSuppliers(
                              taskSuppliers.map((supplier) =>
                                supplier.id === updatedSupplier.id
                                  ? updatedSupplier
                                  : supplier
                              )
                            );
                            toast({
                              description: "Nota aggiornata",
                            });
                          }
                        }
                      }}
                    />
                  </div>
                ))}
            </div>

            <div className="flex gap-4 items-center">
              <Select value={newSupplier} onValueChange={setNewSupplier}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
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

              <Input
                type="date"
                value={newDeliveryDate}
                onChange={(e) => setNewDeliveryDate(e.target.value)}
                className="w-40"
              />

              <Button
                type="button" // Aggiungi questo per evitare il submit del form
                onClick={handleAddSupplier}
                disabled={!newSupplier || !newDeliveryDate}
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi
              </Button>
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
