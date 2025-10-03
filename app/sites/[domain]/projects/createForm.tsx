"use client";
import React, { useState, useTransition } from "react";
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
import { Data } from "./page";
import { Client, SellProduct, Task, Kanban } from "@/types/supabase";
import { useParams } from "next/navigation";

type Props = {
  handleClose: any;
  data: Data & { kanbans: Kanban[] };
};

const CreateProductForm = ({ handleClose, data }: Props) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const params = useParams();
  const domain = params?.domain as string;

  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      clientId: null,
      deliveryDate: undefined,
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
      unique_code: "",
      kanbanId: undefined,
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

        <FormField
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
        />

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
                  {data.activeProducts.map((p: SellProduct) => (
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

        <FormField
          name="deliveryDate"
          control={form.control}
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data di carico in sede</FormLabel>
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
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Seleziona una data</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value || undefined}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-rows-2 grid-cols-4 gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <FormField
              key={i}
              name={`position${i + 1}` as keyof z.infer<typeof validation>}
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{`Posizione ${i + 1}`}</FormLabel>
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
              <FormLabel>Valore di produzione</FormLabel>
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
