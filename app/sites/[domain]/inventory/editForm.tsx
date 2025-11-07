"use client";
import React, { useEffect, useOptimistic, useState } from "react";
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
import { validation } from "@/validation/products/create";
import { useToast } from "@/components/ui/use-toast";
import { useFormState, useFormStatus } from "react-dom";
import { Product_category, Supplier } from "@/types/supabase";
import { editItem } from "./actions/edit-item.action";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  handleClose: any;
  data: any;
};

const EditProductForm = ({ handleClose, data }: Props) => {
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
  const { setValue } = form;
  const { isSubmitting, errors } = form.formState;
  const { pending } = useFormStatus();

  const [categories, setCategories] = useState<Product_category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    const getSuppliers = async () => {
      const d = await fetch(`../api/inventory/suppliers/`);
      if (!d.ok) {
        throw new Error("Failed to fetch suppliers");
      }
      const suppliers = await d.json();
      setSuppliers(suppliers);
    };

    const getCategories = async () => {
      try {
        const response = await fetch(`../api/inventory/categories/`);
        if (!response.ok) {
          throw new Error("Failed to fetch categories");
        }
        const categories = await response.json();
        setCategories(categories);
      } catch (error) {
        console.error(error);
        // Handle the error state appropriately
      }
    };

    setValue("name", data.name);
    setValue("type", data.type!);
    setValue("description", data.description!);
    setValue("width", data.width!);
    setValue("height", data.height!);
    setValue("length", data.length!);
    setValue("quantity", data.quantity);
    setValue("unit_price", data.unit_price);
    setValue("unit", data.unit!);
    setValue("supplierId", data.supplierId!);
    setValue("productCategoryId", data.categoryId!);

    getSuppliers();
    getCategories();
  }, [data, setValue]);

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    const response = await editItem(d, data?.id);
    if (response?.error) {
      toast({
        description: `Errore! ${response.error}`,
      });
    } else {
      handleClose(false);
      toast({
        description: `Elemento ${d.name} aggiornato correttamente!`,
      });
      form.reset();
    }
  };
  // if (suppliers.length === 0 && categories.length === 0) {
  //   return;
  // } else
  return (
    <Form {...form}>
      <form className="space-y-4 " onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          // control={form.control}
          name="productCategoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat: Product_category) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              {/* <FormDescription>Categoria del prodotto</FormDescription> */}
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
                  value={field.value}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona fornitore" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((sup: Supplier) => (
                      <SelectItem key={sup.id} value={sup.id.toString()}>
                        {sup.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* <Input  {...field} /> */}
              </FormControl>
              {/* <FormDescription>Fornitore del prodotto</FormDescription> */}
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
                  <Input {...field} />
                </FormControl>
                {/* <FormDescription>Numero articolo</FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />
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
  );
};

export default EditProductForm;
