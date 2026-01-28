"use client";
import React, { useState, useEffect, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SubmitHandler, useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SearchSelect } from "@/components/ui/search-select";
import { OfferSelect } from "@/components/ui/offer-select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Loader2, RefreshCw, Link, Columns } from "lucide-react";
import { cn } from "@/lib/utils";
import { createItem } from "./actions/create-item.action";
import { validation } from "@/validation/task/create";
import { useToast } from "@/components/ui/use-toast";
import { Client, SellProduct, Task, Kanban, KanbanColumn } from "@/types/supabase";
import { useParams } from "next/navigation";

// Flexible data type that accepts both page.tsx format and KanbanBoard format
type FormData = {
  clients?: Client[];
  activeProducts?: SellProduct[];
  products?: SellProduct[]; // KanbanBoard passes 'products' instead of 'activeProducts'
  kanbans?: Kanban[];
};

type Props = {
  handleClose: any;
  data: FormData;
  kanbanId?: number;
  domain?: string;
};

const CreateProductForm = ({ handleClose, data, kanbanId }: Props) => {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [taskType, setTaskType] = useState<string>("LAVORO");
  const [isOfferKanban, setIsOfferKanban] = useState(false);
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([]);
  const [isLoadingColumns, setIsLoadingColumns] = useState(false);
  const params = useParams();
  const domain = params?.domain as string;

  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      clientId: null,
      deliveryDate: undefined,
      termine_produzione: undefined,
      name: "",
      position1: "",
      other: "",
      position2: "",
      position3: "",
      position4: "",
      position5: "",
      position6: "",
      position7: "",
      position8: "",
      productId: null,
      sellPrice: 0,
      numero_pezzi: null,
      unique_code: "",
      kanbanId: kanbanId ?? undefined,
      parentTaskId: null,
    },
  });

  // Watch kanbanId changes
  const selectedKanbanId = useWatch({
    control: form.control,
    name: "kanbanId",
  });

  // Generate code based on kanban
  const generateCode = useCallback(
    async (targetKanbanId?: number) => {
      const kanbanToUse = targetKanbanId || selectedKanbanId || kanbanId;
      if (!kanbanToUse && !domain) return;

      setIsLoadingCode(true);
      try {
        const params = new URLSearchParams();
        if (kanbanToUse) params.set("kanbanId", String(kanbanToUse));
        else if (domain) params.set("domain", domain);

        const res = await fetch(
          `/api/tasks/generate-code?${params.toString()}`
        );
        if (res.ok) {
          const data = await res.json();
          form.setValue("unique_code", data.code);
          setIsOfferKanban(data.isOfferKanban);
          setTaskType(data.taskType);
        }
      } catch (error) {
        console.error("Error generating code:", error);
      } finally {
        setIsLoadingCode(false);
      }
    },
    [selectedKanbanId, kanbanId, domain, form]
  );

  // Fetch columns for a kanban
  const fetchColumns = useCallback(
    async (targetKanbanId: number) => {
      setIsLoadingColumns(true);
      try {
        const res = await fetch(`/api/kanban/${targetKanbanId}/columns`);
        if (res.ok) {
          const columnsData = await res.json();
          setKanbanColumns(columnsData);
          // Reset column selection when kanban changes
          form.setValue("kanbanColumnId", null);
        } else {
          setKanbanColumns([]);
        }
      } catch (error) {
        console.error("Error fetching columns:", error);
        setKanbanColumns([]);
      } finally {
        setIsLoadingColumns(false);
      }
    },
    [form]
  );

  // Generate code on mount
  useEffect(() => {
    if (kanbanId) {
      // If kanbanId prop is provided, generate code for that kanban
      generateCode(kanbanId);
      // Also fetch columns for the kanban
      fetchColumns(kanbanId);
    } else if (domain && !selectedKanbanId) {
      // If no kanbanId prop but domain is available, generate code using domain
      generateCode();
    }
  }, [kanbanId, domain]);

  // Generate code and fetch columns when kanban selection changes
  useEffect(() => {
    if (selectedKanbanId && !kanbanId) {
      generateCode(selectedKanbanId);
      fetchColumns(selectedKanbanId);
    }
  }, [selectedKanbanId, kanbanId, fetchColumns]);

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (
    formData
  ) => {
    try {
      setIsSubmitting(true);
      const res = await createItem({ data: formData }, domain);

      if (res?.error) {
        console.error("Create error details:", res);
        toast({
          variant: "destructive",
          title: "Errore nella creazione",
          description: res.message || "Errore durante la creazione del progetto",
        });
        return;
      }

      toast({
        title: "Progetto creato",
        description: `Progetto ${formData.unique_code} creato correttamente!`,
      });
      form.reset();
      
      // Pass true to indicate successful creation - triggers refetch
      handleClose(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Errore nel creare il progetto: ${error.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="unique_code"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormLabel>Codice Identificativo</FormLabel>
                {isOfferKanban && (
                  <Badge variant="secondary" className="text-xs">
                    {taskType}
                  </Badge>
                )}
              </div>
              <FormControl>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      {...field}
                      className={isLoadingCode ? "pr-10" : ""}
                      disabled={isSubmitting || isLoadingCode}
                    />
                    {isLoadingCode && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => generateCode()}
                    disabled={isSubmitting || isLoadingCode}
                    title="Rigenera codice"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        isLoadingCode ? "animate-spin" : ""
                      }`}
                    />
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        /> */}

        {/* Show kanban selector only if kanbans are provided and kanbanId is not already set */}
        {data.kanbans && data.kanbans.length > 0 && !kanbanId && (
          <FormField
            name="kanbanId"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kanban</FormLabel>
                <FormControl>
                  <SearchSelect
                    value={field.value}
                    onValueChange={(value) => field.onChange(Number(value))}
                    placeholder="Cerca kanban..."
                    disabled={isSubmitting}
                    options={
                      data.kanbans?.map((kanban: Kanban) => ({
                        value: kanban.id,
                        label: kanban.title || "Senza titolo",
                      })) || []
                    }
                    emptyMessage="Nessun kanban trovato."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Column selector - show when kanban is selected and columns are available */}
        {kanbanColumns.length > 0 && (
          <FormField
            name="kanbanColumnId"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormLabel>Colonna</FormLabel>
                  <Badge variant="outline" className="text-xs">
                    <Columns className="h-3 w-3 mr-1" />
                    Opzionale
                  </Badge>
                </div>
                <FormControl>
                  <SearchSelect
                    value={field.value}
                    onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                    placeholder="Seleziona colonna (default: prima colonna)..."
                    disabled={isSubmitting || isLoadingColumns}
                    options={kanbanColumns
                      .sort((a, b) => (a.position || 0) - (b.position || 0))
                      .map((column: KanbanColumn) => ({
                        value: column.id,
                        label: column.title || column.identifier || "Senza nome",
                      }))}
                    emptyMessage="Nessuna colonna trovata."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Offer selector - only show when NOT in an offer kanban */}
        {!isOfferKanban && (
          <FormField
            name="parentTaskId"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormLabel>Collega Offerta</FormLabel>
                  <Badge variant="outline" className="text-xs">
                    <Link className="h-3 w-3 mr-1" />
                    Opzionale
                  </Badge>
                </div>
                <FormControl>
                  <OfferSelect
                    value={field.value}
                    onValueChange={(value) => field.onChange(value)}
                    placeholder="Cerca offerta da collegare..."
                    disabled={isSubmitting}
                    emptyMessage="Nessuna offerta disponibile."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {data.clients && data.clients.length > 0 && (
          <FormField
            name="clientId"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <FormControl>
                  <SearchSelect
                    value={field.value}
                    onValueChange={(value) => field.onChange(Number(value))}
                    placeholder="Cerca cliente..."
                    disabled={isSubmitting}
                    options={
                      data.clients?.map((client: Client) => ({
                        value: client.id,
                        label:
                          client.businessName ||
                          `${client.individualFirstName || "N/A"} ${
                            client.individualLastName || "N/A"
                          }`,
                      })) || []
                    }
                    emptyMessage="Nessun cliente trovato."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Use activeProducts if available, otherwise fall back to products */}
        {((data.activeProducts && data.activeProducts.length > 0) ||
          (data.products && data.products.length > 0)) && (
          <FormField
            name="productId"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prodotto</FormLabel>
                <FormControl>
                  <SearchSelect
                    value={field.value}
                    onValueChange={(value) => field.onChange(Number(value))}
                    placeholder="Cerca prodotto..."
                    disabled={isSubmitting}
                    options={(data.activeProducts || data.products || []).map(
                      (p: SellProduct) => ({
                        value: p.id,
                        label: `${p.name} - ${p.type}`,
                      })
                    )}
                    emptyMessage="Nessun prodotto trovato."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={isSubmitting}
                      >
                        {field.value
                          ? field.value.toLocaleDateString("it-IT")
                          : "Seleziona una data"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[20rem] overflow-hidden p-0"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      captionLayout="dropdown"
                      onSelect={field.onChange}
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
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={isSubmitting}
                      >
                        {field.value
                          ? field.value.toLocaleDateString("it-IT")
                          : "Seleziona una data"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[20rem] overflow-hidden p-0"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      captionLayout="dropdown"
                      onSelect={field.onChange}
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

        <div className="flex">
          <div className="w-1/2 pr-4">
            <div className="grid grid-rows-2 grid-cols-4 gap-2">
              {Array.from({ length: 8 }, (_, i) => (
                <FormField
                  key={i}
                  name={`position${i + 1}` as keyof z.infer<typeof validation>}
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{`Pos. ${i + 1}`}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={String(field.value || "")}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>

          <div className="border-l border-border" />

          <div className="w-1/2 pl-4 flex items-center justify-center">
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
                <Textarea {...field} disabled={isSubmitting} />
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
              <FormLabel>Valore totale</FormLabel>
              <FormControl>
                <Input {...field} type="number" disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && (
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          Salva
        </Button>
      </form>
    </Form>
  );
};

export default CreateProductForm;
