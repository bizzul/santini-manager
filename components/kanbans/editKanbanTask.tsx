"use client";
import React, { useEffect, useState } from "react";
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
import QRCode from "qrcode.react";
import * as QCode from "qrcode";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { Plus, CalendarIcon } from "lucide-react";
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
  handleClose: any;
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
};

const EditTaskKanban = ({ handleClose, resource, history, domain }: Props) => {
  const { toast } = useToast();
  const { siteId } = useSiteId(domain);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      clientId: undefined,
      deliveryDate: undefined,
      termine_produzione: undefined,
      position1: "",
      other: "",
      position2: "",
      position3: "",
      position4: "",
      position5: "",
      position6: "",
      position7: "",
      position8: "",
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
        const response = await fetch(`/api/kanban/list`, { headers: getHeaders() });
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
      form.setValue("deliveryDate", resource.deliveryDate ? new Date(resource.deliveryDate) : undefined);
      form.setValue("termine_produzione", resource.termine_produzione ? new Date(resource.termine_produzione) : undefined);
      form.setValue("other", resource.other ?? undefined);
      form.setValue("sellPrice", resource.sellPrice!);
      form.setValue("numero_pezzi", resource.numero_pezzi ?? null);
      form.setValue("clientId", resource.clientId);
      form.setValue("unique_code", resource.unique_code!);
      form.setValue("kanbanId", resource.kanbanId);
      form.setValue("kanbanColumnId", resource.kanbanColumnId);
      resource?.positions?.map((position: any, index: number) => {
        //@ts-ignore
        form.setValue(`position${index + 1}`, position);
      });
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
  }, [resource, form.setValue, siteId]);

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
        const response = await fetch("/api/suppliers", { headers: getHeaders() });
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

  function printQRCode(data: string) {
    // Generate the QR code image
    const canvas = document.createElement("canvas");
    QCode.toCanvas(canvas, data, { width: 400 }, (error) => {
      if (error) {
        logger.error("QR Code error:", error);
        return;
      }

      // Create a new window and add the QR code image to it
      const printWindow = window.open(
        "",
        "Print Window",
        "height=400,width=400"
      );
      if (printWindow) {
        const img = document.createElement("img");
        img.src = canvas.toDataURL();
        img.onload = () => {
          printWindow.document.write(`<img src="${img.src}"/>`);

          // Wait for the image to finish rendering
          setTimeout(() => {
            // Print the new window
            printWindow.print();

            // Close the new window
            printWindow.close();
          }, 1000);
        };
      }
    });
  }

  const filteredHistory = history.filter(
    (action: any) => action.taskId === resource.id
  );

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

  // Add null check for resource after all hooks and functions
  if (!resource) {
    return <div>Loading...</div>;
  }

  if (isLoading) {
    return <div>Caricamento dati...</div>;
  }

  return (
    <div className="flex flex-row-reverse flex-nowrap gap-8 w-full justify-between">
      <div className="flex flex-col gap-8">
        {resource?.unique_code && (
          <QRCode
            value={`${process.env.NEXT_PUBLIC_URL}/progetti/${resource.unique_code}`}
            size={128}
            fgColor="#000000"
            onClick={() =>
              printQRCode(
                `${process.env.NEXT_PUBLIC_URL}/progetti/${resource.unique_code}`
              )
            }
          />
        )}

        <div className="">
          {filteredHistory.length > 0 ? (
            <ol className="relative border-l border-gray-200 dark:border-gray-700">
              {filteredHistory.map((item: any) => (
                <li className="mb-10 ml-6" key={item.id}>
                  <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -left-3 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900">
                    <Image
                      className="rounded-full shadow-lg"
                      src={item.User?.picture || "/default-avatar.png"}
                      width={30}
                      height={30}
                      alt={item.User?.given_name || "User"}
                    />
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
        <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
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
                      : (client.individualFirstName ?? "N/A") +
                        " " +
                        (client.individualLastName ?? "N/A"),
                  }))
                : [];
              return (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
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
                  {clientOptions.length === 0 && (
                    <div className="text-sm text-red-500 mt-1">
                      Nessun cliente trovato. Debug: {clients.length} clienti
                      caricati
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              );
            }}
          />
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
                  {productOptions.length === 0 && (
                    <div className="text-sm text-red-500 mt-1">
                      Nessun prodotto trovato. Debug: {products.length} prodotti
                      caricati
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              );
            }}
          />

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
                    <PopoverContent className="w-auto min-w-[280px] p-0" align="start">
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
                    <PopoverContent className="w-auto min-w-[280px] p-0" align="start">
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
          </div>

          {/* Kanban Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Kanban</label>
            <Select
              value={selectedKanbanId?.toString() || "__none__"}
              onValueChange={(value) =>
                setSelectedKanbanId(value && value !== "__none__" ? parseInt(value) : null)
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

          {/* Column Selection (only shown if kanban is selected) */}
          {selectedKanbanId && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Colonna</label>
              <Select
                value={selectedColumnId?.toString() || "__none__"}
                onValueChange={(value) =>
                  setSelectedColumnId(value && value !== "__none__" ? parseInt(value) : null)
                }
                disabled={isSubmitting || kanbanColumns.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona una colonna" />
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
              {kanbanColumns.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nessuna colonna disponibile per questa kanban
                </p>
              )}
            </div>
          )}

          <div className="flex">
            <div className="flex-1 pr-4">
              <div className="grid grid-rows-2 grid-cols-4 gap-2">
                {Array.from({ length: 8 }, (_, i) => (
                  <FormField
                    key={i}
                    //@ts-ignore
                    name={`position${i + 1}`}
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{`Pos. ${i + 1}`}</FormLabel>
                        <FormControl>
                          {/* @ts-ignore */}
                          <Input {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="border-l border-border" />

            <div className="pl-4 flex items-center justify-center">
              <FormField
                name="numero_pezzi"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="w-full max-w-32">
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
                <FormLabel>Valore di produzione</FormLabel>
                <FormControl>
                  <Input {...field} type="number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Gestione Fornitori</h3>

            <div className="space-y-2">
              {Array.isArray(taskSuppliers) &&
                taskSuppliers.map((ts) => (
                  <div
                    key={ts.id}
                    className="flex items-center gap-4 p-2 bg-gray-50 dark:bg-gray-800 rounded-sm"
                  >
                    <span className="font-medium w-32">
                      {ts.supplier?.short_name ||
                        ts.supplier?.name ||
                        "Unknown Supplier"}
                    </span>
                    <Input
                      type="date"
                      value={
                        ts.deliveryDate
                          ? new Date(ts.deliveryDate)
                              .toISOString()
                              .split("T")[0]
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
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </Button>
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

          <Button type="submit" disabled={isSubmitting}>
            {" "}
            {isSubmitting && (
              <span className="spinner-border spinner-border-sm mr-1"></span>
            )}{" "}
            Salva
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default EditTaskKanban;
