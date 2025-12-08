"use client";
import React, { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SubmitHandler, useForm } from "react-hook-form";

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
import { SearchSelect } from "@/components/ui/search-select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { createItem } from "./actions/create-item.action";
import { validation } from "@/validation/task/create";
import { useToast } from "@/components/ui/use-toast";

type Props = {
  handleClose: any;
  data: any;
  kanbanId?: number;
  domain?: string;
};

const CreateProductForm = ({ handleClose, data, kanbanId, domain }: Props) => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      clientId: undefined,
      deliveryDate: new Date(),
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
      unique_code: "",
      kanbanId: kanbanId,
    },
  });

  const { errors, isSubmitting } = form.formState;

  console.log(errors);
  console.log("deliveryDate", form.getValues("deliveryDate"));
  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    try {
      console.log("d", d);

      // Ensure deliveryDate is set before submission
      if (!d.deliveryDate) {
        const formDeliveryDate = form.getValues("deliveryDate");
        if (formDeliveryDate) {
          d.deliveryDate = formDeliveryDate;
          console.log("Set d.deliveryDate from form:", d.deliveryDate);
        } else {
          d.deliveryDate = new Date();
          console.log("Set d.deliveryDate to new Date():", d.deliveryDate);
        }
      }

      console.log("Final d.deliveryDate:", d.deliveryDate);

      const dataObject = { data: d };
      const res = await createItem(dataObject, domain);
      handleClose(false);
      toast({
        description: `Elemento ${d.unique_code} creato correttamente!`,
      });
      form.reset();
    } catch (e) {
      toast({
        description: `Errore nel creare l'elemento! ${e}`,
      });
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
                    (data.clients as any[])?.map((client) => ({
                      value: client.id,
                      label:
                        client.businessName ||
                        `${client.individualFirstName || "N/A"} ${client.individualLastName || "N/A"}`,
                    })) || []
                  }
                  emptyMessage="Nessun cliente trovato."
                />
              </FormControl>
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
              <FormControl>
                <SearchSelect
                  value={field.value}
                  onValueChange={(value) => field.onChange(Number(value))}
                  placeholder="Cerca prodotto..."
                  disabled={isSubmitting}
                  options={
                    (data.products as any[])?.map((product) => ({
                      value: product.id,
                      label: product.name,
                    })) || []
                  }
                  emptyMessage="Nessun prodotto trovato."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="deliveryDate"
          disabled={isSubmitting}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data di carico in sede</FormLabel>
              <FormControl>
                <DatePicker
                  date={field.value ?? undefined}
                  onValueChange={(date) => {
                    console.log("DatePicker onValueChange called with:", date);
                    field.onChange(date);
                    console.log(
                      "After field.onChange, form value:",
                      form.getValues("deliveryDate")
                    );
                  }}
                  disabled={isSubmitting}
                />
              </FormControl>
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

        <Button type="submit" disabled={isSubmitting}>
          {" "}
          {isSubmitting && (
            <span className="spinner-border spinner-border-sm mr-1"></span>
          )}{" "}
          Salva
        </Button>
      </form>
    </Form>
  );
};

export default CreateProductForm;
