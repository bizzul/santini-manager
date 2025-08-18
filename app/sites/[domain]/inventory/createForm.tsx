"use client";
import React, { useTransition } from "react";
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
import { createItem } from "./actions/create-item.action";
import { validation } from "@/validation/products/create";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Product_category, Supplier } from "@prisma/client";

const CreateProductForm = ({
  handleClose,
  data,
}: {
  handleClose: any;
  data: any;
}) => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      name: "",
      supplierId: undefined,
      productCategoryId: undefined,
      type: "",
      description: "",
      width: 0,
      height: 0,
      length: 0,
      quantity: 0,
      unit_price: 0,
      unit: "",
    },
  });

  const { isSubmitting, errors } = form.formState;

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    try {
      //@ts-ignore
      await createItem(d);
      handleClose(false);
      toast({
        description: `Elemento ${d.name} creato correttamente!`,
      });
      // form.reset();
    } catch (e) {
      toast({
        description: `Errore nel creare l'elemento! ${e}`,
      });
    }
  };

  console.log(errors);

  return (
    <Form {...form}>
      <form className="space-y-4 " onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          name="productCategoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {data.category.map((cat: Product_category) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="supplierId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fornitore</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {data.supplier.map((sup: Supplier) => (
                      <SelectItem key={sup.id} value={sup.id.toString()}>
                        {sup.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          disabled={isSubmitting}
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              {/* <FormDescription>Il nome del prodotto</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          disabled={isSubmitting}
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              {/* <FormDescription>Tipologia</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          disabled={isSubmitting}
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Num. Articolo</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              {/* <FormDescription>Numero articolo</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-row gap-2">
          <FormField
            disabled={isSubmitting}
            control={form.control}
            name="width"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Larghezza</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                {/* <FormDescription>Numero articolo</FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            disabled={isSubmitting}
            control={form.control}
            name="height"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Altezza</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                {/* <FormDescription>Numero articolo</FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            disabled={isSubmitting}
            control={form.control}
            name="length"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lunghezza</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                {/* <FormDescription>Numero articolo</FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex flex-row gap-2">
          <FormField
            disabled={isSubmitting}
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Qta.</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                {/* <FormDescription>Numero articolo</FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            disabled={isSubmitting}
            control={form.control}
            name="unit_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valore</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                {/* <FormDescription>Numero articolo</FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            disabled={isSubmitting}
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unità</FormLabel>
                <FormControl>
                  <Input {...form.register("unit")} {...field} />
                </FormControl>
                {/* <FormDescription>Numero articolo</FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting && (
            <span className="spinner-border spinner-border-sm mr-1"></span>
          )}
          Salva
        </Button>
      </form>
    </Form>
  );
};

export default CreateProductForm;
