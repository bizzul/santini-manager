"use client";
import React, { useEffect, useOptimistic, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SubmitHandler, useForm } from "react-hook-form";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { validation } from "@/validation/task/create";
import { useToast } from "@/components/ui/use-toast";
import { Client, SellProduct, Task, Kanban } from "@/types/supabase";
import { editItem } from "./actions/edit-item.action";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

type Props = {
  handleClose: any;
  data: Task;
};

const EditForm = ({ handleClose, data }: Props) => {
  const { toast } = useToast();
  const params = useParams();
  const domain = params?.domain as string;
  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      clientId: data.clientId ?? undefined,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
      termine_produzione: (data as any).termine_produzione ? new Date((data as any).termine_produzione) : undefined,
      name: data.name ?? "",
      position1: data.positions?.[0] ?? "",
      position2: data.positions?.[1] ?? "",
      position3: data.positions?.[2] ?? "",
      position4: data.positions?.[3] ?? "",
      position5: data.positions?.[4] ?? "",
      position6: data.positions?.[5] ?? "",
      position7: data.positions?.[6] ?? "",
      position8: data.positions?.[7] ?? "",
      productId: data.sellProductId ?? undefined,
      sellPrice: data.sellPrice ?? 0,
      numero_pezzi: (data as any).numero_pezzi ?? null,
      unique_code: data.unique_code ?? "",
      other: data.other ?? "",
      kanbanId: data.kanbanId ?? undefined,
      kanbanColumnId: data.kanbanColumnId ?? undefined,
    },
  });
  const { isSubmitting } = form.formState;

  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [kanbans, setKanbans] = useState<Kanban[]>([]);
  const [kanbanColumns, setKanbanColumns] = useState<any[]>([]);
  const [selectedKanbanId, setSelectedKanbanId] = useState<number | null>(data.kanbanId || null);

  useEffect(() => {
    const getClients = async () => {
      const d = await fetch(`/api/clients/`);
      if (!d.ok) {
        throw new Error("Failed to fetch products");
      }
      const data = await d.json();
      setClients(data);
    };

    const getProducts = async () => {
      const d = await fetch(`/api/sell-products/`);
      if (!d.ok) {
        throw new Error("Failed to fetch products");
      }
      const data = await d.json();
      setProducts(data);
    };

    const getKanbans = async () => {
      const d = await fetch(`/api/kanban/list`);
      if (!d.ok) {
        throw new Error("Failed to fetch kanbans");
      }
      const data = await d.json();
      setKanbans(data);
    };

    getClients();
    getProducts();
    getKanbans();
  }, []);

  // Load columns when kanban changes
  useEffect(() => {
    const loadColumns = async () => {
      if (selectedKanbanId) {
        try {
          console.log("🔍 Fetching columns for kanban:", selectedKanbanId);
          const response = await fetch(`/api/kanban-columns/${selectedKanbanId}`);
          console.log("📡 Response status:", response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Response error:", errorText);
            throw new Error(`Failed to fetch columns: ${response.status}`);
          }
          
          const columnsData = await response.json();
          console.log("✅ Columns loaded:", columnsData);
          setKanbanColumns(Array.isArray(columnsData) ? columnsData : []);
        } catch (error) {
          console.error("Error fetching columns:", error);
          setKanbanColumns([]);
        }
      } else {
        setKanbanColumns([]);
      }
    };

    loadColumns();
  }, [selectedKanbanId]);

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    const response = await editItem(d, data?.id, domain);
    if (response?.error) {
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

  return (
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
              {/* <FormDescription>Il nome del prodotto</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        {/* 
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        /> */}

        <FormField
          name="clientId"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value?.toString()}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clients.map((client: Client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.businessName ||
                        `${client.individualFirstName || ""} ${
                          client.individualLastName || ""
                        }`.trim() ||
                        "N/A"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* <FormDescription>Categoria del prodotto</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="kanbanId"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kanban</FormLabel>
              <Select
                onValueChange={(value) => {
                  const kanbanId = value ? Number(value) : null;
                  field.onChange(kanbanId);
                  setSelectedKanbanId(kanbanId);
                  // Reset column when kanban changes
                  form.setValue("kanbanColumnId", undefined);
                }}
                defaultValue={field.value?.toString()}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona una kanban" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {kanbans.map((kanban) => (
                    <SelectItem key={kanban.id} value={kanban.id.toString()}>
                      {kanban.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Column Selection - only shown if kanban is selected */}
        {selectedKanbanId && (
          <FormField
            name="kanbanColumnId"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Colonna</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                  defaultValue={field.value?.toString()}
                  disabled={isSubmitting || kanbanColumns.length === 0}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona una colonna" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {kanbanColumns.map((column) => (
                      <SelectItem key={column.id} value={column.id.toString()}>
                        {column.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {kanbanColumns.length === 0 && (
                  <FormDescription className="text-yellow-600">
                    Nessuna colonna disponibile. La task sarà assegnata alla prima colonna.
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          name="productId"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prodotto</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value?.toString()}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {products.map((p: SellProduct) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name} - {p.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* <FormDescription>Categoria del prodotto</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />

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
                        variant="outline"
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
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
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

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full"
          variant="default"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <span>Salvataggio in corso...</span>
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            </div>
          ) : (
            "Salva"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default EditForm;
