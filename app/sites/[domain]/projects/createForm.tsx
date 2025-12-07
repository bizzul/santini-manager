"use client";
import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SubmitHandler, useForm } from "react-hook-form";
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
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { createItem } from "./actions/create-item.action";
import { validation } from "@/validation/task/create";
import { useToast } from "@/components/ui/use-toast";
import { Client, SellProduct, Task, Kanban } from "@/types/supabase";
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
    },
  });

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (
    formData
  ) => {
    try {
      setIsSubmitting(true);
      const res = await createItem({ data: formData }, domain);

      if (res?.error) {
        toast({
          variant: "destructive",
          description:
            res.message || "Errore durante la creazione del progetto",
        });
        return;
      }

      toast({
        description: `Progetto ${formData.unique_code} creato correttamente!`,
      });
      form.reset();
      handleClose(false);

      // Refresh the page to show the new card
      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
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
              <FormLabel>Codice Identificativo</FormLabel>
              <FormControl>
                <Input {...field} disabled={isSubmitting} />
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
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={field.value?.toString() || ""}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {data.kanbans.map((kanban: Kanban) => (
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
        )}

        {data.clients && data.clients.length > 0 && (
          <FormField
            name="clientId"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <Select
                  onValueChange={(value) =>
                    field.onChange(value ? Number(value) : "")
                  }
                  value={field.value?.toString() || ""}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {data.clients.map((client: Client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.businessName ||
                          `${client.individualFirstName || "N/A"} ${
                            client.individualLastName || "N/A"
                          }`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Select
                  onValueChange={(value) =>
                    field.onChange(value ? Number(value) : "")
                  }
                  value={field.value?.toString() || ""}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(data.activeProducts || data.products || []).map((p: SellProduct) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name} - {p.type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
