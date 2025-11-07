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
      unique_code: data.unique_code ?? "",
      other: data.other ?? "",
      kanbanId: data.kanbanId ?? undefined,
    },
  });
  const { isSubmitting } = form.formState;

  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [kanbans, setKanbans] = useState<Kanban[]>([]);

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
                onValueChange={(value) => field.onChange(Number(value))}
                defaultValue={field.value?.toString()}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
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

        <FormField
          name="deliveryDate"
          control={form.control}
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Termine</FormLabel>
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
                    selected={field.value}
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
              //@ts-ignore
              name={`position${i + 1}`}
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{`Posizione ${i + 1}`}</FormLabel>
                  <FormControl>
                    {/* @ts-ignore */}
                    <Input {...field} />
                  </FormControl>
                  {/* <FormDescription>Categoria del prodotto</FormDescription> */}
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
                <Textarea {...field} />
              </FormControl>
              {/* <FormDescription>Categoria del prodotto</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="sellPrice"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Costo di produzione</FormLabel>
              <FormControl>
                <Input {...field} type="number" />
              </FormControl>
              {/* <FormDescription>Categoria del prodotto</FormDescription> */}
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
